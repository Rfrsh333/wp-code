import { NextRequest, NextResponse, after } from "next/server";
import { checkRedisRateLimit, getClientIP, loginRateLimit, klantLoginPerAccountRateLimit } from "@/lib/rate-limit-redis";
import { supabaseAdmin } from "@/lib/supabase";
import {
  klantResetBeschikbaar,
  RESET_NIET_BESCHIKBAAR_MELDING,
  sendKlantPasswordResetEmail,
} from "@/lib/klant-password-reset";
import { captureRouteError } from "@/lib/sentry-utils";

const ANTWOORD = "Als dit e-mailadres bij een actief account hoort, ontvangt u binnen enkele minuten een e-mail met een resetlink.";

export async function POST(request: NextRequest) {
  const clientIP = getClientIP(request);
  const rateLimit = await checkRedisRateLimit(`klant-password-reset:${clientIP}`, loginRateLimit, { failClosed: true });

  if (!rateLimit.success) {
    return NextResponse.json(
      { error: "Te veel verzoeken. Probeer het later opnieuw." },
      { status: 429, headers: { "Retry-After": String(Math.max(1, Math.ceil((rateLimit.reset - Date.now()) / 1000))) } }
    );
  }

  try {
    const { email } = await request.json().catch(() => ({}));
    const emailLower = typeof email === "string" ? email.trim().toLowerCase() : "";

    if (!emailLower || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailLower)) {
      return NextResponse.json({ error: "Vul een geldig e-mailadres in" }, { status: 400 });
    }

    // Zonder resetkolommen (migratie 20261001_klant_portaal.sql) kan er geen mail uit: eerlijk
    // melden. Dit hangt niet van het adres af, dus verraadt niet of het account bestaat.
    if (!(await klantResetBeschikbaar())) {
      return NextResponse.json(
        { success: false, beschikbaar: false, error: RESET_NIET_BESCHIKBAAR_MELDING },
        { status: 503 },
      );
    }

    // Per adres begrenzen (geen mailbombardement op één inbox). Zelfde antwoord als bij succes,
    // zodat de limiet niet verraadt of het account bestaat.
    const acct = await checkRedisRateLimit(`klant-reset-acct:${emailLower}`, klantLoginPerAccountRateLimit, { failClosed: true });
    if (!acct.success) {
      return NextResponse.json({ success: true, message: ANTWOORD });
    }

    const { data: klant } = await supabaseAdmin
      .from("klanten")
      .select("id, contactpersoon, email, status")
      .eq("email", emailLower)
      .maybeSingle();

    if (klant && klant.status === "actief" && klant.email) {
      // Versturen ná het antwoord: de responstijd verraadt dan niet of het account bestaat.
      after(async () => {
        try {
          await sendKlantPasswordResetEmail({ id: klant.id, contactpersoon: klant.contactpersoon, email: klant.email });
        } catch (error) {
          captureRouteError(error, { route: "/api/klant/wachtwoord-reset/request", action: "SEND" });
        }
      });
    }

    // Altijd hetzelfde antwoord: geen user-enumeration.
    return NextResponse.json({ success: true, message: ANTWOORD });
  } catch (error) {
    captureRouteError(error, { route: "/api/klant/wachtwoord-reset/request", action: "POST" });
    return NextResponse.json({ error: "Er ging iets mis. Probeer het later opnieuw." }, { status: 500 });
  }
}
