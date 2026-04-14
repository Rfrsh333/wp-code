import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Haal alle klanten op
  const { data: klanten } = await supabaseAdmin
    .from("klanten")
    .select("id");

  if (!klanten || klanten.length === 0) {
    return NextResponse.json({ message: "Geen klanten gevonden" });
  }

  const nu = new Date();
  const zesmaandenGeleden = new Date();
  zesmaandenGeleden.setMonth(zesmaandenGeleden.getMonth() - 6);

  let updated = 0;

  for (const klant of klanten) {
    // Tel totaal diensten
    const { count: totaalDiensten } = await supabaseAdmin
      .from("diensten")
      .select("*", { count: "exact", head: true })
      .eq("klant_id", klant.id);

    // Bereken totaal omzet uit goedgekeurde facturen
    const { data: facturen } = await supabaseAdmin
      .from("facturen")
      .select("totaal_bedrag")
      .eq("klant_id", klant.id)
      .in("status", ["verstuurd", "betaald"]);

    const totaalOmzet = facturen?.reduce((sum, f) => sum + (Number(f.totaal_bedrag) || 0), 0) || 0;

    // Laatste dienst datum
    const { data: laatsteDienst } = await supabaseAdmin
      .from("diensten")
      .select("datum")
      .eq("klant_id", klant.id)
      .order("datum", { ascending: false })
      .limit(1);

    const laatsteDienstDatum = laatsteDienst?.[0]?.datum || null;

    // Gemiddelde beoordeling die klant geeft
    const { data: beoordelingen } = await supabaseAdmin
      .from("beoordelingen")
      .select("score")
      .eq("klant_id", klant.id);

    const scores = beoordelingen?.map(b => b.score).filter(Boolean) || [];
    const gemBeoordeling = scores.length > 0
      ? Math.round((scores.reduce((a: number, b: number) => a + b, 0) / scores.length) * 10) / 10
      : 0;

    // Churn risico berekening
    const { count: recenteDiensten } = await supabaseAdmin
      .from("diensten")
      .select("*", { count: "exact", head: true })
      .eq("klant_id", klant.id)
      .gte("datum", zesmaandenGeleden.toISOString().split("T")[0]);

    const gemPerMaand = (recenteDiensten || 0) / 6;

    // Huidige maand diensten
    const eersteVandeMaand = `${nu.getFullYear()}-${String(nu.getMonth() + 1).padStart(2, "0")}-01`;
    const { count: dezeMaand } = await supabaseAdmin
      .from("diensten")
      .select("*", { count: "exact", head: true })
      .eq("klant_id", klant.id)
      .gte("datum", eersteVandeMaand);

    const dagenSindsLaatste = laatsteDienstDatum
      ? Math.floor((Date.now() - new Date(laatsteDienstDatum).getTime()) / (1000 * 60 * 60 * 24))
      : 999;

    let churnRisico = "laag";
    if (dagenSindsLaatste > 60 || ((totaalDiensten || 0) > 5 && dagenSindsLaatste > 45)) {
      churnRisico = "hoog";
    } else if (
      dagenSindsLaatste > 30 ||
      (gemPerMaand > 2 && (dezeMaand || 0) < gemPerMaand * 0.5)
    ) {
      churnRisico = "middel";
    }

    // Loyalty tier
    const td = totaalDiensten || 0;
    let loyaltyTier = "standaard";
    if (td > 60) loyaltyTier = "platinum";
    else if (td > 30) loyaltyTier = "gold";
    else if (td > 10) loyaltyTier = "silver";

    // Update klant
    await supabaseAdmin.from("klanten").update({
      totaal_diensten: td,
      totaal_omzet: totaalOmzet,
      laatste_dienst_datum: laatsteDienstDatum,
      churn_risico: churnRisico,
      loyalty_tier: loyaltyTier,
      gemiddelde_beoordeling: gemBeoordeling,
    }).eq("id", klant.id);

    updated++;
  }

  return NextResponse.json({
    success: true,
    updated,
    timestamp: new Date().toISOString(),
  });
}
