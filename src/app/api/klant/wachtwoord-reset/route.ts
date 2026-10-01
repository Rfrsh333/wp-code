import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { supabaseAdmin } from "@/lib/supabase";
import { checkRedisRateLimit, getClientIP, loginRateLimit } from "@/lib/rate-limit-redis";
import { validatePasswordSecurity } from "@/lib/password-security";
import { captureRouteError } from "@/lib/sentry-utils";
import { hashToken } from "@/lib/token-hash";
import { revokeSessions } from "@/lib/portal-auth";
import { findValidKlantResetToken } from "@/lib/klant-password-reset";

export async function GET(request: NextRequest) {
  const clientIP = getClientIP(request);
  const rateLimit = await checkRedisRateLimit(`klant-reset-check:${clientIP}`, loginRateLimit, { failClosed: true });
  if (!rateLimit.success) {
    return NextResponse.json({ error: "Te veel verzoeken. Probeer het later opnieuw." }, { status: 429 });
  }

  const token = request.nextUrl.searchParams.get("token");
  if (!token) {
    return NextResponse.json({ error: "Token ontbreekt" }, { status: 400 });
  }

  const klant = await findValidKlantResetToken(token);
  if (!klant) {
    return NextResponse.json({ error: "Resetlink is ongeldig of verlopen" }, { status: 404 });
  }

  return NextResponse.json({
    success: true,
    klant: { bedrijfsnaam: klant.bedrijfsnaam, contactpersoon: klant.contactpersoon },
  });
}

export async function POST(request: NextRequest) {
  const clientIP = getClientIP(request);
  const rateLimit = await checkRedisRateLimit(`klant-reset:${clientIP}`, loginRateLimit, { failClosed: true });

  if (!rateLimit.success) {
    return NextResponse.json(
      { error: "Te veel verzoeken. Probeer het later opnieuw." },
      { status: 429, headers: { "Retry-After": String(Math.max(1, Math.ceil((rateLimit.reset - Date.now()) / 1000))) } }
    );
  }

  try {
    const { token, wachtwoord } = await request.json().catch(() => ({}));

    if (typeof token !== "string" || !token || typeof wachtwoord !== "string" || !wachtwoord) {
      return NextResponse.json({ error: "Token en wachtwoord zijn verplicht" }, { status: 400 });
    }

    const passwordValidation = await validatePasswordSecurity(wachtwoord);
    if (!passwordValidation.valid) {
      return NextResponse.json({ error: passwordValidation.error }, { status: 400 });
    }

    const klant = await findValidKlantResetToken(token);
    if (!klant) {
      return NextResponse.json({ error: "Resetlink is ongeldig of verlopen" }, { status: 404 });
    }

    const hashedPassword = await bcrypt.hash(wachtwoord, 12);

    // Conditioneel op hetzelfde token: een link werkt precies één keer.
    const { data: bijgewerkt, error } = await supabaseAdmin
      .from("klanten")
      .update({
        wachtwoord: hashedPassword,
        reset_token: null,
        reset_token_expires_at: null,
      })
      .eq("id", klant.id)
      .eq("reset_token", hashToken(token))
      .select("id");

    if (error) {
      captureRouteError(error, { route: "/api/klant/wachtwoord-reset", action: "POST" });
      return NextResponse.json({ error: "Wachtwoord resetten mislukt" }, { status: 500 });
    }
    if (!bijgewerkt || bijgewerkt.length === 0) {
      return NextResponse.json({ error: "Resetlink is ongeldig of verlopen" }, { status: 404 });
    }

    // Alle bestaande sessies (ook op andere apparaten) vervallen na een reset.
    await revokeSessions("klanten", klant.id);

    return NextResponse.json({ success: true });
  } catch (error) {
    captureRouteError(error, { route: "/api/klant/wachtwoord-reset", action: "POST" });
    return NextResponse.json({ error: "Serverfout bij wachtwoord resetten" }, { status: 500 });
  }
}
