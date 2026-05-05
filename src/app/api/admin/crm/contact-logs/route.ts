import { NextRequest, NextResponse } from "next/server";
import { verifyAdmin } from "@/lib/admin-auth";
import { supabaseAdmin } from "@/lib/supabase";

export async function GET(request: NextRequest) {
  const { isAdmin } = await verifyAdmin(request);
  if (!isAdmin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const url = request.nextUrl.searchParams;
  const lead_id = url.get("lead_id");
  const limit = Math.min(parseInt(url.get("limit") || "50"), 200);

  if (!lead_id) {
    return NextResponse.json({ error: "lead_id is verplicht" }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin
    .from("crm_contact_logs")
    .select("*")
    .eq("lead_id", lead_id)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    return NextResponse.json({ error: "Fout bij ophalen logs" }, { status: 500 });
  }

  return NextResponse.json(data || []);
}

export async function POST(request: NextRequest) {
  const { isAdmin } = await verifyAdmin(request);
  if (!isAdmin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const { lead_id, type, notes, action_key, previous_state, new_state } = body;

  if (!lead_id || !type) {
    return NextResponse.json({ error: "lead_id en type zijn verplicht" }, { status: 400 });
  }

  const insertData: Record<string, unknown> = { lead_id, type, notes };
  if (action_key) insertData.action_key = action_key;
  if (previous_state) insertData.previous_state = previous_state;
  if (new_state) insertData.new_state = new_state;

  const { data, error } = await supabaseAdmin
    .from("crm_contact_logs")
    .insert(insertData)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: "Fout bij aanmaken log" }, { status: 500 });
  }

  // Update last_contacted_at on the lead
  await supabaseAdmin
    .from("crm_leads")
    .update({ last_contacted_at: new Date().toISOString() })
    .eq("id", lead_id);

  return NextResponse.json(data, { status: 201 });
}
