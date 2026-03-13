import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { verifyAdmin } from "@/lib/admin-auth";

export async function GET(request: NextRequest) {
  const { isAdmin, email } = await verifyAdmin(request);
  if (!isAdmin) {
    console.warn(`[SECURITY] Unauthorized stats access attempt by: ${email || "unknown"}`);
    return NextResponse.json({ error: "Unauthorized - Admin access required" }, { status: 403 });
  }

  // Omzet per maand (laatste 6 maanden)
  const { data: facturen } = await supabaseAdmin
    .from("facturen")
    .select("totaal, created_at")
    .in("status", ["verzonden", "betaald"]);

  const omzetPerMaand: Record<string, number> = {};
  const nu = new Date();
  for (let i = 5; i >= 0; i--) {
    const d = new Date(nu.getFullYear(), nu.getMonth() - i, 1);
    const key = d.toLocaleDateString("nl-NL", { month: "short", year: "2-digit" });
    omzetPerMaand[key] = 0;
  }
  (facturen || []).forEach(f => {
    const d = new Date(f.created_at);
    const key = d.toLocaleDateString("nl-NL", { month: "short", year: "2-digit" });
    if (omzetPerMaand[key] !== undefined) omzetPerMaand[key] += f.totaal;
  });

  // Beste medewerkers (op score)
  const { data: medewerkers } = await supabaseAdmin
    .from("medewerkers")
    .select("naam, gemiddelde_score, aantal_beoordelingen")
    .not("gemiddelde_score", "is", null)
    .order("gemiddelde_score", { ascending: false })
    .limit(5);

  // Totalen
  const [medewerkersResult, klantenResult, dienstenResult, urenResult] = await Promise.allSettled([
    supabaseAdmin.from("medewerkers").select("*", { count: "exact", head: true }).eq("status", "actief"),
    supabaseAdmin.from("klanten").select("*", { count: "exact", head: true }).eq("status", "actief"),
    supabaseAdmin.from("diensten").select("*", { count: "exact", head: true }),
    supabaseAdmin.from("uren_registraties").select("gewerkte_uren").eq("status", "goedgekeurd"),
  ]);

  const totaalMedewerkers = medewerkersResult.status === "fulfilled" ? medewerkersResult.value.count : 0;
  const totaalKlanten = klantenResult.status === "fulfilled" ? klantenResult.value.count : 0;
  const totaalDiensten = dienstenResult.status === "fulfilled" ? dienstenResult.value.count : 0;
  const urenData = urenResult.status === "fulfilled" ? urenResult.value.data : [];

  const totaalUren = (urenData || []).reduce((sum, u) => sum + (u.gewerkte_uren || 0), 0);
  const totaalOmzet = Object.values(omzetPerMaand).reduce((a, b) => a + b, 0);

  // Bezettingsgraad: % diensten die volledig bezet zijn
  const { data: alleDiensten } = await supabaseAdmin
    .from("diensten")
    .select("id, aantal_nodig, status")
    .in("status", ["vol", "open", "bezig"]);
  const { data: aanmeldCounts } = await supabaseAdmin
    .from("dienst_aanmeldingen")
    .select("dienst_id")
    .eq("status", "geaccepteerd");
  const aanmeldMap = new Map<string, number>();
  (aanmeldCounts || []).forEach(a => {
    aanmeldMap.set(a.dienst_id, (aanmeldMap.get(a.dienst_id) || 0) + 1);
  });
  const dienstenArr = alleDiensten || [];
  const bezettingsgraad = dienstenArr.length > 0
    ? Math.round(dienstenArr.reduce((sum, d) => {
        const gevuld = aanmeldMap.get(d.id) || 0;
        return sum + Math.min(gevuld / (d.aantal_nodig || 1), 1);
      }, 0) / dienstenArr.length * 100)
    : 0;

  // Top klanten (omzet)
  const { data: klantFacturen } = await supabaseAdmin
    .from("facturen")
    .select("totaal, klant:klanten(bedrijfsnaam)")
    .in("status", ["verzonden", "betaald"]);
  const klantOmzetMap = new Map<string, { omzet: number; diensten: number }>();
  (klantFacturen || []).forEach(f => {
    const klant = Array.isArray(f.klant) ? f.klant[0] : f.klant;
    const naam = klant?.bedrijfsnaam || "Onbekend";
    const cur = klantOmzetMap.get(naam) || { omzet: 0, diensten: 0 };
    cur.omzet += f.totaal;
    cur.diensten += 1;
    klantOmzetMap.set(naam, cur);
  });
  const topKlanten = [...klantOmzetMap.entries()]
    .map(([naam, d]) => ({ naam, ...d }))
    .sort((a, b) => b.omzet - a.omzet)
    .slice(0, 5);

  // Gemiddelde responstijd (in uren)
  const { data: aanbiedingen } = await supabaseAdmin
    .from("dienst_aanmeldingen")
    .select("aangemeld_at, beoordeeld_at")
    .not("beoordeeld_at", "is", null)
    .order("aangemeld_at", { ascending: false })
    .limit(50);
  let responstijd = 0;
  if (aanbiedingen && aanbiedingen.length > 0) {
    const totaalUrenResp = aanbiedingen.reduce((sum, a) => {
      const diff = new Date(a.beoordeeld_at!).getTime() - new Date(a.aangemeld_at).getTime();
      return sum + diff / (1000 * 60 * 60);
    }, 0);
    responstijd = Math.round(totaalUrenResp / aanbiedingen.length);
  }

  return NextResponse.json({
    omzetPerMaand: Object.entries(omzetPerMaand).map(([maand, omzet]) => ({ maand, omzet })),
    besteMedewerkers: medewerkers || [],
    totalen: { medewerkers: totaalMedewerkers, klanten: totaalKlanten, diensten: totaalDiensten, uren: Math.round(totaalUren), omzet: totaalOmzet },
    bezettingsgraad,
    topKlanten,
    responstijd,
  }, {
    headers: { "Cache-Control": "private, max-age=60, stale-while-revalidate=120" },
  });
}
