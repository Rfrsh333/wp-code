import { NextRequest, NextResponse } from "next/server";
import { verifyAdmin } from "@/lib/admin-auth";
import { supabaseAdmin } from "@/lib/supabase";

// POST: Merge two leads (duplicate_id into primary_id)
export async function POST(request: NextRequest) {
  const { isAdmin } = await verifyAdmin(request);
  if (!isAdmin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { primary_id, duplicate_id } = await request.json();

  if (!primary_id || !duplicate_id) {
    return NextResponse.json({ error: "primary_id en duplicate_id zijn verplicht" }, { status: 400 });
  }

  if (primary_id === duplicate_id) {
    return NextResponse.json({ error: "Kan een lead niet met zichzelf mergen" }, { status: 400 });
  }

  // Fetch both leads
  const { data: primary } = await supabaseAdmin
    .from("crm_leads")
    .select("*")
    .eq("id", primary_id)
    .single();

  const { data: duplicate } = await supabaseAdmin
    .from("crm_leads")
    .select("*")
    .eq("id", duplicate_id)
    .single();

  if (!primary || !duplicate) {
    return NextResponse.json({ error: "Een of beide leads niet gevonden" }, { status: 404 });
  }

  // 1. Move contact logs
  await supabaseAdmin
    .from("crm_contact_logs")
    .update({ lead_id: primary_id })
    .eq("lead_id", duplicate_id);

  // 2. Move followups
  await supabaseAdmin
    .from("crm_followups")
    .update({ lead_id: primary_id })
    .eq("lead_id", duplicate_id);

  // 3. Move notes
  await supabaseAdmin
    .from("crm_notes")
    .update({ lead_id: primary_id })
    .eq("lead_id", duplicate_id);

  // 4. Move tags (skip on conflict)
  const { data: dupTags } = await supabaseAdmin
    .from("crm_lead_tags")
    .select("tag_id")
    .eq("lead_id", duplicate_id);

  if (dupTags) {
    for (const tag of dupTags) {
      await supabaseAdmin
        .from("crm_lead_tags")
        .upsert(
          { lead_id: primary_id, tag_id: tag.tag_id },
          { onConflict: "lead_id,tag_id", ignoreDuplicates: true }
        );
    }
    await supabaseAdmin
      .from("crm_lead_tags")
      .delete()
      .eq("lead_id", duplicate_id);
  }

  // 5. Move lead campaigns (skip on conflict)
  const { data: dupCampaigns } = await supabaseAdmin
    .from("crm_lead_campaigns")
    .select("*")
    .eq("lead_id", duplicate_id);

  if (dupCampaigns) {
    for (const lc of dupCampaigns) {
      await supabaseAdmin
        .from("crm_lead_campaigns")
        .upsert(
          {
            lead_id: primary_id,
            campaign_id: lc.campaign_id,
            instantly_lead_email: lc.instantly_lead_email,
            email_status: lc.email_status,
            open_count: lc.open_count,
            reply_count: lc.reply_count,
            click_count: lc.click_count,
            added_at: lc.added_at,
            last_event_at: lc.last_event_at,
          },
          { onConflict: "lead_id,campaign_id", ignoreDuplicates: true }
        );
    }
    await supabaseAdmin
      .from("crm_lead_campaigns")
      .delete()
      .eq("lead_id", duplicate_id);
  }

  // 6. Move instantly events
  await supabaseAdmin
    .from("crm_instantly_events")
    .update({ lead_id: primary_id })
    .eq("lead_id", duplicate_id);

  // 7. Fill empty fields on primary from duplicate
  const fillableFields = [
    "phone", "email", "website", "instagram_url", "facebook_url",
    "google_maps_url", "address", "postal_code", "contact_person",
    "beslisser", "beslisser_functie", "beslisser_mobiel",
  ] as const;

  const updates: Record<string, unknown> = {};
  for (const field of fillableFields) {
    if (!primary[field] && duplicate[field]) {
      updates[field] = duplicate[field];
    }
  }

  // Update channel availability if duplicate has it
  if (!primary.phone_available && duplicate.phone_available) updates.phone_available = true;
  if (!primary.instagram_available && duplicate.instagram_available) updates.instagram_available = true;
  if (!primary.facebook_available && duplicate.facebook_available) updates.facebook_available = true;

  if (Object.keys(updates).length > 0) {
    await supabaseAdmin
      .from("crm_leads")
      .update(updates)
      .eq("id", primary_id);
  }

  // 8. Archive duplicate
  await supabaseAdmin
    .from("crm_leads")
    .update({
      merged_into: primary_id,
      merged_at: new Date().toISOString(),
      archived_at: new Date().toISOString(),
      is_possible_duplicate: false,
    })
    .eq("id", duplicate_id);

  // 9. Create merge contact log on primary
  await supabaseAdmin
    .from("crm_contact_logs")
    .insert({
      lead_id: primary_id,
      type: "notitie",
      notes: `Lead gemerged: "${duplicate.company_name}" (${duplicate.email || "geen email"}) samengevoegd in deze lead.`,
    });

  return NextResponse.json({ success: true, primary_id, duplicate_id });
}
