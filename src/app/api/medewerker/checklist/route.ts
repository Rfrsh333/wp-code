import { NextRequest, NextResponse } from "next/server";
import { getMedewerkerSession } from "@/lib/portal-auth";
import { geenMedewerkerToegang } from "@/lib/medewerker/sessie-boete";
import { haalChecklist } from "@/lib/medewerker/checklist";
import { captureRouteError } from "@/lib/sentry-utils";

/**
 * B1: wat moet in orde zijn voordat de medewerker mag reageren (webportaal én app).
 * Contract (ook in de PR-beschrijving):
 *   200 {
 *     compleet: boolean,             // true = mag reageren
 *     aantal_open: number,
 *     punten: [{ code, label, ok, uitleg, actie: { scherm, web_pad, label } }],
 *       // code ∈ id_bewijs | kvk_nummer | btw_nummer | iban | overeenkomst | zelffacturering
 *       // scherm ∈ profiel | documenten | overeenkomst | zelffacturering
 *       // zelffacturering (stap 6) staat er alleen bij met ZELFFACTURERING_ACTIEF=1 en migratie
 *       // 20261024; akkoord geven via GET/POST /api/medewerker/zelffacturering. Onbekende
 *       // `scherm`-waarden: open `web_pad`.
 *     overeenkomst: { versie, akkoord_op, akkoord_versie },
 *     actief: boolean                // false = migratie ontbreekt, er wordt (nog) niet geblokkeerd
 *   }
 *   401 sessie ongeldig · 403 { code: "account_gepauzeerd" }
 */
export async function GET(request: NextRequest) {
  try {
    const medewerker = await getMedewerkerSession(request);
    if (!medewerker) return geenMedewerkerToegang(request);

    const checklist = await haalChecklist(medewerker.id);
    return NextResponse.json(
      {
        compleet: checklist.compleet,
        aantal_open: checklist.ontbrekend.length,
        punten: checklist.punten,
        overeenkomst: checklist.overeenkomst,
        actief: !checklist.migratieOntbreekt,
      },
      { headers: { "Cache-Control": "private, no-store" } },
    );
  } catch (error) {
    captureRouteError(error, { route: "/api/medewerker/checklist", action: "GET" });
    return NextResponse.json({ error: "Er ging iets mis" }, { status: 500 });
  }
}
