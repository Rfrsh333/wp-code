import { NextRequest, NextResponse } from "next/server";
import { verifyAdmin } from "@/lib/admin-auth";
import { supabaseAdmin } from "@/lib/supabase";

// GET: Campaign detail with leads
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { isAdmin } = await verifyAdmin(request);
  if (!isAdmin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const url = request.nextUrl.searchParams;
  const page = parseInt(url.get("page") || "1");
  const perPage = parseInt(url.get("per_page") || "50");
  const emailStatus = url.get("email_status") || "";
  const search = url.get("search") || "";
  const needsCall = url.get("needs_call") === "true";
  const needsDm = url.get("needs_dm") === "true";
  const hasInstagram = url.get("has_instagram") === "true";

  // Get campaign info
  const { data: campaign, error: campaignError } = await supabaseAdmin
    .from("crm_instantly_campaigns")
    .select("*")
    .eq("id", id)
    .single();

  if (campaignError || !campaign) {
    return NextResponse.json({ error: "Campaign niet gevonden" }, { status: 404 });
  }

  // Build leads query via junction table
  let leadsQuery = supabaseAdmin
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
      lead:crm_leads(
        id, company_name, city, address, phone, email, website,
        instagram_url, facebook_url, google_maps_url,
        status, priority, outreach_status, next_best_channel,
        instantly_email_status, last_call_at, last_email_at,
        last_instagram_dm_at, last_facebook_dm_at,
        phone_available, email_available, instagram_available, facebook_available,
        call_count, email_count, instagram_dm_count, facebook_dm_count,
        contact_person, next_followup_at, tags:crm_lead_tags(tag:crm_tags(*))
      )
    `, { count: "exact" })
    .eq("campaign_id", id);

  if (emailStatus) {
    leadsQuery = leadsQuery.eq("email_status", emailStatus);
  }

  // Pagination
  const from = (page - 1) * perPage;
  const to = from + perPage - 1;
  leadsQuery = leadsQuery
    .order("last_event_at", { ascending: false, nullsFirst: false })
    .range(from, to);

  const { data: leadCampaigns, count, error: leadsError } = await leadsQuery;

  if (leadsError) {
    return NextResponse.json({ error: leadsError.message }, { status: 500 });
  }

  // Post-filter for lead-level filters (search, needs_call, etc.)
  let filtered = leadCampaigns || [];
  if (search) {
    const s = search.toLowerCase();
    filtered = filtered.filter((lc: Record<string, unknown>) => {
      const lead = lc.lead as Record<string, unknown> | null;
      if (!lead) return false;
      return (
        (lead.company_name as string)?.toLowerCase().includes(s) ||
        (lead.city as string)?.toLowerCase().includes(s) ||
        (lead.email as string)?.toLowerCase().includes(s) ||
        (lead.phone as string)?.includes(s)
      );
    });
  }
  if (needsCall) {
    filtered = filtered.filter((lc: Record<string, unknown>) => {
      const lead = lc.lead as Record<string, unknown> | null;
      return lead?.next_best_channel === "phone";
    });
  }
  if (needsDm) {
    filtered = filtered.filter((lc: Record<string, unknown>) => {
      const lead = lc.lead as Record<string, unknown> | null;
      return lead?.next_best_channel === "instagram" || lead?.next_best_channel === "facebook";
    });
  }
  if (hasInstagram) {
    filtered = filtered.filter((lc: Record<string, unknown>) => {
      const lead = lc.lead as Record<string, unknown> | null;
      return lead?.instagram_available === true;
    });
  }

  // Unmatched count
  const { count: unmatchedCount } = await supabaseAdmin
    .from("crm_unmatched_instantly_leads")
    .select("*", { count: "exact", head: true })
    .eq("campaign_id", id)
    .eq("resolution", "pending");

  return NextResponse.json({
    campaign,
    leads: filtered,
    total: count || 0,
    page,
    per_page: perPage,
    unmatched_count: unmatchedCount || 0,
  });
}
