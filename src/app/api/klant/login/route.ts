import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin as supabase } from "@/lib/supabase";
import { cookies } from "next/headers";
import { checkRedisRateLimit, getClientIP, klantLoginRateLimit, klantLoginPerAccountRateLimit } from "@/lib/rate-limit-redis";
import bcrypt from "bcryptjs";
import { loginSchema, formatZodErrors } from "@/lib/validations";
import { captureRouteError } from "@/lib/sentry-utils";

// Constant-time dummy hash so timing is identical whether or not the account exists.
const DUMMY_HASH = "$2b$10$abcdefghijklmnopqrstuuABCDEFGHIJKLMNOPQRSTUVWXYZ012345";

export async function POST(request: NextRequest) {
  const clientIP = getClientIP(request);

  // Rate limiting: per-IP
  const rateLimitResult = await checkRedisRateLimit(`klant-login:${clientIP}`, klantLoginRateLimit);
  if (!rateLimitResult.success) {
    const retryAfter = Math.max(1, Math.ceil((rateLimitResult.reset - Date.now()) / 1000));
    return NextResponse.json(
      { error: `Te veel loginpogingen. Probeer het later opnieuw.` },
      { status: 429, headers: { "Retry-After": retryAfter.toString() } }
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
    const acctLimit = await checkRedisRateLimit(`klant-login-acct:${email.toLowerCase()}`, klantLoginPerAccountRateLimit);
    if (!acctLimit.success) {
      const retryAfter = Math.max(1, Math.ceil((acctLimit.reset - Date.now()) / 1000));
      return NextResponse.json(
        { error: `Te veel loginpogingen. Probeer het later opnieuw.` },
        { status: 429, headers: { "Retry-After": retryAfter.toString() } }
      );
    }

    const { data: klant } = await supabase
      .from("klanten")
      .select("id, bedrijfsnaam, contactpersoon, email, wachtwoord, status")
      .eq("email", email.toLowerCase())
      .single();

    // Always run bcrypt to prevent timing-based user enumeration.
    const hashToCompare = klant?.wachtwoord || DUMMY_HASH;
    const valid = await bcrypt.compare(wachtwoord, hashToCompare);

    if (!klant || !valid) {
      return NextResponse.json({ error: "Ongeldige inloggegevens" }, { status: 401 });
    }

    if (klant.status !== "actief") {
      return NextResponse.json({ error: "Ongeldige inloggegevens" }, { status: 401 });
    }

    // KRITIEK: Gebruik signed JWT in plaats van plain JSON
    const { signKlantSession } = await import("@/lib/session");
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

    return NextResponse.json({ success: true });
  } catch (error) {
    captureRouteError(error, { route: "/api/klant/login", action: "POST" });
    // console.error("Login error:", error);
    return NextResponse.json({ error: "Fout bij inloggen" }, { status: 500 });
  }
}
