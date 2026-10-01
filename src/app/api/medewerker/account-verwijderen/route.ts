import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { getMedewerkerSession } from "@/lib/portal-auth";
import { checkRedisRateLimit, loginRateLimit } from "@/lib/rate-limit-redis";
import { captureRouteError } from "@/lib/sentry-utils";
import { logAuditEvent } from "@/lib/audit-log";
import { controleerWachtwoord } from "@/lib/medewerker/wachtwoord";

/**
 * POST { wachtwoord, reden? } — verzoek om het account te verwijderen (Apple 5.1.1(v)).
 *
 * Bewust een VERZOEK dat bij TopTalent binnenkomt en geen directe anonimisering: loon-, uren-,
 * factuur- en ID-gegevens vallen onder fiscale bewaarplichten (o.a. loonadministratie en het
 * ID-afschrift, zie de retentie-cron en datum_uit_dienst) en mogen dus niet allemaal weg.
 * Welke velden wanneer geanonimiseerd worden is een beleidskeuze; tot die vastligt registreert
 * deze route het verzoek (bericht aan admin + audit-log + verwijderverzoek_at) en handelt
 * TopTalent het af.
 */
export async function POST(request: NextRequest) {
  const medewerker = await getMedewerkerSession(request);
  if (!medewerker) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const limiet = await checkRedisRateLimit(`medewerker-account-verwijderen:${medewerker.id}`, loginRateLimit, {
    failClosed: true,
  });
  if (!limiet.success) {
    return NextResponse.json({ error: "Te veel pogingen. Probeer het later opnieuw." }, { status: 429 });
  }

  try {
    const body = await request.json().catch(() => ({}));
    const wachtwoord = typeof body.wachtwoord === "string" ? body.wachtwoord : "";
    const reden = typeof body.reden === "string" ? body.reden.trim().slice(0, 1000) : "";

    if (!(await controleerWachtwoord(medewerker.id, wachtwoord))) {
      return NextResponse.json({ error: "Je wachtwoord klopt niet" }, { status: 400 });
    }

    const nu = new Date().toISOString();

    // Kolom uit migratie 20261001_medewerker_portaal.sql; zonder die migratie loopt het verzoek
    // gewoon via het bericht + de audit-log.
    const { error: kolomFout } = await supabaseAdmin
      .from("medewerkers")
      .update({ verwijderverzoek_at: nu })
      .eq("id", medewerker.id);
    if (kolomFout && kolomFout.code !== "42703" && kolomFout.code !== "PGRST204") {
      captureRouteError(kolomFout, { route: "/api/medewerker/account-verwijderen", action: "UPDATE" });
    }

    const { error: berichtFout } = await supabaseAdmin.from("berichten").insert({
      van_type: "medewerker",
      van_id: medewerker.id,
      aan_type: "admin",
      aan_id: "admin",
      onderwerp: "Verzoek: account verwijderen",
      inhoud:
        `${medewerker.naam} (${medewerker.email}) vraagt om verwijdering van het account via het portaal.` +
        (reden ? `\n\nReden: ${reden}` : "") +
        "\n\nLet op de wettelijke bewaartermijnen voor loon-, uren- en ID-gegevens.",
    });
    if (berichtFout) {
      captureRouteError(berichtFout, { route: "/api/medewerker/account-verwijderen", action: "BERICHT" });
      return NextResponse.json({ error: "Verzoek versturen mislukt. Probeer het later opnieuw." }, { status: 500 });
    }

    await logAuditEvent({
      actorEmail: medewerker.email,
      action: "medewerker_verwijderverzoek",
      targetTable: "medewerkers",
      targetId: medewerker.id,
      summary: "Medewerker vroeg via het portaal om verwijdering van het account",
      metadata: { aangevraagd_op: nu, reden_opgegeven: !!reden },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    captureRouteError(error, { route: "/api/medewerker/account-verwijderen", action: "POST" });
    return NextResponse.json({ error: "Er ging iets mis" }, { status: 500 });
  }
}
