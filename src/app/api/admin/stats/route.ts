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
  const [{ count: totaalMedewerkers }, { count: totaalKlanten }, { count: totaalDiensten }, { data: urenData }] = await Promise.all([
    supabaseAdmin.from("medewerkers").select("*", { count: "exact", head: true }).eq("status", "actief"),
    supabaseAdmin.from("klanten").select("*", { count: "exact", head: true }).eq("status", "actief"),
    supabaseAdmin.from("diensten").select("*", { count: "exact", head: true }),
    supabaseAdmin.from("uren_registraties").select("gewerkte_uren").eq("status", "goedgekeurd"),
  ]);

  const totaalUren = (urenData || []).reduce((sum, u) => sum + (u.gewerkte_uren || 0), 0);
  const totaalOmzet = Object.values(omzetPerMaand).reduce((a, b) => a + b, 0);

  return NextResponse.json({
    omzetPerMaand: Object.entries(omzetPerMaand).map(([maand, omzet]) => ({ maand, omzet })),
    besteMedewerkers: medewerkers || [],
    totalen: { medewerkers: totaalMedewerkers, klanten: totaalKlanten, diensten: totaalDiensten, uren: Math.round(totaalUren), omzet: totaalOmzet }
  });
}
