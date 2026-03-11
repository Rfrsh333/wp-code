import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin as supabase } from "@/lib/supabase";
import { verifyAdmin } from "@/lib/admin-auth";
import { calculateVat } from "@/lib/factuur-config";

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
  try {
    const authHeader = request.headers.get("authorization");
    const cronAuthorized = !!process.env.CRON_SECRET && authHeader === `Bearer ${process.env.CRON_SECRET}`;
    const { isAdmin, email } = await verifyAdmin(request);
    if (!isAdmin && !cronAuthorized) {
      console.warn(`[SECURITY] Unauthorized factuur generate attempt by: ${email || 'unknown'}`);
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
    const btw_bedrag = calculateVat(subtotaal, btw_percentage);
    const totaal = subtotaal + btw_bedrag;

    const urenIds = (uren || []).map((u) => (u as unknown as UrenRegistratie).id);

    const { data: bestaandeFactuurRegels } = await supabase
      .from("factuur_regels")
      .select("uren_registratie_id, factuur_id")
      .in("uren_registratie_id", urenIds);

    if (bestaandeFactuurRegels && bestaandeFactuurRegels.length > 0) {
      return NextResponse.json({ error: "Een deel van deze uren is al gefactureerd" }, { status: 409 });
    }

    const jaar = new Date().getFullYear();
    let factuur_nummer = "";
    let factuur: { id: string } | null = null;
    let factuurInsertError: unknown = null;

    for (let attempt = 0; attempt < 5; attempt += 1) {
      const { count } = await supabase
        .from("facturen")
        .select("*", { count: "exact", head: true })
        .ilike("factuur_nummer", `${jaar}%`);
      factuur_nummer = `${jaar}${String((count || 0) + 1 + attempt).padStart(4, "0")}`;

      const insertResult = await supabase
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

      if (!insertResult.error && insertResult.data) {
        factuur = insertResult.data;
        factuurInsertError = null;
        break;
      }

      factuurInsertError = insertResult.error;
    }

    if (!factuur) throw factuurInsertError;

    const regelsInsert = await supabase.from("factuur_regels").insert(
      regels.map((r) => ({ ...r, factuur_id: factuur.id }))
    );

    if (regelsInsert.error) {
      await supabase.from("facturen").delete().eq("id", factuur.id);
      throw regelsInsert.error;
    }

    const urenUpdate = await supabase
      .from("uren_registraties")
      .update({ status: "gefactureerd" })
      .in("id", urenIds)
      .eq("status", "goedgekeurd");

    if (urenUpdate.error) {
      await supabase.from("factuur_regels").delete().eq("factuur_id", factuur.id);
      await supabase.from("facturen").delete().eq("id", factuur.id);
      throw urenUpdate.error;
    }

    return NextResponse.json({ success: true, factuur });
  } catch (error) {
    console.error("Factuur error:", error);
    return NextResponse.json({ error: "Fout bij genereren factuur" }, { status: 500 });
  }
}
