import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { verifyAdmin } from "@/lib/admin-auth";
import { syncDienstenKlantIds } from "@/lib/klanten-sync";

export async function GET(request: NextRequest) {
  // KRITIEK: Verify admin with proper email check
  const { isAdmin, email } = await verifyAdmin(request);
  if (!isAdmin) {
    console.warn(`[SECURITY] Unauthorized facturen access attempt by: ${email || 'unknown'}`);
    return NextResponse.json({ error: "Unauthorized - Admin access required" }, { status: 403 });
  }

  // Return regels for a specific factuur
  const regelsId = request.nextUrl.searchParams.get("regels");
  if (regelsId) {
    const { data: regels } = await supabaseAdmin
      .from("factuur_regels")
      .select("*")
      .eq("factuur_id", regelsId)
      .order("datum", { ascending: true })
      .limit(500);
    return NextResponse.json({ regels });
  }

  await syncDienstenKlantIds();

  const [{ data: facturen }, { data: klanten }] = await Promise.all([
    supabaseAdmin.from("facturen").select("*, klant:klanten(bedrijfsnaam, email)").order("created_at", { ascending: false }).limit(500),
    supabaseAdmin.from("klanten").select("id, bedrijfsnaam").eq("status", "actief").limit(500),
  ]);

  return NextResponse.json({ facturen, klanten });
}
