import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { cookies } from "next/headers";
import { verifyKlantSession } from "@/lib/session";

export async function GET(request: NextRequest) {
  const cookieStore = await cookies();
  const session = cookieStore.get("klant_session");
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const klant = await verifyKlantSession(session.value);
  if (!klant) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const jaar = parseInt(searchParams.get("jaar") || String(new Date().getFullYear()));

  // Get all diensten for this klant in the given year
  const { data: diensten } = await supabaseAdmin
    .from("diensten")
    .select("id, datum, functie, uurtarief")
    .eq("klant_id", klant.id)
    .gte("datum", `${jaar}-01-01`)
    .lte("datum", `${jaar}-12-31`);

  if (!diensten?.length) {
    return NextResponse.json({
      jaar,
      totaal: 0,
      per_maand: [],
      per_functie: [],
      top_medewerkers: [],
    });
  }

  const dienstIds = diensten.map((d) => d.id);

  // Get approved uren_registraties for these diensten
  const { data: aanmeldingen } = await supabaseAdmin
    .from("dienst_aanmeldingen")
    .select(`
      medewerker_id, dienst_id,
      medewerker:medewerkers(naam),
      uren_registraties(gewerkte_uren, status)
    `)
    .in("dienst_id", dienstIds);

  // Build cost data
  const dienstMap = new Map(diensten.map((d) => [d.id, d]));
  const maandTotalen: Record<number, number> = {};
  const functieTotalen: Record<string, number> = {};
  const medewerkerTotalen: Record<string, { naam: string; totaal: number; uren: number }> = {};

  for (const a of aanmeldingen || []) {
    const dienst = dienstMap.get(a.dienst_id);
    if (!dienst) continue;

    const med = a.medewerker as unknown as { naam: string } | null;
    const registraties = a.uren_registraties as unknown as { gewerkte_uren: number; status: string }[];

    for (const ur of registraties || []) {
      if (!["klant_goedgekeurd", "goedgekeurd"].includes(ur.status)) continue;

      const kosten = ur.gewerkte_uren * (dienst.uurtarief || 0);
      const maand = new Date(dienst.datum).getMonth();

      maandTotalen[maand] = (maandTotalen[maand] || 0) + kosten;
      functieTotalen[dienst.functie || "Overig"] = (functieTotalen[dienst.functie || "Overig"] || 0) + kosten;

      const mid = a.medewerker_id;
      if (!medewerkerTotalen[mid]) {
        medewerkerTotalen[mid] = { naam: med?.naam || "Onbekend", totaal: 0, uren: 0 };
      }
      medewerkerTotalen[mid].totaal += kosten;
      medewerkerTotalen[mid].uren += ur.gewerkte_uren;
    }
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
