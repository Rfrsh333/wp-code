import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { getMedewerkerSession } from "@/lib/portal-auth";

export async function GET(request: NextRequest) {
  const medewerker = await getMedewerkerSession(request);
  if (!medewerker) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data } = await supabaseAdmin
    .from("certificeringen")
    .select("id, medewerker_id, naam, uitgever, behaald_op, verloopt_op, created_at")
    .eq("medewerker_id", medewerker.id)
    .order("created_at", { ascending: false })
    .limit(50);

  return NextResponse.json({ certificeringen: data || [] });
}

export async function POST(request: NextRequest) {
  const medewerker = await getMedewerkerSession(request);
  if (!medewerker) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { action, id, data } = await request.json();

  if (action === "create") {
    if (!data?.naam?.trim()) {
      return NextResponse.json({ error: "Naam is verplicht" }, { status: 400 });
    }

    const { error } = await supabaseAdmin.from("certificeringen").insert({
      medewerker_id: medewerker.id,
      naam: data.naam.trim(),
      uitgever: data.uitgever || null,
      behaald_op: data.behaald_op || null,
      verloopt_op: data.verloopt_op || null,
    });

    if (error) {
      return NextResponse.json({ error: "Kon certificering niet opslaan" }, { status: 500 });
    }
  }

  if (action === "delete") {
    await supabaseAdmin
      .from("certificeringen")
      .delete()
      .eq("id", id)
      .eq("medewerker_id", medewerker.id);
  }

  return NextResponse.json({ success: true });
}
