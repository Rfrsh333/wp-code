import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { getMedewerkerSession } from "@/lib/portal-auth";
import { geenMedewerkerToegang } from "@/lib/medewerker/sessie-boete";
import { captureRouteError } from "@/lib/sentry-utils";
import { haalDemoIds, zelfdeWereld } from "@/lib/demo";
import { parseVoorkeurSoort } from "@/lib/medewerker/ontdekken-regels";
import { lijstVoorkeuren, verwijderVoorkeur, zetVoorkeur } from "@/lib/medewerker/werkgever-voorkeuren";

/**
 * Werkgevers bewaren of verbergen (stap 3, Ontdekken). Per medewerker en werkgever één keuze:
 * favoriet óf verborgen. Verborgen werkgevers vallen weg uit Ontdekken en de push.
 *
 *   GET                                       → { beschikbaar, favoriet: WerkgeverRegel[], verborgen: WerkgeverRegel[] }
 *   POST   { soort, klant_id? | dienst_id? }  → { success, klant_id, soort }
 *   DELETE ?klant_id=…[&soort=favoriet|verborgen]  (of dezelfde velden in de body) → { success, klant_id }
 *
 * Zolang de migratie niet gedraaid is: GET geeft `beschikbaar: false` met lege lijsten, POST/DELETE
 * 503 met code `werkgever_voorkeuren_niet_beschikbaar`.
 */

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const ROUTE = "/api/medewerker/werkgevers";
const NIET_BESCHIKBAAR = {
  error: "Werkgevers bewaren of verbergen is nog niet beschikbaar.",
  code: "werkgever_voorkeuren_niet_beschikbaar",
} as const;

const geenCache = { headers: { "Cache-Control": "private, no-store" } };

export async function GET(request: NextRequest) {
  const medewerker = await getMedewerkerSession(request);
  if (!medewerker) return geenMedewerkerToegang(request);
  try {
    return NextResponse.json(await lijstVoorkeuren(medewerker.id), geenCache);
  } catch (error) {
    captureRouteError(error, { route: ROUTE, action: "GET" });
    return NextResponse.json({ error: "Ophalen mislukt" }, { status: 500 });
  }
}

/**
 * Klant-id uit de body: rechtstreeks, of via een dienst (zo hoeft de app geen klant-id te kennen).
 * Alleen werkgevers met minstens één dienst (de medewerker kent ze uit Ontdekken of Mijn diensten);
 * zo is de route geen manier om willekeurige klantaccounts op te zoeken.
 */
async function klantUitVerzoek(body: Record<string, unknown>): Promise<string | null> {
  if (typeof body.klant_id === "string" && UUID.test(body.klant_id)) {
    const { data } = await supabaseAdmin.from("diensten").select("klant_id").eq("klant_id", body.klant_id).limit(1);
    return ((data?.[0]?.klant_id as string | undefined) ?? null);
  }
  if (typeof body.dienst_id === "string" && UUID.test(body.dienst_id)) {
    const { data } = await supabaseAdmin.from("diensten").select("klant_id").eq("id", body.dienst_id).maybeSingle();
    return (data?.klant_id as string | null | undefined) ?? null;
  }
  return null;
}

export async function POST(request: NextRequest) {
  const medewerker = await getMedewerkerSession(request);
  if (!medewerker) return geenMedewerkerToegang(request);
  try {
    const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
    const soort = parseVoorkeurSoort(body?.soort);
    if (!body || !soort) {
      return NextResponse.json({ error: "Kies favoriet of verborgen en een werkgever (klant_id of dienst_id)." }, { status: 400 });
    }
    const klantId = await klantUitVerzoek(body);
    // Demo-accounts blijven in hun eigen wereld (lib/demo.ts).
    if (!klantId || !zelfdeWereld(await haalDemoIds(), medewerker.id, klantId)) {
      return NextResponse.json({ error: "Werkgever niet gevonden." }, { status: 404 });
    }
    const { beschikbaar } = await zetVoorkeur(medewerker.id, klantId, soort);
    if (!beschikbaar) return NextResponse.json(NIET_BESCHIKBAAR, { status: 503 });
    return NextResponse.json({ success: true, klant_id: klantId, soort });
  } catch (error) {
    captureRouteError(error, { route: ROUTE, action: "POST" });
    return NextResponse.json({ error: "Opslaan mislukt" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  const medewerker = await getMedewerkerSession(request);
  if (!medewerker) return geenMedewerkerToegang(request);
  try {
    const body = ((await request.json().catch(() => null)) as Record<string, unknown> | null) ?? {};
    const params = request.nextUrl.searchParams;
    const klantId = (params.get("klant_id") ?? body.klant_id) as unknown;
    const soortRuw = params.get("soort") ?? body.soort;
    const soort = soortRuw == null || soortRuw === "" ? undefined : parseVoorkeurSoort(soortRuw);
    if (typeof klantId !== "string" || !UUID.test(klantId) || soort === null) {
      return NextResponse.json({ error: "klant_id is verplicht (soort optioneel: favoriet of verborgen)." }, { status: 400 });
    }
    const { beschikbaar } = await verwijderVoorkeur(medewerker.id, klantId, soort);
    if (!beschikbaar) return NextResponse.json(NIET_BESCHIKBAAR, { status: 503 });
    return NextResponse.json({ success: true, klant_id: klantId });
  } catch (error) {
    captureRouteError(error, { route: ROUTE, action: "DELETE" });
    return NextResponse.json({ error: "Opheffen mislukt" }, { status: 500 });
  }
}
