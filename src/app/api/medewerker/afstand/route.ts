import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { getMedewerkerSession } from "@/lib/portal-auth";
import { geenMedewerkerToegang } from "@/lib/medewerker/sessie-boete";
import { captureRouteError } from "@/lib/sentry-utils";
import { isOntbrekendeKolom } from "@/lib/db-kolom-fallback";
import { MAX_AFSTAND_OPTIES_KM, parseMaxAfstandKm } from "@/lib/locatie/locatie-regels";
import { haalMedewerkerAfstand } from "@/lib/locatie/locatie-opslag";

/**
 * Maximale afstand voor meldingen over nieuwe diensten (stap 3). null = geen grens.
 * De afstand is hemelsbreed vanaf het middelpunt van de eigen postcode (PDOK, zie lib/locatie).
 *
 *   GET → { beschikbaar, max_afstand_km, postcode_ingevuld, locatie_bekend, opties_km }
 *   PUT { max_afstand_km: number | null } → { success, max_afstand_km }
 *
 * Zonder migratie: GET `beschikbaar: false`, PUT 503 met code `afstand_niet_beschikbaar`.
 * We geven nooit de coördinaten zelf terug, alleen of ze bekend zijn.
 */

const ROUTE = "/api/medewerker/afstand";

export async function GET(request: NextRequest) {
  const medewerker = await getMedewerkerSession(request);
  if (!medewerker) return geenMedewerkerToegang(request);
  try {
    const a = await haalMedewerkerAfstand(medewerker.id);
    return NextResponse.json(
      {
        beschikbaar: a.beschikbaar,
        max_afstand_km: a.maxAfstandKm,
        postcode_ingevuld: a.postcodeIngevuld,
        locatie_bekend: !!a.locatie,
        opties_km: MAX_AFSTAND_OPTIES_KM,
      },
      { headers: { "Cache-Control": "private, no-store" } },
    );
  } catch (error) {
    captureRouteError(error, { route: ROUTE, action: "GET" });
    return NextResponse.json({ error: "Ophalen mislukt" }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  const medewerker = await getMedewerkerSession(request);
  if (!medewerker) return geenMedewerkerToegang(request);
  try {
    const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
    if (!body || !("max_afstand_km" in body)) {
      return NextResponse.json({ error: "max_afstand_km is verplicht (een getal of null)." }, { status: 400 });
    }
    const r = parseMaxAfstandKm(body.max_afstand_km);
    if (!r.ok) return NextResponse.json({ error: r.error }, { status: 400 });

    const { error } = await supabaseAdmin.from("medewerkers").update({ max_afstand_km: r.waarde }).eq("id", medewerker.id);
    if (isOntbrekendeKolom(error)) {
      return NextResponse.json(
        { error: "Een maximale afstand instellen is nog niet beschikbaar.", code: "afstand_niet_beschikbaar" },
        { status: 503 },
      );
    }
    if (error) throw error;
    return NextResponse.json({ success: true, max_afstand_km: r.waarde });
  } catch (error) {
    captureRouteError(error, { route: ROUTE, action: "PUT" });
    return NextResponse.json({ error: "Opslaan mislukt" }, { status: 500 });
  }
}
