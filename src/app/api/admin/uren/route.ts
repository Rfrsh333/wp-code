import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { verifyAdmin } from "@/lib/admin-auth";

export async function GET(request: NextRequest) {
  // KRITIEK: Verify admin with proper email check
  const { isAdmin, email } = await verifyAdmin(request);
  if (!isAdmin) {
    console.warn(`[SECURITY] Unauthorized uren access attempt by: ${email || 'unknown'}`);
    return NextResponse.json({ error: "Unauthorized - Admin access required" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const filter = searchParams.get("filter") || "alle";

  let query = supabaseAdmin
    .from("uren_registraties")
    .select("*, aanmelding:dienst_aanmeldingen(medewerker:medewerkers(naam, email), dienst:diensten(klant_naam, datum, locatie, uurtarief))")
    .order("created_at", { ascending: false });

  if (filter === "goedgekeurd") query = query.eq("status", "goedgekeurd");
  else if (filter === "klant_goedgekeurd") query = query.eq("status", "klant_goedgekeurd");
  else if (filter === "ingediend") query = query.eq("status", "ingediend");

  const { data } = await query.limit(500);
  return NextResponse.json({ data });
}

export async function POST(request: NextRequest) {
  // KRITIEK: Verify admin with proper email check
  const { isAdmin, email } = await verifyAdmin(request);
  if (!isAdmin) {
    console.warn(`[SECURITY] Unauthorized uren mutation attempt by: ${email || 'unknown'}`);
    return NextResponse.json({ error: "Unauthorized - Admin access required" }, { status: 403 });
  }

  const { action, id, status, data } = await request.json();

  if (action === "update_status") {
    const { data: urenRegistratie } = await supabaseAdmin
      .from("uren_registraties")
      .select("status, aanmelding:dienst_aanmeldingen(dienst:diensten(klant_id))")
      .eq("id", id)
      .single();

    if (!urenRegistratie) {
      return NextResponse.json({ error: "Urenregistratie niet gevonden" }, { status: 404 });
    }

    if (status === "goedgekeurd" && !["ingediend", "klant_goedgekeurd"].includes(urenRegistratie.status)) {
      return NextResponse.json({ error: "Alleen ingediende of klant goedgekeurde uren kunnen definitief worden goedgekeurd" }, { status: 400 });
    }

    const payload: { status: string; goedgekeurd_at?: string | null } = { status };
    if (status === "goedgekeurd") {
      payload.goedgekeurd_at = new Date().toISOString();
    } else if (status === "afgewezen") {
      payload.goedgekeurd_at = null;
    }

    await supabaseAdmin.from("uren_registraties").update(payload).eq("id", id);

    if (status === "goedgekeurd") {
      const aanmelding = Array.isArray(urenRegistratie.aanmelding)
        ? urenRegistratie.aanmelding[0]
        : urenRegistratie.aanmelding;
      const dienst = Array.isArray(aanmelding?.dienst)
        ? aanmelding?.dienst[0]
        : aanmelding?.dienst;
      const klantId = dienst?.klant_id;

      if (klantId) {
        await supabaseAdmin
          .from("klanten")
          .update({ eerste_goedkeuring: new Date().toISOString().split("T")[0] })
          .eq("id", klantId)
          .is("eerste_goedkeuring", null);
      }
    }
  }

  if (action === "adjust") {
    const { data: urenRegistratie } = await supabaseAdmin
      .from("uren_registraties")
      .select("status, start_tijd, eind_tijd, pauze_minuten, gewerkte_uren, reiskosten_km, reiskosten_bedrag")
      .eq("id", id)
      .single();

    if (!urenRegistratie) {
      return NextResponse.json({ error: "Urenregistratie niet gevonden" }, { status: 404 });
    }

    if (!["ingediend", "klant_goedgekeurd"].includes(urenRegistratie.status)) {
      return NextResponse.json({ error: "Deze urenregistratie kan niet meer worden aangepast" }, { status: 400 });
    }

    await supabaseAdmin.from("uren_registraties").update({
      status: "klant_aangepast",
      klant_start_tijd: data.start_tijd,
      klant_eind_tijd: data.eind_tijd,
      klant_pauze_minuten: data.pauze_minuten,
      klant_gewerkte_uren: data.gewerkte_uren,
      klant_reiskosten_km: data.reiskosten_km,
      klant_reiskosten_bedrag: data.reiskosten_bedrag,
      klant_opmerking: data.opmerking || null,
      goedgekeurd_at: null,
    }).eq("id", id);
  }

  return NextResponse.json({ success: true });
}
