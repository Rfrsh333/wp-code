import { NextRequest, NextResponse } from "next/server";
import { getKlantSession } from "@/lib/portal-auth";
import { captureRouteError } from "@/lib/sentry-utils";
import { haalWerkgeverProfiel } from "@/lib/werkgever-profiel";

/**
 * GET /api/klant/werkgever-profiel → "Hoe medewerkers u beoordelen" (stap 4 "Vertrouwen zoals YoungOnes")
 *
 * Hetzelfde profiel dat medewerkers over deze werkgever zien: gemiddelde en aantal, deelscores en de
 * kengetallen, plus het aantal waarnemingen erachter. Anoniem: geen namen, geen datums per
 * beoordeling en geen opmerkingen (die ziet alleen TopTalent). Kengetallen zijn null onder het
 * minimum aantal waarnemingen (3).
 */
export async function GET(request: NextRequest) {
  const klant = await getKlantSession(request);
  if (!klant) return NextResponse.json({ error: "Unauthorized - Invalid session" }, { status: 401 });
  try {
    const profiel = await haalWerkgeverProfiel(klant.id);
    if (!profiel) return NextResponse.json({ error: "Niet gevonden" }, { status: 404 });
    return NextResponse.json(profiel, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    captureRouteError(error, { route: "/api/klant/werkgever-profiel", action: "GET" });
    return NextResponse.json({ error: "Ophalen mislukt" }, { status: 500 });
  }
}
