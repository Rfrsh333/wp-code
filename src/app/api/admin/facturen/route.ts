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

  await syncDienstenKlantIds();

  const [{ data: facturen }, { data: klanten }] = await Promise.all([
    supabaseAdmin.from("facturen").select("*, klant:klanten(bedrijfsnaam, email)").order("created_at", { ascending: false }),
    supabaseAdmin.from("klanten").select("id, bedrijfsnaam").eq("status", "actief"),
  ]);

  return NextResponse.json({ facturen, klanten });
}
