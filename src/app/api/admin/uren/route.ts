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
    await supabaseAdmin.from("uren_registraties").update({
      status,
      goedgekeurd_at: new Date().toISOString()
    }).eq("id", id);
  }

  return NextResponse.json({ success: true });
}
