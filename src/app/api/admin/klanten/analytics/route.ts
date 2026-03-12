import { NextRequest, NextResponse } from "next/server";
import { verifyAdmin } from "@/lib/admin-auth";
import { supabaseAdmin } from "@/lib/supabase";

export async function GET(request: NextRequest) {
  const { isAdmin } = await verifyAdmin(request);
  if (!isAdmin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Haal alle klanten op met loyalty velden
  const { data: klanten, error } = await supabaseAdmin
    .from("klanten")
    .select("id, bedrijfsnaam, contactpersoon, email, telefoon, stad, loyalty_tier, totaal_diensten, totaal_omzet, laatste_dienst_datum, churn_risico, notities, gemiddelde_beoordeling")
    .order("totaal_omzet", { ascending: false })
    .limit(500);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Bereken samenvattende stats
  const totaalKlanten = klanten?.length || 0;
  const actieveKlanten = klanten?.filter(k => {
    if (!k.laatste_dienst_datum) return false;
    const dagen = Math.floor((Date.now() - new Date(k.laatste_dienst_datum).getTime()) / (1000 * 60 * 60 * 24));
    return dagen <= 30;
  }).length || 0;

  const churnHoog = klanten?.filter(k => k.churn_risico === "hoog").length || 0;
  const churnMiddel = klanten?.filter(k => k.churn_risico === "middel").length || 0;

  const tierCounts = {
    standaard: klanten?.filter(k => k.loyalty_tier === "standaard").length || 0,
    silver: klanten?.filter(k => k.loyalty_tier === "silver").length || 0,
    gold: klanten?.filter(k => k.loyalty_tier === "gold").length || 0,
    platinum: klanten?.filter(k => k.loyalty_tier === "platinum").length || 0,
  };

  const totaalOmzet = klanten?.reduce((sum, k) => sum + (Number(k.totaal_omzet) || 0), 0) || 0;

  return NextResponse.json({
    klanten: klanten || [],
    stats: {
      totaal_klanten: totaalKlanten,
      actieve_klanten: actieveKlanten,
      churn_hoog: churnHoog,
      churn_middel: churnMiddel,
      tiers: tierCounts,
      totaal_omzet: totaalOmzet,
    },
  }, {
    headers: { "Cache-Control": "private, max-age=30, stale-while-revalidate=60" },
  });
}
