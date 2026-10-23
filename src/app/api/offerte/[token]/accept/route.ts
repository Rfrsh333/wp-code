import { after, NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { captureRouteError } from "@/lib/sentry-utils";
import { checkRedisRateLimit, contractSignRateLimit, getClientIP } from "@/lib/rate-limit-redis";
import { sendEmail } from "@/lib/email-service";
import { sendTelegramAlert } from "@/lib/telegram";
import { offerteGeaccepteerdMelding, type GeaccepteerdeOfferte } from "@/lib/offerte-mail";

/**
 * Melding aan TopTalent: dezelfde route als een nieuwe personeelsaanvraag
 * (api/personeel-aanvragen): Telegram zonder persoonsgegevens + mail naar info@ met de details.
 * Draait na de response; een mislukte melding maakt de acceptatie niet ongedaan.
 */
async function meldAcceptatie(offerte: GeaccepteerdeOfferte, ondertekendDoor: string) {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://www.toptalentjobs.nl";
  const melding = offerteGeaccepteerdMelding(offerte, { ondertekendDoor, adminUrl: `${baseUrl}/admin` });

  await sendTelegramAlert(melding.telegram).catch((e) =>
    captureRouteError(e, { route: "/api/offerte/[token]/accept", action: "TELEGRAM" }),
  );

  try {
    const { error } = await sendEmail({
      from: "TopTalent Jobs <info@toptalentjobs.nl>",
      to: ["info@toptalentjobs.nl"],
      ...(offerte.email ? { replyTo: offerte.email } : {}),
      subject: melding.onderwerp,
      html: melding.html,
      emailType: "offerte_geaccepteerd_admin",
    });
    if (error) captureRouteError(error, { route: "/api/offerte/[token]/accept", action: "MAIL" });
  } catch (e) {
    captureRouteError(e, { route: "/api/offerte/[token]/accept", action: "MAIL" });
  }
}

// POST /api/offerte/[token]/accept - Klant accepteert offerte (digitale ondertekening)
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    // Publiek endpoint met een token in de URL: beperk het aantal pogingen per IP
    // (zelfde limiet als het ondertekenen van contracten).
    const ip = getClientIP(request);
    const rateLimit = await checkRedisRateLimit(`offerte-accept:${ip}`, contractSignRateLimit);
    if (!rateLimit.success) {
      return NextResponse.json(
        { error: "Te veel verzoeken. Probeer het later opnieuw." },
        {
          status: 429,
          headers: {
            "Retry-After": String(Math.max(1, Math.ceil((rateLimit.reset - Date.now()) / 1000))),
          },
        }
      );
    }

    const { token } = await params;
    let naam: unknown;
    try {
      ({ naam } = await request.json());
    } catch {
      return NextResponse.json({ error: "Ongeldig verzoek" }, { status: 400 });
    }

    if (!token || token.length < 32) {
      return NextResponse.json({ error: "Ongeldige link" }, { status: 400 });
    }

    if (typeof naam !== "string" || naam.trim().length < 2) {
      return NextResponse.json({ error: "Naam is verplicht voor ondertekening" }, { status: 400 });
    }

    // Fetch offerte
    const { data: offerte, error } = await supabaseAdmin
      .from("offertes")
      .select("id, status, geldig_tot, accepted_at, offerte_nummer, bedrijfsnaam, contactpersoon, email, telefoon, locatie, totaal_bedrag")
      .eq("token", token)
      .single();

    if (error || !offerte) {
      return NextResponse.json({ error: "Offerte niet gevonden" }, { status: 404 });
    }

    if (offerte.accepted_at) {
      return NextResponse.json({ error: "Deze offerte is al geaccepteerd" }, { status: 400 });
    }

    // Door TopTalent afgewezen/ingetrokken (admin > Offertes): niet meer te accepteren.
    if (offerte.status === "afgewezen") {
      return NextResponse.json(
        { error: "Deze offerte is niet meer geldig. Neem contact met ons op voor een nieuwe offerte." },
        { status: 400 },
      );
    }

    // Check geldigheid
    if (offerte.geldig_tot && new Date(offerte.geldig_tot) < new Date()) {
      return NextResponse.json({ error: "Deze offerte is verlopen" }, { status: 400 });
    }

    // Update offerte. Alleen als hij nog niet geaccepteerd is: twee gelijktijdige klikken geven
    // zo één acceptatie en één melding.
    const { data: bijgewerkt, error: updateError } = await supabaseAdmin
      .from("offertes")
      .update({
        status: "geaccepteerd",
        accepted_at: new Date().toISOString(),
        accepted_naam: naam.trim(),
        accepted_ip: ip,
      })
      .eq("id", offerte.id)
      .is("accepted_at", null)
      .select("id");

    if (updateError) {
      captureRouteError(updateError, { route: "/api/offerte/[token]/accept", action: "POST" });
      return NextResponse.json({ error: "Fout bij accepteren" }, { status: 500 });
    }
    if (!bijgewerkt || bijgewerkt.length === 0) {
      return NextResponse.json({ error: "Deze offerte is al geaccepteerd" }, { status: 400 });
    }

    const ondertekendDoor = naam.trim();
    after(() => meldAcceptatie(offerte as GeaccepteerdeOfferte, ondertekendDoor));

    return NextResponse.json({ success: true, message: "Offerte succesvol geaccepteerd" });
  } catch (error) {
    captureRouteError(error, { route: "/api/offerte/[token]/accept", action: "POST" });
    // console.error("Offerte accept error:", error);
    return NextResponse.json({ error: "Fout bij accepteren offerte" }, { status: 500 });
  }
}
