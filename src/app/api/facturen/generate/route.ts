import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin as supabase } from "@/lib/supabase";
import { verifyAdmin } from "@/lib/admin-auth";

type UrenRegistratie = {
  id: string;
  gewerkte_uren: number;
  start_tijd: string;
  eind_tijd: string;
  aanmelding: {
    medewerker: { naam: string } | null;
    dienst: { datum: string; klant_naam: string; locatie: string; uurtarief: number; klant_id: string } | null;
  } | null;
};

type FactuurRegel = {
  uren_registratie_id: string;
  omschrijving: string;
  datum: string;
  medewerker_naam: string;
  uren: number;
  uurtarief: number;
  reiskosten: number;
  bedrag: number;
  factuur_id?: string;
};

export async function POST(request: NextRequest) {
  // KRITIEK: Dit endpoint was publiek toegankelijk - alleen admins mogen facturen genereren
  const { isAdmin, email } = await verifyAdmin(request);
  if (!isAdmin) {
    console.warn(`[SECURITY] Unauthorized factuur generate attempt by: ${email || 'unknown'}`);
    return NextResponse.json({ error: "Unauthorized - Admin access required" }, { status: 403 });
  }

  try {
    const authHeader = request.headers.get("authorization");
    const cronAuthorized = !!process.env.CRON_SECRET && authHeader === `Bearer ${process.env.CRON_SECRET}`;
    const { isAdmin } = await verifyAdmin(request);
    if (!isAdmin && !cronAuthorized) {
      return NextResponse.json({ error: "Unauthorized - Admin access required" }, { status: 403 });
    }

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
    const regels = (uren || []).map((u): FactuurRegel => {
      const typedU = u as unknown as UrenRegistratie;
      const bedrag = typedU.gewerkte_uren * (typedU.aanmelding?.dienst?.uurtarief || 0);
      subtotaal += bedrag;
      return {
        uren_registratie_id: typedU.id,
        omschrijving: `${typedU.aanmelding?.dienst?.locatie || ''} - ${typedU.aanmelding?.medewerker?.naam || ''}`,
        datum: typedU.aanmelding?.dienst?.datum || '',
        medewerker_naam: typedU.aanmelding?.medewerker?.naam || '',
        uren: typedU.gewerkte_uren,
        uurtarief: typedU.aanmelding?.dienst?.uurtarief || 0,
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
      regels.map((r) => ({ ...r, factuur_id: factuur.id }))
    );

    // Update uren status naar gefactureerd
    await supabase
      .from("uren_registraties")
      .update({ status: "gefactureerd" })
      .in("id", (uren || []).map((u) => (u as unknown as UrenRegistratie).id));

    return NextResponse.json({ success: true, factuur });
  } catch (error) {
    console.error("Factuur error:", error);
    return NextResponse.json({ error: "Fout bij genereren factuur" }, { status: 500 });
  }
}
