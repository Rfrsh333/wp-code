import { NextRequest, NextResponse } from "next/server";
import { getKlantSession } from "@/lib/portal-auth";
import { checkRedisRateLimit, klantLoginPerAccountRateLimit } from "@/lib/rate-limit-redis";
import { stuurVerificatieOpnieuw } from "@/lib/klant-onboarding";
import { captureRouteError } from "@/lib/sentry-utils";

/**
 * POST /api/klant/email-bevestigen/opnieuw — nieuwe bevestigingslink voor de ingelogde klant
 * (cookie of Bearer-token). De vorige link vervalt. Max. 5 per 15 minuten per account.
 * Antwoord: 200 { success: true, status: "verstuurd" | "al_bevestigd" } | 503 | 500
 */
export async function POST(request: NextRequest) {
  const klant = await getKlantSession(request);
  if (!klant) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const limiet = await checkRedisRateLimit(`klant-verificatie-opnieuw:${klant.id}`, klantLoginPerAccountRateLimit);
  if (!limiet.success) {
    return NextResponse.json({ error: "U heeft net al een nieuwe link aangevraagd. Probeer het over een kwartier opnieuw." }, { status: 429 });
  }

  try {
    const resultaat = await stuurVerificatieOpnieuw(klant.id, "/api/klant/email-bevestigen/opnieuw");
    if (resultaat === "verstuurd" || resultaat === "al_bevestigd") {
      return NextResponse.json({ success: true, status: resultaat });
    }
    if (resultaat === "niet_beschikbaar") {
      return NextResponse.json({ error: "E-mail bevestigen is nog niet beschikbaar." }, { status: 503 });
    }
    return NextResponse.json({ error: "Versturen mislukt. Probeer het later opnieuw." }, { status: 500 });
  } catch (error) {
    captureRouteError(error, { route: "/api/klant/email-bevestigen/opnieuw", action: "POST" });
    return NextResponse.json({ error: "Versturen mislukt. Probeer het later opnieuw." }, { status: 500 });
  }
}
