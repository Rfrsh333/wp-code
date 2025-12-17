import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { createClient } from "@supabase/supabase-js";

async function verifyAdmin(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) return false;
  const token = authHeader.split(" ")[1];
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
  const { data: { user } } = await supabase.auth.getUser(token);
  return !!user;
}

export async function GET(request: NextRequest) {
  if (!await verifyAdmin(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
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
  if (!await verifyAdmin(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
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
