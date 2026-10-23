import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { getMedewerkerSession } from "@/lib/portal-auth";
import { geenMedewerkerToegang } from "@/lib/medewerker/sessie-boete";
import { captureRouteError } from "@/lib/sentry-utils";
import { haalDemoIds, zelfdeWereld } from "@/lib/demo";
import { haalWerkgeverProfiel } from "@/lib/werkgever-profiel";

/**
 * GET /api/medewerker/werkgevers/<klantId>/profiel → WerkgeverProfiel (stap 4 "Vertrouwen zoals YoungOnes")
 *
 * Wat een medewerker over een werkgever ziet: gemiddelde beoordeling en aantal, deelscores en de
 * kengetallen (kiest meestal binnen X uur, kiest in X% van de diensten iemand). Elk kengetal is null
 * onder het minimum aantal waarnemingen (3); betaalt_binnen_dagen is altijd null (geen betaaldatum
 * bekend). Nooit namen of opmerkingen.
 *
 * Alleen werkgevers met minstens één dienst (zoals bij werkgevers bewaren), en alleen binnen de eigen
 * wereld (demo-scheiding); anders 404, zodat de route geen manier is om klantaccounts op te zoeken.
 */

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const ROUTE = "/api/medewerker/werkgevers/[klantId]/profiel";

export async function GET(request: NextRequest, { params }: { params: Promise<{ klantId: string }> }) {
  const medewerker = await getMedewerkerSession(request);
  if (!medewerker) return geenMedewerkerToegang(request);
  try {
    const { klantId } = await params;
    if (!UUID.test(klantId)) return NextResponse.json({ error: "Werkgever niet gevonden." }, { status: 404 });

    const [{ data: dienst }, demoIds] = await Promise.all([
      supabaseAdmin.from("diensten").select("id").eq("klant_id", klantId).limit(1).maybeSingle(),
      haalDemoIds(),
    ]);
    if (!dienst || !zelfdeWereld(demoIds, medewerker.id, klantId)) {
      return NextResponse.json({ error: "Werkgever niet gevonden." }, { status: 404 });
    }

    const profiel = await haalWerkgeverProfiel(klantId);
    if (!profiel) return NextResponse.json({ error: "Werkgever niet gevonden." }, { status: 404 });
    return NextResponse.json(profiel, { headers: { "Cache-Control": "private, max-age=60" } });
  } catch (error) {
    captureRouteError(error, { route: ROUTE, action: "GET" });
    return NextResponse.json({ error: "Ophalen mislukt" }, { status: 500 });
  }
}
