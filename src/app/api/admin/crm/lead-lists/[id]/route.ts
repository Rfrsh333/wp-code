import { NextRequest, NextResponse } from "next/server";
import { verifyAdmin } from "@/lib/admin-auth";
import { supabaseAdmin } from "@/lib/supabase";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { isAdmin } = await verifyAdmin(request);
  if (!isAdmin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  const { data, error } = await supabaseAdmin
    .from("crm_lead_lists")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !data) {
    return NextResponse.json({ error: "Leadlijst niet gevonden" }, { status: 404 });
  }

  // Get actual counts
  const { data: leads } = await supabaseAdmin
    .from("crm_leads")
    .select("outreach_status")
    .eq("lead_list_id", id);

  if (leads) {
    data.lead_count = leads.length;
    data.contacted_count = leads.filter(l => l.outreach_status && l.outreach_status !== "not_started").length;
    data.replied_count = leads.filter(l => l.outreach_status === "replied").length;
    data.interested_count = leads.filter(l => l.outreach_status === "interested").length;
    data.customer_count = leads.filter(l => l.outreach_status === "converted").length;
  }

  return NextResponse.json(data);
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { isAdmin } = await verifyAdmin(request);
  if (!isAdmin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await request.json();

  const allowedFields = ["name", "description", "city", "archived_at"];
  const updates: Record<string, unknown> = {};
  for (const key of Object.keys(body)) {
    if (allowedFields.includes(key)) {
      updates[key] = body[key];
    }
  }
  updates.updated_at = new Date().toISOString();

  const { data, error } = await supabaseAdmin
    .from("crm_lead_lists")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: "Update mislukt" }, { status: 500 });
  }

  return NextResponse.json(data);
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { isAdmin } = await verifyAdmin(request);
  if (!isAdmin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  // Check if list has leads
  const { count } = await supabaseAdmin
    .from("crm_leads")
    .select("*", { count: "exact", head: true })
    .eq("lead_list_id", id);

  if (count && count > 0) {
    return NextResponse.json({ error: "Kan lijst niet verwijderen: bevat nog leads" }, { status: 400 });
  }

  const { error } = await supabaseAdmin
    .from("crm_lead_lists")
    .delete()
    .eq("id", id);

  if (error) {
    return NextResponse.json({ error: "Verwijderen mislukt" }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
