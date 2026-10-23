import { NextRequest, NextResponse } from "next/server";
import { getMedewerkerSession } from "@/lib/portal-auth";
import { geenMedewerkerToegang } from "@/lib/medewerker/sessie-boete";
import { captureRouteError } from "@/lib/sentry-utils";
import { BEOORDEEL_TERMIJN_DAGEN, parseWerkgeverBeoordeling } from "@/lib/medewerker/werkgever-beoordeling-regels";
import { dienWerkgeverBeoordelingIn, haalOpenstaandeBeoordelingen, type IndienFout } from "@/lib/medewerker/werkgever-beoordeling";

/**
 * Medewerker beoordeelt de werkgever na een afgeronde dienst (stap 4 "Vertrouwen zoals YoungOnes").
 *
 *   GET   → { beschikbaar, termijn_dagen, openstaand: OpenstaandeBeoordeling[] }
 *           afgeronde diensten van de laatste 14 dagen die je nog kunt beoordelen (nieuwste eerst)
 *   POST  { dienst_id | aanmelding_id, score 1-5, score_instructies?, score_sfeer?,
 *           score_zoals_beschreven? (1-5 of null), opmerking? (max. 500, alleen TopTalent ziet hem) }
 *         → 201 { success, beoordeling: { id, dienst_id, klant_id, score, created_at } }
 *
 * Fouten (body { error, code }): 400 ongeldige invoer (code `ongeldig`, plus `veld`), 404
 * `niet_gevonden`, 409 `al_beoordeeld`, 422 `niet_afgerond` / `termijn_verlopen` / `geen_werkgever`,
 * 503 `werkgever_beoordelingen_niet_beschikbaar` (migratie niet gedraaid).
 */

const ROUTE = "/api/medewerker/werkgever-beoordelingen";
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const geenCache = { headers: { "Cache-Control": "private, no-store" } };

const FOUTEN: Record<IndienFout, { status: number; error: string; code: string }> = {
  niet_gevonden: { status: 404, error: "Deze dienst staat niet op jouw naam.", code: "niet_gevonden" },
  geen_werkgever: { status: 422, error: "Deze dienst hoort niet bij een werkgever die je kunt beoordelen.", code: "geen_werkgever" },
  niet_afgerond: { status: 422, error: "Je kunt een werkgever pas beoordelen als de dienst voorbij is.", code: "niet_afgerond" },
  termijn_verlopen: {
    status: 422,
    error: `Beoordelen kan tot ${BEOORDEEL_TERMIJN_DAGEN} dagen na de dienst.`,
    code: "termijn_verlopen",
  },
  al_beoordeeld: { status: 409, error: "Je hebt deze dienst al beoordeeld.", code: "al_beoordeeld" },
  niet_beschikbaar: {
    status: 503,
    error: "Werkgevers beoordelen is nog niet beschikbaar.",
    code: "werkgever_beoordelingen_niet_beschikbaar",
  },
};

export async function GET(request: NextRequest) {
  const medewerker = await getMedewerkerSession(request);
  if (!medewerker) return geenMedewerkerToegang(request);
  try {
    const { beschikbaar, openstaand } = await haalOpenstaandeBeoordelingen(medewerker.id);
    return NextResponse.json({ beschikbaar, termijn_dagen: BEOORDEEL_TERMIJN_DAGEN, openstaand }, geenCache);
  } catch (error) {
    captureRouteError(error, { route: ROUTE, action: "GET" });
    return NextResponse.json({ error: "Ophalen mislukt" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const medewerker = await getMedewerkerSession(request);
  if (!medewerker) return geenMedewerkerToegang(request);
  try {
    const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
    const dienstId = typeof body?.dienst_id === "string" && UUID.test(body.dienst_id) ? body.dienst_id : null;
    const aanmeldingId = typeof body?.aanmelding_id === "string" && UUID.test(body.aanmelding_id) ? body.aanmelding_id : null;
    if (!dienstId && !aanmeldingId) {
      return NextResponse.json({ error: "Kies de dienst (dienst_id of aanmelding_id).", code: "ongeldig", veld: "dienst_id" }, { status: 400 });
    }
    const invoer = parseWerkgeverBeoordeling(body);
    if (!invoer.ok) return NextResponse.json({ error: invoer.fout, code: "ongeldig", veld: invoer.veld }, { status: 400 });

    const resultaat = await dienWerkgeverBeoordelingIn(medewerker.id, { dienstId, aanmeldingId }, invoer.waarde);
    if (!resultaat.ok) {
      const f = FOUTEN[resultaat.fout];
      return NextResponse.json({ error: f.error, code: f.code }, { status: f.status });
    }
    return NextResponse.json({ success: true, beoordeling: resultaat.beoordeling }, { status: 201 });
  } catch (error) {
    captureRouteError(error, { route: ROUTE, action: "POST" });
    return NextResponse.json({ error: "Opslaan mislukt" }, { status: 500 });
  }
}
