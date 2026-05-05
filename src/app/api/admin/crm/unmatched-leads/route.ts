import { NextRequest, NextResponse } from "next/server";
import { verifyAdmin } from "@/lib/admin-auth";
import { supabaseAdmin } from "@/lib/supabase";

// GET: List unmatched leads
export async function GET(request: NextRequest) {
  const { isAdmin } = await verifyAdmin(request);
  if (!isAdmin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const url = request.nextUrl.searchParams;
  const campaignId = url.get("campaign_id") || "";
  const resolution = url.get("resolution") || "pending";
  const page = parseInt(url.get("page") || "1");
  const perPage = parseInt(url.get("per_page") || "50");

  let query = supabaseAdmin
    .from("crm_unmatched_instantly_leads")
    .select("*, campaign:crm_instantly_campaigns(id, name)", { count: "exact" })
    .eq("resolution", resolution)
    .order("created_at", { ascending: false });

  if (campaignId) {
    query = query.eq("campaign_id", campaignId);
  }

  const from = (page - 1) * perPage;
  const to = from + perPage - 1;
  query = query.range(from, to);

  const { data, count, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ leads: data, total: count || 0, page, per_page: perPage });
}

// POST: Resolve unmatched lead
export async function POST(request: NextRequest) {
  const { isAdmin } = await verifyAdmin(request);
  if (!isAdmin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const { id, action, lead_id } = body as { id: string; action: string; lead_id?: string };

  if (!id || !action) {
    return NextResponse.json({ error: "id en action zijn verplicht" }, { status: 400 });
  }

  // Get unmatched lead
  const { data: unmatched } = await supabaseAdmin
    .from("crm_unmatched_instantly_leads")
    .select("*")
    .eq("id", id)
    .single();

  if (!unmatched) {
    return NextResponse.json({ error: "Unmatched lead niet gevonden" }, { status: 404 });
  }

  if (action === "match" && lead_id) {
    // Link to existing lead
    await supabaseAdmin
      .from("crm_lead_campaigns")
      .upsert(
        {
          lead_id,
          campaign_id: unmatched.campaign_id,
          instantly_lead_email: unmatched.email,
          email_status: unmatched.email_status || "not_sent",
          open_count: unmatched.open_count || 0,
          reply_count: unmatched.reply_count || 0,
          click_count: unmatched.click_count || 0,
          last_event_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        { onConflict: "lead_id,campaign_id" }
      );

    await supabaseAdmin
      .from("crm_unmatched_instantly_leads")
      .update({
        resolution: "matched",
        matched_lead_id: lead_id,
        resolved_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", id);

    return NextResponse.json({ success: true, resolution: "matched" });
  }

  if (action === "create") {
    // Find or create "Instantly unmatched imports" lead list
    let { data: leadList } = await supabaseAdmin
      .from("crm_lead_lists")
      .select("id")
      .eq("name", "Instantly unmatched imports")
      .maybeSingle();

    if (!leadList) {
      const { data: newList } = await supabaseAdmin
        .from("crm_lead_lists")
        .insert({
          name: "Instantly unmatched imports",
          description: "Automatisch aangemaakt voor unmatched Instantly leads",
          source: "instantly",
        })
        .select("id")
        .single();
      leadList = newList;
    }

    // Create new CRM lead
    const { data: newLead, error: createError } = await supabaseAdmin
      .from("crm_leads")
      .insert({
        company_name: unmatched.company_name || unmatched.email,
        email: unmatched.email,
        phone: unmatched.phone || null,
        website: unmatched.website || null,
        contact_person: [unmatched.first_name, unmatched.last_name].filter(Boolean).join(" ") || null,
        source_type: "instantly",
        lead_list_id: leadList?.id || null,
        status: "nieuw",
        category: "restaurant",
        email_available: true,
        phone_available: !!unmatched.phone,
        instagram_available: false,
        facebook_available: false,
        outreach_status: "in_progress",
        instantly_email_status: unmatched.email_status || "sent",
        call_count: 0,
        email_count: 0,
        instagram_dm_count: 0,
        facebook_dm_count: 0,
      })
      .select("id")
      .single();

    if (createError || !newLead) {
      return NextResponse.json({ error: createError?.message || "Aanmaken mislukt" }, { status: 500 });
    }

    // Link to campaign
    await supabaseAdmin
      .from("crm_lead_campaigns")
      .upsert(
        {
          lead_id: newLead.id,
          campaign_id: unmatched.campaign_id,
          instantly_lead_email: unmatched.email,
          email_status: unmatched.email_status || "not_sent",
          open_count: unmatched.open_count || 0,
          reply_count: unmatched.reply_count || 0,
          click_count: unmatched.click_count || 0,
          last_event_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        { onConflict: "lead_id,campaign_id" }
      );

    await supabaseAdmin
      .from("crm_unmatched_instantly_leads")
      .update({
        resolution: "created",
        matched_lead_id: newLead.id,
        resolved_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", id);

    return NextResponse.json({ success: true, resolution: "created", lead_id: newLead.id });
  }

  if (action === "ignore") {
    await supabaseAdmin
      .from("crm_unmatched_instantly_leads")
      .update({
        resolution: "ignored",
        resolved_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", id);

    return NextResponse.json({ success: true, resolution: "ignored" });
  }

  return NextResponse.json({ error: "Onbekende actie" }, { status: 400 });
}
