import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { getKlantSession } from "@/lib/portal-auth";
import { nlVandaag } from "@/lib/nl-tijd";
import { captureRouteError } from "@/lib/sentry-utils";

// Goedgekeurde uren tellen als kosten, ook nadat er een factuur van is gemaakt
// (voorheen verdwenen gefactureerde uren uit het kostenoverzicht).
const KOSTEN_STATUSSEN = ["klant_goedgekeurd", "goedgekeurd", "gefactureerd"];

function eerste<T>(v: T | T[] | null | undefined): T | null {
  return (Array.isArray(v) ? v[0] : v) ?? null;
}

export async function GET(request: NextRequest) {
  const klant = await getKlantSession(request);
  if (!klant) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const huidigJaar = Number(nlVandaag().slice(0, 4));
  const gevraagd = parseInt(searchParams.get("jaar") || String(huidigJaar));
  const jaar = Number.isFinite(gevraagd) && gevraagd >= 2000 && gevraagd <= huidigJaar + 1 ? gevraagd : huidigJaar;

  // Filter op klant en jaar in de database (!inner), i.p.v. eerst alle dienst-id's op te halen
  // en die als lange .in()-lijst mee te sturen.
  const { data: uren, error } = await supabaseAdmin
    .from("uren_registraties")
    .select(`
      gewerkte_uren, status,
      aanmelding:dienst_aanmeldingen!inner(
        medewerker_id,
        medewerker:medewerkers(naam),
        dienst:diensten!inner(klant_id, datum, functie, uurtarief)
      )
    `)
    .eq("aanmelding.dienst.klant_id", klant.id)
    .gte("aanmelding.dienst.datum", `${jaar}-01-01`)
    .lte("aanmelding.dienst.datum", `${jaar}-12-31`)
    .in("status", KOSTEN_STATUSSEN)
    .limit(10000);

  if (error) {
    captureRouteError(error, { route: "/api/klant/kosten", action: "GET" });
    return NextResponse.json({ error: "Kosten ophalen mislukt" }, { status: 500 });
  }

  const maandTotalen: Record<number, number> = {};
  const functieTotalen: Record<string, number> = {};
  const medewerkerTotalen: Record<string, { naam: string; totaal: number; uren: number }> = {};

  for (const ur of uren || []) {
    const aanmelding = eerste(ur.aanmelding as { medewerker_id?: string; medewerker?: unknown; dienst?: unknown } | null);
    const dienst = eerste(aanmelding?.dienst as { datum?: string; functie?: string | null; uurtarief?: number | null } | null);
    if (!aanmelding || !dienst?.datum) continue;
    const med = eerste(aanmelding.medewerker as { naam?: string } | null);

    const gewerkt = ur.gewerkte_uren || 0;
    const kosten = gewerkt * (dienst.uurtarief || 0);
    const maand = Number(dienst.datum.slice(5, 7)) - 1;

    maandTotalen[maand] = (maandTotalen[maand] || 0) + kosten;
    const functie = dienst.functie || "Overig";
    functieTotalen[functie] = (functieTotalen[functie] || 0) + kosten;

    const mid = aanmelding.medewerker_id || "onbekend";
    if (!medewerkerTotalen[mid]) {
      medewerkerTotalen[mid] = { naam: med?.naam || "Onbekend", totaal: 0, uren: 0 };
    }
    medewerkerTotalen[mid].totaal += kosten;
    medewerkerTotalen[mid].uren += gewerkt;
  }

  const maandNamen = ["Jan", "Feb", "Mrt", "Apr", "Mei", "Jun", "Jul", "Aug", "Sep", "Okt", "Nov", "Dec"];
  const perMaand = maandNamen.map((naam, i) => ({
    maand: naam,
    kosten: Math.round((maandTotalen[i] || 0) * 100) / 100,
  }));

  const perFunctie = Object.entries(functieTotalen).map(([functie, kosten]) => ({
    functie,
    kosten: Math.round(kosten * 100) / 100,
  }));

  const topMedewerkers = Object.values(medewerkerTotalen)
    .sort((a, b) => b.totaal - a.totaal)
    .slice(0, 10)
    .map((m) => ({
      naam: m.naam,
      totaal: Math.round(m.totaal * 100) / 100,
      uren: Math.round(m.uren * 100) / 100,
    }));

  const totaal = Object.values(maandTotalen).reduce((sum, v) => sum + v, 0);

  return NextResponse.json({
    jaar,
    totaal: Math.round(totaal * 100) / 100,
    per_maand: perMaand,
    per_functie: perFunctie,
    top_medewerkers: topMedewerkers,
  });
}
