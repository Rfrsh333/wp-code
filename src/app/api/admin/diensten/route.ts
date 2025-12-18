import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
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
  const { data } = await supabaseAdmin.from("diensten").select("*").order("datum", { ascending: true });
  return NextResponse.json({ data });
}

export async function POST(request: NextRequest) {
  if (!await verifyAdmin(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
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
