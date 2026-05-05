import { NextRequest, NextResponse } from "next/server";
import { verifyAdmin } from "@/lib/admin-auth";
import { supabaseAdmin } from "@/lib/supabase";

// GET: List campaigns a lead is in (via crm_lead_campaigns junction)
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { isAdmin } = await verifyAdmin(request);
  if (!isAdmin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  const { data, error } = await supabaseAdmin
    .from("crm_lead_campaigns")
    .select(`
      id,
      lead_id,
      campaign_id,
      instantly_lead_email,
      email_status,
      open_count,
      reply_count,
      click_count,
      added_at,
      last_event_at,
      campaign:crm_instantly_campaigns(id, name, status, instantly_campaign_id)
    `)
    .eq("lead_id", id)
    .order("last_event_at", { ascending: false, nullsFirst: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json(data || []);
}
