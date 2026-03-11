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

  if (filter === "klant_goedgekeurd") query = query.eq("status", "klant_goedgekeurd");
  else if (filter === "ingediend") query = query.eq("status", "ingediend");

  const { data } = await query;
  return NextResponse.json({ data });
}

export async function POST(request: NextRequest) {
  // KRITIEK: Verify admin with proper email check
  const { isAdmin, email } = await verifyAdmin(request);
  if (!isAdmin) {
    console.warn(`[SECURITY] Unauthorized uren mutation attempt by: ${email || 'unknown'}`);
    return NextResponse.json({ error: "Unauthorized - Admin access required" }, { status: 403 });
  }

  const { action, id, status } = await request.json();

  if (action === "update_status") {
    const { data: urenRegistratie } = await supabaseAdmin
      .from("uren_registraties")
      .select("status")
      .eq("id", id)
      .single();

    if (!urenRegistratie) {
      return NextResponse.json({ error: "Urenregistratie niet gevonden" }, { status: 404 });
    }

    if (status === "goedgekeurd" && urenRegistratie.status !== "klant_goedgekeurd") {
      return NextResponse.json({ error: "Alleen klant goedgekeurde uren kunnen definitief worden goedgekeurd" }, { status: 400 });
    }

    const payload: { status: string; goedgekeurd_at?: string | null } = { status };
    if (status === "goedgekeurd") {
      payload.goedgekeurd_at = new Date().toISOString();
    } else if (status === "afgewezen") {
      payload.goedgekeurd_at = null;
    }

    await supabaseAdmin.from("uren_registraties").update(payload).eq("id", id);
  }

  return NextResponse.json({ success: true });
}
