import { NextRequest, NextResponse } from "next/server";
import { verifyAdmin } from "@/lib/admin-auth";
import { supabaseAdmin } from "@/lib/supabase";

export async function GET(request: NextRequest) {
  const { isAdmin } = await verifyAdmin(request);
  if (!isAdmin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const today = new Date().toISOString().split("T")[0];
  const now = new Date();
  const firstDayThisMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split("T")[0];
  const firstDayLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString().split("T")[0];
  const lastDayLastMonth = new Date(now.getFullYear(), now.getMonth(), 0).toISOString().split("T")[0];

  const [
    dienstenVandaag,
    aanmeldingenVandaag,
    medewerkers,
    facturenDezeMaand,
    facturenVorigeMaand,
    facturenOpenstaand,
  ] = await Promise.allSettled([
    // Diensten vandaag
    supabaseAdmin
      .from("diensten")
      .select("id, status, plekken_totaal, plekken_beschikbaar, start_tijd, eind_tijd, functie, klant_naam")
      .eq("datum", today),

    // Aanmeldingen vandaag (geaccepteerd)
    supabaseAdmin
      .from("dienst_aanmeldingen")
      .select("id, dienst_id, medewerker_id, status, dienst:diensten!inner(datum)")
      .eq("dienst.datum", today)
      .eq("status", "geaccepteerd"),

    // Alle medewerkers met status
    supabaseAdmin
      .from("medewerkers")
      .select("id, status, naam"),

    // Facturen deze maand
    supabaseAdmin
      .from("facturen")
      .select("id, totaal, status, created_at")
      .gte("created_at", firstDayThisMonth + "T00:00:00"),

    // Facturen vorige maand
    supabaseAdmin
      .from("facturen")
      .select("id, totaal, status, created_at")
      .gte("created_at", firstDayLastMonth + "T00:00:00")
      .lte("created_at", lastDayLastMonth + "T23:59:59"),

    // Openstaande facturen
    supabaseAdmin
      .from("facturen")
      .select("id, totaal, status")
      .in("status", ["open", "verstuurd"]),
  ]);

  // Process diensten vandaag
  const diensten = dienstenVandaag.status === "fulfilled" ? (dienstenVandaag.value.data || []) : [];
  const aanmeldingen = aanmeldingenVandaag.status === "fulfilled" ? (aanmeldingenVandaag.value.data || []) : [];
  const allMedewerkers = medewerkers.status === "fulfilled" ? (medewerkers.value.data || []) : [];

  const vandaag = {
    dienstenActief: diensten.length,
    medewerkerIngepland: new Set(aanmeldingen.map((a: { medewerker_id: string }) => a.medewerker_id)).size,
    openDiensten: diensten.filter((d: { plekken_beschikbaar: number }) => d.plekken_beschikbaar > 0).length,
    noShows: 0, // Would need a no_show flag on aanmeldingen
  };

  // Beschikbaarheid
  const actief = allMedewerkers.filter((m: { status: string }) => m.status === "actief").length;
  const gepauzeerd = allMedewerkers.filter((m: { status: string }) => m.status === "gepauzeerd").length;
  const ingeplandSet = new Set(aanmeldingen.map((a: { medewerker_id: string }) => a.medewerker_id));

  const beschikbaarheid = {
    totaal: allMedewerkers.length,
    actief,
    ingepland: ingeplandSet.size,
    beschikbaar: actief - ingeplandSet.size,
    gepauzeerd,
  };

  // Omzet
  const facturenThisMonth = facturenDezeMaand.status === "fulfilled" ? (facturenDezeMaand.value.data || []) : [];
  const facturenLastMonth = facturenVorigeMaand.status === "fulfilled" ? (facturenVorigeMaand.value.data || []) : [];
  const facturenOpen = facturenOpenstaand.status === "fulfilled" ? (facturenOpenstaand.value.data || []) : [];

  const sumTotaal = (arr: { totaal: number }[]) => arr.reduce((sum, f) => sum + (f.totaal || 0), 0);

  // Group by week for mini chart
  const weekData: { week: string; omzet: number }[] = [];
  const weekMap = new Map<string, number>();
  for (const f of facturenThisMonth) {
    const d = new Date(f.created_at);
    const weekNum = getWeekNumber(d);
    const key = `W${weekNum}`;
    weekMap.set(key, (weekMap.get(key) || 0) + (f.totaal || 0));
  }
  for (const [week, omzet] of Array.from(weekMap.entries()).sort()) {
    weekData.push({ week, omzet: Math.round(omzet) });
  }

  const omzet = {
    dezeMaand: Math.round(sumTotaal(facturenThisMonth)),
    vorigeMaand: Math.round(sumTotaal(facturenLastMonth)),
    openstaand: Math.round(sumTotaal(facturenOpen)),
    weekData,
  };

  return NextResponse.json({ vandaag, beschikbaarheid, omzet });
}

function getWeekNumber(date: Date): number {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + 3 - ((d.getDay() + 6) % 7));
  const week1 = new Date(d.getFullYear(), 0, 4);
  return 1 + Math.round(((d.getTime() - week1.getTime()) / 86400000 - 3 + ((week1.getDay() + 6) % 7)) / 7);
}
