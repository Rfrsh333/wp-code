import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin as supabase } from "@/lib/supabase-admin";

export async function POST(request: NextRequest) {
  try {
    const { klant_id, periode_start, periode_eind } = await request.json();

    // Haal goedgekeurde uren op voor deze klant in deze periode
    const { data: uren } = await supabase
      .from("uren_registraties")
      .select(`
        id, gewerkte_uren, start_tijd, eind_tijd,
        aanmelding:dienst_aanmeldingen!inner(
          medewerker:medewerkers(naam),
          dienst:diensten!inner(datum, klant_naam, locatie, uurtarief, klant_id)
        )
      `)
      .eq("status", "goedgekeurd")
      .eq("aanmelding.dienst.klant_id", klant_id)
      .gte("aanmelding.dienst.datum", periode_start)
      .lte("aanmelding.dienst.datum", periode_eind);

    if (!uren || uren.length === 0) {
      return NextResponse.json({ error: "Geen goedgekeurde uren gevonden" }, { status: 404 });
    }

    // Bereken totalen
    let subtotaal = 0;
    const regels = uren.map((u: any) => {
      const bedrag = u.gewerkte_uren * (u.aanmelding?.dienst?.uurtarief || 0);
      subtotaal += bedrag;
      return {
        uren_registratie_id: u.id,
        omschrijving: `${u.aanmelding?.dienst?.locatie} - ${u.aanmelding?.medewerker?.naam}`,
        datum: u.aanmelding?.dienst?.datum,
        medewerker_naam: u.aanmelding?.medewerker?.naam,
        uren: u.gewerkte_uren,
        uurtarief: u.aanmelding?.dienst?.uurtarief,
        reiskosten: 0,
        bedrag,
      };
    });

    const btw_percentage = 21;
    const btw_bedrag = Math.round(subtotaal * btw_percentage) / 100;
    const totaal = subtotaal + btw_bedrag;

    // Genereer factuurnummer
    const jaar = new Date().getFullYear();
    const { count } = await supabase.from("facturen").select("*", { count: "exact", head: true }).ilike("factuur_nummer", `${jaar}%`);
    const factuur_nummer = `${jaar}${String((count || 0) + 1).padStart(4, "0")}`;

    // Maak factuur aan
    const { data: factuur, error } = await supabase
      .from("facturen")
      .insert({
        factuur_nummer,
        klant_id,
        periode_start,
        periode_eind,
        subtotaal,
        btw_percentage,
        btw_bedrag,
        totaal,
      })
      .select()
      .single();

    if (error) throw error;

    // Voeg regels toe
    await supabase.from("factuur_regels").insert(
      regels.map((r: any) => ({ ...r, factuur_id: factuur.id }))
    );

    // Update uren status naar gefactureerd
    await supabase
      .from("uren_registraties")
      .update({ status: "gefactureerd" })
      .in("id", uren.map((u: any) => u.id));

    return NextResponse.json({ success: true, factuur });
  } catch (error) {
    console.error("Factuur error:", error);
    return NextResponse.json({ error: "Fout bij genereren factuur" }, { status: 500 });
  }
}
