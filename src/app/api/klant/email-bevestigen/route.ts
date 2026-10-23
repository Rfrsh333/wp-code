import { NextRequest, NextResponse } from "next/server";
import { checkRedisRateLimit, getClientIP, loginRateLimit } from "@/lib/rate-limit-redis";
import { bevestigEmailMetToken } from "@/lib/klant-onboarding";
import { captureRouteError } from "@/lib/sentry-utils";

/**
 * POST /api/klant/email-bevestigen  Body: { token }
 * Publiek (de link kan op een ander apparaat geopend worden). Bevestigt het e-mailadres van een
 * zelf geregistreerde klant; het token werkt één keer en is 48 uur geldig.
 * Antwoord: 200 { success: true } | 400 { error, code: "ongeldig" } | 503 { error, code: "niet_beschikbaar" }
 */
export async function POST(request: NextRequest) {
  const clientIP = getClientIP(request);
  const limiet = await checkRedisRateLimit(`klant-email-bevestigen:${clientIP}`, loginRateLimit);
  if (!limiet.success) {
    return NextResponse.json({ error: "Te veel pogingen. Probeer het later opnieuw." }, { status: 429 });
  }

  try {
    const { token } = await request.json().catch(() => ({}));
    const resultaat = await bevestigEmailMetToken(typeof token === "string" ? token : "", "/api/klant/email-bevestigen");
    if (resultaat === "bevestigd") return NextResponse.json({ success: true });
    if (resultaat === "niet_beschikbaar") {
      return NextResponse.json({ error: "E-mail bevestigen is nog niet beschikbaar.", code: "niet_beschikbaar" }, { status: 503 });
    }
    return NextResponse.json(
      { error: "Deze link is verlopen of al gebruikt. Log in en vraag een nieuwe link aan.", code: "ongeldig" },
      { status: 400 },
    );
  } catch (error) {
    captureRouteError(error, { route: "/api/klant/email-bevestigen", action: "POST" });
    return NextResponse.json({ error: "Bevestigen mislukt. Probeer het opnieuw." }, { status: 500 });
  }
}
