import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { verifyAdmin } from "@/lib/admin-auth";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { isAdmin } = await verifyAdmin(request);
  if (!isAdmin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const { id } = await params;

  // Parallel fetch all data for this medewerker
  const [
    profielRes,
    werkervaringRes,
    vaardighedenRes,
    documentenRes,
    dienstenRes,
    urenRes,
  ] = await Promise.all([
    // Profiel
    supabaseAdmin
      .from("medewerkers")
      .select("id, naam, email, telefoon, functie, uurtarief, status, notities, created_at, profile_photo_url, geboortedatum, stad, adres, postcode, bsn_geverifieerd, factuur_adres, factuur_postcode, factuur_stad, btw_nummer, iban, kor_actief, admin_score_aanwezigheid, admin_score_vaardigheden")
      .eq("id", id)
      .single(),
    // Werkervaring
    supabaseAdmin
      .from("medewerker_werkervaring")
      .select("*")
      .eq("medewerker_id", id)
      .order("start_datum", { ascending: false }),
    // Vaardigheden
    supabaseAdmin
      .from("medewerker_vaardigheden")
      .select("*")
      .eq("medewerker_id", id)
      .order("categorie"),
    // Documenten
    supabaseAdmin
      .from("medewerker_documenten")
      .select("*")
      .eq("medewerker_id", id)
      .order("uploaded_at", { ascending: false }),
    // Diensten (via aanmeldingen)
    supabaseAdmin
      .from("dienst_aanmeldingen")
      .select(`
        id, status, aangemeld_op,
        diensten (
          id, klant_naam, locatie, datum, start_tijd, eind_tijd, functie, uurtarief
        )
      `)
      .eq("medewerker_id", id)
      .order("aangemeld_op", { ascending: false })
      .limit(50),
    // Uren registraties
    supabaseAdmin
      .from("uren_registraties")
      .select(`
        id, gewerkte_uren, status, created_at,
        dienst_aanmeldingen!inner (
          diensten!inner (
            datum, klant_naam, locatie, uurtarief
          )
        )
      `)
      .eq("medewerker_id", id)
      .order("created_at", { ascending: false })
      .limit(100),
  ]);

  if (profielRes.error || !profielRes.data) {
    return NextResponse.json({ error: "Medewerker niet gevonden" }, { status: 404 });
  }

  // Calculate stats
  const totalAanmeldingen = dienstenRes.data?.filter((d) => d.status === "geaccepteerd").length || 0;
  const goedgekeurdeUren = urenRes.data?.filter((u) => u.status === "goedgekeurd") || [];
  const totalUren = goedgekeurdeUren.reduce((sum, u) => sum + (u.gewerkte_uren || 0), 0);
  const opkomstPct = totalAanmeldingen > 0 ? Math.round((goedgekeurdeUren.length / totalAanmeldingen) * 100) : 0;

  // Monthly financials
  const maandMap = new Map<string, { uren: number; verdiensten: number; diensten: number }>();
  for (const u of goedgekeurdeUren) {
    const aanmelding = u.dienst_aanmeldingen as { diensten?: { datum: string; uurtarief?: number } } | null;
    const dienst = aanmelding?.diensten;
    if (!dienst) continue;
    const d = new Date(dienst.datum);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const existing = maandMap.get(key) || { uren: 0, verdiensten: 0, diensten: 0 };
    existing.uren += u.gewerkte_uren || 0;
    existing.verdiensten += (u.gewerkte_uren || 0) * (dienst.uurtarief || 0);
    existing.diensten += 1;
    maandMap.set(key, existing);
  }

  const financieel = Array.from(maandMap.entries())
    .map(([maand, data]) => ({ maand, ...data }))
    .sort((a, b) => b.maand.localeCompare(a.maand));

  const totalVerdiensten = financieel.reduce((sum, m) => sum + m.verdiensten, 0);

  return NextResponse.json({
    profiel: profielRes.data,
    werkervaring: werkervaringRes.data || [],
    vaardigheden: vaardighedenRes.data || [],
    documenten: documentenRes.data || [],
    diensten: dienstenRes.data || [],
    financieel,
    stats: {
      opkomst_percentage: opkomstPct,
      totaal_uren: totalUren,
      totaal_verdiensten: totalVerdiensten,
      totaal_diensten: totalAanmeldingen,
    },
  });
}
