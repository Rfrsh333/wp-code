import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin as supabase } from "@/lib/supabase";
import { cookies } from "next/headers";
import { checkRedisRateLimit, getClientIP, loginRateLimit, medewerkerLoginPerAccountRateLimit } from "@/lib/rate-limit-redis";
import bcrypt from "bcryptjs";
import { loginSchema, formatZodErrors } from "@/lib/validations";
import { captureRouteError } from "@/lib/sentry-utils";

// Constant-time dummy hash so timing is identical whether or not the account exists.
const DUMMY_HASH = "$2b$10$abcdefghijklmnopqrstuuABCDEFGHIJKLMNOPQRSTUVWXYZ012345";

export async function POST(request: NextRequest) {
  const clientIP = getClientIP(request);

  // Rate limiting: per-IP
  const rateLimitResult = await checkRedisRateLimit(`medewerker-login:${clientIP}`, loginRateLimit, { failClosed: true });
  if (!rateLimitResult.success) {
    const retryAfter = Math.max(1, Math.ceil((rateLimitResult.reset - Date.now()) / 1000));
    return NextResponse.json(
      { error: `Te veel loginpogingen. Probeer het over ${retryAfter} seconden opnieuw.` },
      { status: 429, headers: { "Retry-After": String(retryAfter) } }
    );
  }

  try {
    const body = await request.json();
    const { email, wachtwoord } = body;

    // Zod validatie
    const parsed = loginSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: formatZodErrors(parsed.error) }, { status: 400 });
    }

    // Rate limiting: per-account (prevents credential stuffing on known emails)
    const acctLimit = await checkRedisRateLimit(`medewerker-login-acct:${email.toLowerCase()}`, medewerkerLoginPerAccountRateLimit, { failClosed: true });
    if (!acctLimit.success) {
      const retryAfter = Math.max(1, Math.ceil((acctLimit.reset - Date.now()) / 1000));
      return NextResponse.json(
        { error: `Te veel loginpogingen. Probeer het over ${retryAfter} seconden opnieuw.` },
        { status: 429, headers: { "Retry-After": String(retryAfter) } }
      );
    }

    const { data: medewerker } = await supabase
      .from("medewerkers")
      .select("id, naam, email, functie, wachtwoord, status")
      .eq("email", email.toLowerCase())
      .single();

    // Always run bcrypt to prevent timing-based user enumeration.
    const hashToCompare = medewerker?.wachtwoord || DUMMY_HASH;
    const valid = await bcrypt.compare(wachtwoord, hashToCompare);

    if (!medewerker || !valid) {
      return NextResponse.json({ error: "Ongeldige inloggegevens" }, { status: 401 });
    }

    if (medewerker.status !== "actief") {
      return NextResponse.json({ error: "Ongeldige inloggegevens" }, { status: 401 });
    }

    await supabase.from("medewerkers").update({ laatste_login: new Date().toISOString() }).eq("id", medewerker.id);

    // KRITIEK: Gebruik signed JWT in plaats van plain JSON
    const { signMedewerkerSession } = await import("@/lib/session");
    const token = await signMedewerkerSession({
      id: medewerker.id,
      naam: medewerker.naam,
      email: medewerker.email,
      functie: medewerker.functie,
    });

    const cookieStore = await cookies();
    cookieStore.set("medewerker_session", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      expires: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      path: "/",
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    captureRouteError(error, { route: "/api/medewerker/login", action: "POST" });
    // console.error("Login error:", error);
    return NextResponse.json({ error: "Fout bij inloggen" }, { status: 500 });
  }
}
