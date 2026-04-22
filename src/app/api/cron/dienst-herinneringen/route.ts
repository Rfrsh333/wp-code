import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { captureRouteError, withCronMonitor } from "@/lib/sentry-utils";

/**
 * Dienst Herinneringen Cron
 *
 * Stuurt herinneringen naar medewerkers voor diensten die morgen plaatsvinden.
 * Wordt dagelijks getriggerd via GitHub Actions of handmatig.
 *
 * POST /api/cron/dienst-herinneringen
 * Authorization: Bearer {CRON_SECRET}
 */

type ReminderResult = {
  medewerker_naam: string;
  dienst_datum: string;
  status: "verzonden" | "overgeslagen" | "error";
  reden?: string;
};

export async function POST(request: NextRequest) {
  // Verify cron secret
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return withCronMonitor("cron-dienst-herinneringen", async () => {

  const startTime = Date.now();
  const results: ReminderResult[] = [];
  let sent = 0;
  let skipped = 0;
  let failed = 0;

  try {
    // Bereken morgen (NL timezone = UTC+1/+2)
    const morgen = new Date();
    morgen.setDate(morgen.getDate() + 1);
    const morgenStr = morgen.toISOString().split("T")[0]; // YYYY-MM-DD

    // Stap 1: Haal alle diensten op voor morgen die niet geannuleerd zijn
    const { data: diensten, error: dienstenError } = await supabaseAdmin
      .from("diensten")
      .select("id, datum, start_tijd, eind_tijd, locatie, functie, klant_naam, klant_id")
      .eq("datum", morgenStr)
      .not("status", "in", '("geannuleerd","gesloten")');

    if (dienstenError) {
      captureRouteError(dienstenError, { route: "/api/cron/dienst-herinneringen", action: "POST" });
      // console.error("[CRON dienst-herinneringen] Diensten ophalen mislukt:", dienstenError);
      return NextResponse.json({ error: "Diensten ophalen mislukt" }, { status: 500 });
    }

    if (!diensten || diensten.length === 0) {
      return NextResponse.json({
        success: true,
        message: "Geen diensten voor morgen",
        metrics: { sent: 0, skipped: 0, failed: 0, duration_ms: Date.now() - startTime },
      });
    }

    const dienstIds = diensten.map((d) => d.id);

    // Stap 2: Haal alle bevestigde aanmeldingen op voor deze diensten
    const { data: aanmeldingen, error: aanmeldingenError } = await supabaseAdmin
      .from("dienst_aanmeldingen")
      .select("id, dienst_id, medewerker_id, status")
      .in("dienst_id", dienstIds)
      .in("status", ["bevestigd", "geaccepteerd"]);

    if (aanmeldingenError) {
      captureRouteError(aanmeldingenError, { route: "/api/cron/dienst-herinneringen", action: "POST" });
      // console.error("[CRON dienst-herinneringen] Aanmeldingen ophalen mislukt:", aanmeldingenError);
      return NextResponse.json({ error: "Aanmeldingen ophalen mislukt" }, { status: 500 });
    }

    if (!aanmeldingen || aanmeldingen.length === 0) {
      return NextResponse.json({
        success: true,
        message: "Geen bevestigde aanmeldingen voor morgen",
        metrics: { sent: 0, skipped: 0, failed: 0, duration_ms: Date.now() - startTime },
      });
    }

    // Stap 3: Haal medewerker info op
    const medewerkerIds = [...new Set(aanmeldingen.map((a) => a.medewerker_id))];
    const { data: medewerkers, error: medewerkersError } = await supabaseAdmin
      .from("medewerkers")
      .select("id, voornaam, achternaam, email, telefoon")
      .in("id", medewerkerIds);

    if (medewerkersError) {
      captureRouteError(medewerkersError, { route: "/api/cron/dienst-herinneringen", action: "POST" });
      // console.error("[CRON dienst-herinneringen] Medewerkers ophalen mislukt:", medewerkersError);
    }

    // Maak lookup maps
    const dienstMap = new Map(diensten.map((d) => [d.id, d]));
    const medewerkerMap = new Map((medewerkers || []).map((m) => [m.id, m]));

    // Stap 4: Stuur herinneringen per medewerker
    for (const aanmelding of aanmeldingen) {
      const medewerker = medewerkerMap.get(aanmelding.medewerker_id);
      const dienst = dienstMap.get(aanmelding.dienst_id);

      if (!medewerker || !dienst) {
        skipped++;
        results.push({
          medewerker_naam: medewerker?.voornaam || "Onbekend",
          dienst_datum: dienst?.datum || morgenStr,
          status: "overgeslagen",
          reden: "Medewerker of dienst niet gevonden",
        });
        continue;
      }

      if (!medewerker.email) {
        skipped++;
        results.push({
          medewerker_naam: `${medewerker.voornaam} ${medewerker.achternaam}`,
          dienst_datum: dienst.datum,
          status: "overgeslagen",
          reden: "Geen email adres",
        });
        continue;
      }

      try {
        // Dynamisch Resend importeren zodat het niet breekt bij build zonder API key
        const { Resend } = await import("resend");
        const resend = new Resend(process.env.RESEND_API_KEY);

        const startTijd = dienst.start_tijd?.slice(0, 5) || "";
        const eindTijd = dienst.eind_tijd?.slice(0, 5) || "";
        const datumFormatted = new Date(dienst.datum).toLocaleDateString("nl-NL", {
          weekday: "long",
          day: "numeric",
          month: "long",
        });

        await resend.emails.send({
          from: "TopTalent Jobs <diensten@toptalentjobs.nl>",
          to: medewerker.email,
          subject: `Herinnering: Je dienst morgen bij ${dienst.klant_naam || "klant"}`,
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <div style="background: #F27501; padding: 20px; border-radius: 12px 12px 0 0;">
                <h2 style="color: white; margin: 0;">Dienst Herinnering</h2>
              </div>
              <div style="padding: 24px; background: #f9f9f9; border-radius: 0 0 12px 12px;">
                <p>Hoi ${medewerker.voornaam},</p>
                <p>Even een herinnering dat je morgen een dienst hebt!</p>

                <div style="background: white; border-radius: 12px; padding: 16px; margin: 20px 0; border: 1px solid #eee;">
                  <table style="width: 100%; border-collapse: collapse;">
                    <tr>
                      <td style="padding: 8px 0; color: #666;">Bedrijf:</td>
                      <td style="padding: 8px 0; font-weight: bold;">${dienst.klant_naam || "—"}</td>
                    </tr>
                    <tr>
                      <td style="padding: 8px 0; color: #666;">Datum:</td>
                      <td style="padding: 8px 0; font-weight: bold;">${datumFormatted}</td>
                    </tr>
                    <tr>
                      <td style="padding: 8px 0; color: #666;">Tijd:</td>
                      <td style="padding: 8px 0; font-weight: bold;">${startTijd} - ${eindTijd}</td>
                    </tr>
                    ${dienst.locatie ? `
                    <tr>
                      <td style="padding: 8px 0; color: #666;">Locatie:</td>
                      <td style="padding: 8px 0; font-weight: bold;">${dienst.locatie}</td>
                    </tr>` : ""}
                    ${dienst.functie ? `
                    <tr>
                      <td style="padding: 8px 0; color: #666;">Functie:</td>
                      <td style="padding: 8px 0; font-weight: bold;">${dienst.functie}</td>
                    </tr>` : ""}
                  </table>
                </div>

                <p style="color: #666; font-size: 14px;">Zorg ervoor dat je op tijd aanwezig bent. Succes morgen!</p>

                <p style="margin-top: 30px;">Met vriendelijke groet,<br><strong style="color: #F27501;">TopTalent Jobs</strong></p>
              </div>
            </div>
          `,
        });

        sent++;
        results.push({
          medewerker_naam: `${medewerker.voornaam} ${medewerker.achternaam}`,
          dienst_datum: dienst.datum,
          status: "verzonden",
        });
      } catch (error) {
        failed++;
        results.push({
          medewerker_naam: `${medewerker.voornaam} ${medewerker.achternaam}`,
          dienst_datum: dienst.datum,
          status: "error",
          reden: String(error),
        });
      }
    }
  } catch (error) {
    captureRouteError(error, { route: "/api/cron/dienst-herinneringen", action: "POST" });
    // console.error("[CRON dienst-herinneringen] Onverwachte fout:", error);
    return NextResponse.json({ error: "Onverwachte fout" }, { status: 500 });
  }

  const duration = Date.now() - startTime;

  return NextResponse.json({
    success: true,
    results,
    metrics: { sent, skipped, failed, duration_ms: duration },
  });
  });
}
