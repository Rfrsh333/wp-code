import { NextRequest, NextResponse } from "next/server";
import { verifyAdmin } from "@/lib/admin-auth";
import { supabaseAdmin } from "@/lib/supabase";

export async function GET(request: NextRequest) {
  const { isAdmin } = await verifyAdmin(request);
  if (!isAdmin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const url = request.nextUrl.searchParams;
  const lead_id = url.get("lead_id");
  const filter = url.get("filter") || "upcoming"; // "upcoming", "overdue", "all"

  let query = supabaseAdmin
    .from("crm_followups")
    .select("*, crm_leads(id, company_name, city, phone)")
    .eq("status", "gepland")
    .order("scheduled_at", { ascending: true });

  if (lead_id) {
    query = query.eq("lead_id", lead_id);
  }

  const now = new Date().toISOString();
  if (filter === "overdue") {
    query = query.lt("scheduled_at", now);
  } else if (filter === "upcoming") {
    // Next 7 days
    const weekFromNow = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
    query = query.gte("scheduled_at", now).lte("scheduled_at", weekFromNow);
  }

  query = query.limit(100);

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ error: "Fout bij ophalen follow-ups" }, { status: 500 });
  }

  // Transform nested lead data
  const followups = (data || []).map((f: Record<string, unknown>) => ({
    ...f,
    lead: f.crm_leads,
    crm_leads: undefined,
  }));

  return NextResponse.json(followups);
}

export async function POST(request: NextRequest) {
  const { isAdmin } = await verifyAdmin(request);
  if (!isAdmin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const { lead_id, scheduled_at, type, notes } = body;

  if (!lead_id || !scheduled_at) {
    return NextResponse.json({ error: "lead_id en scheduled_at zijn verplicht" }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin
    .from("crm_followups")
    .insert({ lead_id, scheduled_at, type: type || "bellen", notes })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: "Fout bij aanmaken follow-up" }, { status: 500 });
  }

  // Update next_followup_at on lead
  await supabaseAdmin
    .from("crm_leads")
    .update({ next_followup_at: scheduled_at })
    .eq("id", lead_id);

  return NextResponse.json(data, { status: 201 });
}

export async function PATCH(request: NextRequest) {
  const { isAdmin } = await verifyAdmin(request);
  if (!isAdmin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const { id, status, scheduled_at } = body;

  if (!id) {
    return NextResponse.json({ error: "id is verplicht" }, { status: 400 });
  }

  const updates: Record<string, unknown> = {};
  if (status) updates.status = status;
  if (scheduled_at) updates.scheduled_at = scheduled_at;

  const { data, error } = await supabaseAdmin
    .from("crm_followups")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: "Update mislukt" }, { status: 500 });
  }

  return NextResponse.json(data);
}
