import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { verifyAdmin } from "@/lib/admin-auth";

export async function GET(request: NextRequest) {
  // KRITIEK: Verify admin with proper email check
  const { isAdmin, email } = await verifyAdmin(request);
  if (!isAdmin) {
    console.warn(`[SECURITY] Unauthorized diensten access attempt by: ${email || 'unknown'}`);
    return NextResponse.json({ error: "Unauthorized - Admin access required" }, { status: 403 });
  }
  const { data } = await supabaseAdmin.from("diensten").select("*").order("datum", { ascending: true });
  return NextResponse.json({ data });
}

export async function POST(request: NextRequest) {
  // KRITIEK: Verify admin with proper email check
  const { isAdmin, email } = await verifyAdmin(request);
  if (!isAdmin) {
    console.warn(`[SECURITY] Unauthorized diensten mutation attempt by: ${email || 'unknown'}`);
    return NextResponse.json({ error: "Unauthorized - Admin access required" }, { status: 403 });
  }

  const { action, id, dienst_id, data } = await request.json();

  if (action === "create") {
    await supabaseAdmin.from("diensten").insert(data);
  }
  if (action === "update") {
    await supabaseAdmin.from("diensten").update(data).eq("id", id);
  }
  if (action === "delete") {
    await supabaseAdmin.from("diensten").delete().eq("id", id);
  }
  if (action === "get_aanmeldingen") {
    const { data: aanmeldingen } = await supabaseAdmin
      .from("dienst_aanmeldingen")
      .select("*, medewerker:medewerkers(naam, email, telefoon)")
      .eq("dienst_id", dienst_id)
      .order("aangemeld_at", { ascending: true });
    return NextResponse.json({ data: aanmeldingen });
  }
  if (action === "update_aanmelding") {
    await supabaseAdmin
      .from("dienst_aanmeldingen")
      .update({ status: data.status, beoordeeld_at: new Date().toISOString() })
      .eq("id", id);
  }

  return NextResponse.json({ success: true });
}
