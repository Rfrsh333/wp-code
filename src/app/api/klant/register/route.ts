import { after, NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { cookies } from "next/headers";
import { checkRedisRateLimit, getClientIP, klantRegisterRateLimit } from "@/lib/rate-limit-redis";
import bcrypt from "bcryptjs";
import { signKlantSession } from "@/lib/session";
import { sendTelegramAlert } from "@/lib/telegram";
import { validatePasswordSecurity } from "@/lib/password-security";
import { captureRouteError } from "@/lib/sentry-utils";
import { schrijfMetKolomFallback } from "@/lib/db-kolom-fallback";
import { ALGEMENE_VOORWAARDEN_VERSIE, valideerRegistratie } from "@/lib/klant-registratie-regels";
import { nieuwVerificatieToken, stuurVerificatieMail } from "@/lib/klant-onboarding";

/**
 * POST /api/klant/register — zelf registreren als werkgever.
 *
 * Body: { bedrijfsnaam, contactpersoon, email, telefoon?, kvk_nummer, akkoord_voorwaarden: true, wachtwoord }
 * - KvK-nummer verplicht (8 cijfers, alleen formaat), akkoord op de algemene voorwaarden verplicht
 *   (tijdstip + versie opgeslagen).
 * - Het account is meteen bruikbaar om in te loggen, maar diensten plaatsen kan pas na het
 *   bevestigen van het e-mailadres (link 48 uur geldig). De eerste dienst gaat daarna eerst
 *   langs TopTalent (status in_controle), zie lib/klant-controle-regels.ts.
 * Zonder migratie 20261023_klant_onboarding.sql vallen de nieuwe kolommen weg en werkt het als
 * voorheen (geen bevestigingsmail; `email_bevestigen: false` in het antwoord).
 */

const OPTIONELE_KOLOMMEN = ["kvk_nummer", "av_akkoord_op", "av_versie", "email_verificatie_token", "email_verificatie_verloopt_op"] as const;

export async function POST(request: NextRequest) {
  const clientIP = getClientIP(request);
  const rateLimitResult = await checkRedisRateLimit(`klant-register:${clientIP}`, klantRegisterRateLimit);

  if (!rateLimitResult.success) {
    const retryAfter = Math.ceil((rateLimitResult.reset - Date.now()) / 1000);
    return NextResponse.json(
      { error: `Te veel pogingen. Probeer het later opnieuw.` },
      { status: 429, headers: { "Retry-After": Math.max(1, retryAfter).toString() } }
    );
  }

  try {
    const body = await request.json().catch(() => null);
    const invoer = valideerRegistratie(body);
    if (!invoer.ok) {
      return NextResponse.json({ error: invoer.error, veld: invoer.veld }, { status: 400 });
    }
    const { bedrijfsnaam, contactpersoon, email: emailLower, telefoon, kvkNummer, wachtwoord } = invoer.data;

    // Validate password security (length, weakness, leaked passwords)
    const passwordValidation = await validatePasswordSecurity(wachtwoord);
    if (!passwordValidation.valid) {
      return NextResponse.json({ error: passwordValidation.error, veld: "wachtwoord" }, { status: 400 });
    }

    // Check of email al bestaat
    const { data: existing } = await supabaseAdmin
      .from("klanten")
      .select("id")
      .eq("email", emailLower)
      .single();

    if (existing) {
      return NextResponse.json({ error: "Er bestaat al een account met dit emailadres", veld: "email" }, { status: 409 });
    }

    const hashedPassword = await bcrypt.hash(wachtwoord, 12);
    const verificatie = nieuwVerificatieToken();
    const nu = new Date().toISOString();

    const { data: klant, error, weggelaten } = await schrijfMetKolomFallback<{
      id: string;
      bedrijfsnaam: string;
      contactpersoon: string;
      email: string;
    }>(
      {
        bedrijfsnaam,
        contactpersoon,
        email: emailLower,
        wachtwoord: hashedPassword,
        telefoon,
        status: "actief",
        kvk_nummer: kvkNummer,
        av_akkoord_op: nu,
        av_versie: ALGEMENE_VOORWAARDEN_VERSIE,
        email_verificatie_token: verificatie.hash,
        email_verificatie_verloopt_op: verificatie.verlooptOp,
      },
      OPTIONELE_KOLOMMEN,
      (data) => supabaseAdmin.from("klanten").insert(data).select("id, bedrijfsnaam, contactpersoon, email").single(),
    );

    if (error || !klant) {
      captureRouteError(error, { route: "/api/klant/register", action: "POST" });
      return NextResponse.json({ error: "Registratie mislukt. Probeer het opnieuw." }, { status: 500 });
    }
    if (weggelaten.length > 0) {
      // Migratie nog niet (helemaal) gedraaid: registratie werkt, maar zonder deze velden.
      captureRouteError(new Error(`Registratie zonder kolommen: ${weggelaten.join(", ")}`), {
        route: "/api/klant/register",
        action: "MIGRATIE_ONTBREEKT",
      });
    }
    const emailBevestigen = !weggelaten.includes("email_verificatie_token");

    // Auto-login: set session cookie
    const token = await signKlantSession({
      id: klant.id,
      bedrijfsnaam: klant.bedrijfsnaam,
      contactpersoon: klant.contactpersoon,
      email: klant.email,
    });

    const cookieStore = await cookies();
    cookieStore.set("klant_session", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      expires: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      path: "/",
    });

    after(async () => {
      if (emailBevestigen) {
        const { error: mailFout } = await stuurVerificatieMail({ email: klant.email, contactpersoon: klant.contactpersoon }, verificatie.token);
        if (mailFout) captureRouteError(mailFout, { route: "/api/klant/register", action: "VERIFICATIE_MAIL" });
      }
      // Telegram notificatie (geen PII — AVG compliance)
      await sendTelegramAlert(
        `<b>Nieuwe klant geregistreerd</b>\n` +
        `Nieuwe klant geregistreerd — bekijk in dashboard. De eerste dienst komt eerst ter controle bij jullie.`
      ).catch((e) => captureRouteError(e, { route: "/api/klant/register", action: "TELEGRAM" }));
    });

    return NextResponse.json({ success: true, email_bevestigen: emailBevestigen });
  } catch (error) {
    captureRouteError(error, { route: "/api/klant/register", action: "POST" });
    // console.error("Register error:", error);
    return NextResponse.json({ error: "Fout bij registratie" }, { status: 500 });
  }
}
