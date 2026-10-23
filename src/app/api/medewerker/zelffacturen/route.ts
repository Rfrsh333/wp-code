import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { getMedewerkerSession } from "@/lib/portal-auth";
import { geenMedewerkerToegang } from "@/lib/medewerker/sessie-boete";
import { captureRouteError } from "@/lib/sentry-utils";
import { nlVandaag } from "@/lib/nl-tijd";
import { isZelffactureringActief, PDF_URL_SECONDEN, uitbetaalTermijnWerkdagen, UITBETALING_BUCKET } from "@/lib/uitbetaling/config";
import { haalUrenMetStatus, haalZelffacturenVanMedewerker } from "@/lib/uitbetaling/db";
import {
  centenNaarEuro,
  facturenCsv,
  kwartaalTotalen,
  kwartaalVan,
  naarCenten,
  STATUS_LABELS,
  type UitbetaalStatus,
} from "@/lib/uitbetaling/regels";

/**
 * Stap 6 "Geld": facturen per kwartaal voor de medewerker (Financieel > Facturen), web én app.
 *
 * Contract:
 *   GET /api/medewerker/zelffacturen?jaar=2026
 *   → 200 {
 *       actief: boolean,              // ZELFFACTURERING_ACTIEF; false = toon "binnenkort" (bestaande facturen blijven zichtbaar)
 *       migratie_ontbreekt: boolean,
 *       jaar: number, jaren: number[], // jaren met facturen (+ het huidige), nieuwste eerst
 *       kwartalen: [{ kwartaal: 1-4, aantal, bedrag_excl, btw_bedrag, bedrag_incl }],  // op factuurdatum
 *       facturen: [{
 *         id, factuur_nummer, factuur_datum (YYYY-MM-DD), kwartaal,
 *         bedrag_excl, btw_percentage, btw_bedrag, bedrag_incl,   // euro's, 2 decimalen
 *         kor: boolean,
 *         status: "in_uitbetaalronde" | "uitbetaald", status_label,
 *         uitbetaald_op: ISO | null,
 *         pdf_url: string | null    // kortlevende signed URL (5 min); opnieuw ophalen via /api/medewerker/zelffacturen/{id}/pdf
 *       }],
 *       onderweg: [{                // goedgekeurde uren waarvoor nog geen factuur is (die volgt bij de uitbetaling)
 *         uren_registratie_id, datum, werkgever, uren, bedrag_excl,  // bedrag = indicatie excl. btw
 *         status: "wacht_op_goedkeuring" | "wacht_op_betaling_werkgever" | "uitbetaalbaar", status_label
 *       }],
 *       onderweg_totaal_excl: number,
 *       uitbetaal_termijn_werkdagen: number | null
 *     }
 *   GET /api/medewerker/zelffacturen?jaar=2026&kwartaal=3&formaat=csv → text/csv (puntkomma's, UTF-8 met BOM)
 *   401 sessie ongeldig · 403 { code: "account_gepauzeerd" } · 400 ongeldig jaar/kwartaal
 */

const ONDERWEG: UitbetaalStatus[] = ["wacht_op_goedkeuring", "wacht_op_betaling_werkgever", "uitbetaalbaar"];

export async function GET(request: NextRequest) {
  try {
    const medewerker = await getMedewerkerSession(request);
    if (!medewerker) return geenMedewerkerToegang(request);

    const huidigJaar = Number(nlVandaag().slice(0, 4));
    const params = request.nextUrl.searchParams;
    const jaarRuw = params.get("jaar");
    const jaar = jaarRuw ? Number(jaarRuw) : huidigJaar;
    if (!Number.isInteger(jaar) || jaar < 2020 || jaar > huidigJaar + 1) {
      return NextResponse.json({ error: "Ongeldig jaar" }, { status: 400 });
    }
    const kwartaalRuw = params.get("kwartaal");
    const kwartaal = kwartaalRuw ? Number(kwartaalRuw) : null;
    if (kwartaal !== null && (!Number.isInteger(kwartaal) || kwartaal < 1 || kwartaal > 4)) {
      return NextResponse.json({ error: "Kwartaal moet 1 t/m 4 zijn" }, { status: 400 });
    }

    const { facturen, jaren, migratieOntbreekt } = await haalZelffacturenVanMedewerker(medewerker.id, jaar);
    const metCenten = facturen.map((f) => ({
      ...f,
      excl_centen: naarCenten(f.bedrag_excl),
      btw_centen: naarCenten(f.btw_bedrag),
      incl_centen: naarCenten(f.bedrag_incl),
      kwartaal: kwartaalVan(f.factuur_datum),
    }));

    if (params.get("formaat") === "csv") {
      if (kwartaal === null) return NextResponse.json({ error: "Kies een kwartaal voor de download" }, { status: 400 });
      const csv = facturenCsv(
        metCenten
          .filter((f) => f.kwartaal === kwartaal)
          .sort((a, b) => a.factuur_datum.localeCompare(b.factuur_datum) || a.factuur_nummer.localeCompare(b.factuur_nummer))
          .map((f) => ({ ...f, status: f.status as UitbetaalStatus })),
      );
      return new NextResponse(csv, {
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="facturen-${jaar}-K${kwartaal}.csv"`,
          "Cache-Control": "private, no-store",
        },
      });
    }

    // Kortlevende links naar de PDF's (private bucket).
    const paden = metCenten.map((f) => f.pdf_pad).filter((p): p is string => !!p);
    const urlPerPad = new Map<string, string>();
    if (paden.length > 0) {
      const { data: signed } = await supabaseAdmin.storage.from(UITBETALING_BUCKET).createSignedUrls(paden, PDF_URL_SECONDEN);
      for (const s of signed ?? []) if (s.path && s.signedUrl) urlPerPad.set(s.path, s.signedUrl);
    }

    const termijn = uitbetaalTermijnWerkdagen();
    const { items } = migratieOntbreekt
      ? { items: [] }
      : await haalUrenMetStatus({ medewerkerId: medewerker.id }, { termijnWerkdagen: termijn });
    const onderweg = items
      .filter((i) => ONDERWEG.includes(i.status))
      .map((i) => ({
        uren_registratie_id: i.uren_registratie_id,
        datum: i.regel.datum,
        werkgever: i.regel.werkgever,
        uren: i.regel.uren,
        bedrag_excl: centenNaarEuro(i.regel.bedrag_centen),
        status: i.status,
        status_label: STATUS_LABELS[i.status],
      }));
    const onderwegCenten = items.filter((i) => ONDERWEG.includes(i.status)).reduce((t, i) => t + i.regel.bedrag_centen, 0);

    return NextResponse.json(
      {
        actief: isZelffactureringActief(),
        migratie_ontbreekt: migratieOntbreekt,
        jaar,
        jaren: [...new Set([huidigJaar, ...jaren])].sort((a, b) => b - a),
        kwartalen: kwartaalTotalen(metCenten, jaar).map((k) => ({
          kwartaal: k.kwartaal,
          aantal: k.aantal,
          bedrag_excl: centenNaarEuro(k.excl_centen),
          btw_bedrag: centenNaarEuro(k.btw_centen),
          bedrag_incl: centenNaarEuro(k.incl_centen),
        })),
        facturen: metCenten.map((f) => ({
          id: f.id,
          factuur_nummer: f.factuur_nummer,
          factuur_datum: f.factuur_datum,
          kwartaal: f.kwartaal,
          bedrag_excl: centenNaarEuro(f.excl_centen),
          btw_percentage: f.btw_percentage,
          btw_bedrag: centenNaarEuro(f.btw_centen),
          bedrag_incl: centenNaarEuro(f.incl_centen),
          kor: f.kor,
          status: f.status,
          status_label: STATUS_LABELS[f.status],
          uitbetaald_op: f.uitbetaald_op,
          pdf_url: f.pdf_pad ? (urlPerPad.get(f.pdf_pad) ?? null) : null,
        })),
        onderweg,
        onderweg_totaal_excl: centenNaarEuro(onderwegCenten),
        uitbetaal_termijn_werkdagen: termijn,
      },
      { headers: { "Cache-Control": "private, no-store" } },
    );
  } catch (error) {
    captureRouteError(error, { route: "/api/medewerker/zelffacturen", action: "GET" });
    return NextResponse.json({ error: "Er ging iets mis" }, { status: 500 });
  }
}
