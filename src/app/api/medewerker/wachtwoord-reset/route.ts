import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { supabaseAdmin } from "@/lib/supabase";
import { checkRedisRateLimit, getClientIP, loginRateLimit } from "@/lib/rate-limit-redis";
import { validatePasswordSecurity } from "@/lib/password-security";
import { captureRouteError } from "@/lib/sentry-utils";

async function findValidMedewerkerResetToken(token: string) {
  const { data: medewerker } = await supabaseAdmin
    .from("medewerkers")
    .select("id, naam, email, reset_token_expires_at")
    .eq("reset_token", token)
    .gt("reset_token_expires_at", new Date().toISOString())
    .maybeSingle();

  return medewerker || null;
}

export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get("token");

  if (!token) {
    return NextResponse.json({ error: "Token ontbreekt" }, { status: 400 });
  }

  const medewerker = await findValidMedewerkerResetToken(token);

  if (!medewerker) {
    return NextResponse.json({ error: "Resetlink is ongeldig of verlopen" }, { status: 404 });
  }

  return NextResponse.json({
    success: true,
    medewerker: {
      naam: medewerker.naam,
      email: medewerker.email,
    },
  });
}

export async function POST(request: NextRequest) {
  const clientIP = getClientIP(request);
  const rateLimit = await checkRedisRateLimit(`medewerker-reset:${clientIP}`, loginRateLimit);

  if (!rateLimit.success) {
    return NextResponse.json(
      { error: "Te veel verzoeken. Probeer het later opnieuw." },
      { status: 429, headers: { "Retry-After": String(Math.max(1, Math.ceil((rateLimit.reset - Date.now()) / 1000))) } }
    );
  }

  try {
    const { token, wachtwoord } = await request.json();

    if (!token || !wachtwoord) {
      return NextResponse.json({ error: "Token en wachtwoord zijn verplicht" }, { status: 400 });
    }

    // Validate password security (length, weakness, leaked passwords)
    const passwordValidation = await validatePasswordSecurity(String(wachtwoord));
    if (!passwordValidation.valid) {
      return NextResponse.json({ error: passwordValidation.error }, { status: 400 });
    }

    const medewerker = await findValidMedewerkerResetToken(token);

    if (!medewerker) {
      return NextResponse.json({ error: "Resetlink is ongeldig of verlopen" }, { status: 404 });
    }

    const hashedPassword = await bcrypt.hash(String(wachtwoord), 10);

    const { error } = await supabaseAdmin
      .from("medewerkers")
      .update({
        wachtwoord: hashedPassword,
        reset_token: null,
        reset_token_expires_at: null,
      })
      .eq("id", medewerker.id);

    if (error) {
      return NextResponse.json({ error: "Wachtwoord resetten mislukt" }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    captureRouteError(error, { route: "/api/medewerker/wachtwoord-reset", action: "POST" });
    // console.error("Medewerker password reset error:", error);
    return NextResponse.json({ error: "Serverfout bij wachtwoord resetten" }, { status: 500 });
  }
}
