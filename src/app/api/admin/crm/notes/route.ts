import { NextRequest, NextResponse } from "next/server";
import { verifyAdmin } from "@/lib/admin-auth";
import { supabaseAdmin } from "@/lib/supabase";

export async function GET(request: NextRequest) {
  const { isAdmin } = await verifyAdmin(request);
  if (!isAdmin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const lead_id = request.nextUrl.searchParams.get("lead_id");

  if (!lead_id) {
    return NextResponse.json({ error: "lead_id is verplicht" }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin
    .from("crm_notes")
    .select("*")
    .eq("lead_id", lead_id)
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) {
    return NextResponse.json({ error: "Fout bij ophalen notities" }, { status: 500 });
  }

  return NextResponse.json(data || []);
}

export async function POST(request: NextRequest) {
  const { isAdmin } = await verifyAdmin(request);
  if (!isAdmin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const { lead_id, content } = body;

  if (!lead_id || !content) {
    return NextResponse.json({ error: "lead_id en content zijn verplicht" }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin
    .from("crm_notes")
    .insert({ lead_id, content })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: "Fout bij aanmaken notitie" }, { status: 500 });
  }

  return NextResponse.json(data, { status: 201 });
}
