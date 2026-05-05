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
    .from("crm_leads")
    .select("*, crm_lead_tags(tag_id, crm_tags(id, name, color))")
    .eq("id", id)
    .single();

  if (error || !data) {
    return NextResponse.json({ error: "Lead niet gevonden" }, { status: 404 });
  }

  const leadTags = data.crm_lead_tags as Array<{ tag_id: string; crm_tags: { id: string; name: string; color: string } }> | null;
  const lead = {
    ...data,
    tags: leadTags?.map(lt => lt.crm_tags).filter(Boolean) || [],
    crm_lead_tags: undefined,
  };

  return NextResponse.json(lead);
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { isAdmin } = await verifyAdmin(request);
  if (!isAdmin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await request.json();

  // Remove fields that shouldn't be directly updated
  const { id: _id, created_at: _ca, updated_at: _ua, crm_lead_tags: _lt, tags: _t, ...updates } = body;

  const { data, error } = await supabaseAdmin
    .from("crm_leads")
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

  const { error } = await supabaseAdmin
    .from("crm_leads")
    .delete()
    .eq("id", id);

  if (error) {
    return NextResponse.json({ error: "Verwijderen mislukt" }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
