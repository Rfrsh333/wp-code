import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { supabaseAdmin as supabase } from "@/lib/supabase";
import {
  checkRedisRateLimit,
  getClientIP,
  klantLoginPerAccountRateLimit,
  klantLoginRateLimit,
  loginRateLimit,
  medewerkerLoginPerAccountRateLimit,
} from "@/lib/rate-limit-redis";
import { signKlantSession, signMedewerkerSession } from "@/lib/session";
import { captureRouteError } from "@/lib/sentry-utils";
import { APP_TOKEN_GELDIGHEID } from "@/lib/klant-sessie-cookie";

// Login voor de native app (één app, rolkeuze bij inloggen).
// Zelfde controles als de web-logins, maar het token komt in de body: de app bewaart het in
// SecureStore en stuurt het mee als `Authorization: Bearer`. Geen cookie.
// App-tokens leven 30 dagen; intrekken kan via `sessie_geldig_vanaf` (src/lib/portal-auth.ts).

const DUMMY_HASH = "$2b$10$abcdefghijklmnopqrstuuABCDEFGHIJKLMNOPQRSTUVWXYZ012345";

const schema = z.object({
  rol: z.enum(["medewerker", "klant"]),
  email: z.string().trim().email().max(254),
  wachtwoord: z.string().min(1).max(200),
});

function teVeel(reset: number) {
  const retryAfter = Math.max(1, Math.ceil((reset - Date.now()) / 1000));
  return NextResponse.json(
    { error: `Te veel loginpogingen. Probeer het over ${retryAfter} seconden opnieuw.` },
    { status: 429, headers: { "Retry-After": String(retryAfter) } },
  );
}

export async function POST(request: NextRequest) {
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Vul je e-mailadres en wachtwoord in" }, { status: 400 });
  }
  const { rol, wachtwoord } = parsed.data;
  const email = parsed.data.email.toLowerCase();
  const clientIP = getClientIP(request);

  // Zelfde rate-limit-sleutels als de web-logins: de app is geen omweg om limieten te ontlopen.
  const ipLimit = await checkRedisRateLimit(
    rol === "medewerker" ? `medewerker-login:${clientIP}` : `klant-login:${clientIP}`,
    rol === "medewerker" ? loginRateLimit : klantLoginRateLimit,
    { failClosed: true },
  );
  if (!ipLimit.success) return teVeel(ipLimit.reset);

  const acctLimit = await checkRedisRateLimit(
    rol === "medewerker" ? `medewerker-login-acct:${email}` : `klant-login-acct:${email}`,
    rol === "medewerker" ? medewerkerLoginPerAccountRateLimit : klantLoginPerAccountRateLimit,
    { failClosed: true },
  );
  if (!acctLimit.success) return teVeel(acctLimit.reset);

  try {
    if (rol === "medewerker") {
      const { data: m } = await supabase
        .from("medewerkers")
        .select("id, naam, email, functie, wachtwoord, status")
        .eq("email", email)
        .maybeSingle();

      const valid = await bcrypt.compare(wachtwoord, m?.wachtwoord || DUMMY_HASH);
      if (!m || !valid || m.status !== "actief") {
        return NextResponse.json({ error: "Ongeldige inloggegevens" }, { status: 401 });
      }

      await supabase.from("medewerkers").update({ laatste_login: new Date().toISOString() }).eq("id", m.id);

      const token = await signMedewerkerSession(
        { id: m.id, naam: m.naam, email: m.email, functie: m.functie },
        APP_TOKEN_GELDIGHEID,
      );
      return NextResponse.json({
        token,
        rol,
        gebruiker: { id: m.id, naam: m.naam, email: m.email, functie: m.functie },
      });
    }

    const { data: k } = await supabase
      .from("klanten")
      .select("id, bedrijfsnaam, contactpersoon, email, wachtwoord, status")
      .eq("email", email)
      .maybeSingle();

    const valid = await bcrypt.compare(wachtwoord, k?.wachtwoord || DUMMY_HASH);
    if (!k || !valid || k.status !== "actief") {
      return NextResponse.json({ error: "Ongeldige inloggegevens" }, { status: 401 });
    }

    const token = await signKlantSession(
      { id: k.id, bedrijfsnaam: k.bedrijfsnaam, contactpersoon: k.contactpersoon, email: k.email },
      APP_TOKEN_GELDIGHEID,
    );
    return NextResponse.json({
      token,
      rol,
      gebruiker: { id: k.id, bedrijfsnaam: k.bedrijfsnaam, contactpersoon: k.contactpersoon, email: k.email },
    });
  } catch (error) {
    captureRouteError(error, { route: "/api/app/login", action: "POST" });
    return NextResponse.json({ error: "Fout bij inloggen" }, { status: 500 });
  }
}
