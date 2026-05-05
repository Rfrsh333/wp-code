/**
 * Campaign Sync Logic
 * Synct Instantly campagnes en leads naar lokale crm_instantly_campaigns en crm_lead_campaigns tabellen.
 * Unmatched leads worden opgeslagen in crm_unmatched_instantly_leads voor handmatige review.
 */

import { supabaseAdmin } from "@/lib/supabase";
import { listCampaigns, getCampaignLeads, mapInstantlyStatus } from "@/lib/instantly";
import type { InstantlyLead } from "@/lib/instantly";

interface SyncResult {
  campaigns_synced: number;
  leads_matched: number;
  leads_unmatched: number;
  errors: string[];
}

/**
 * Sync alle Instantly campagnes naar crm_instantly_campaigns
 */
export async function syncCampaigns(): Promise<{ synced: number; errors: string[] }> {
  const errors: string[] = [];
  const campaigns = await listCampaigns();

  for (const campaign of campaigns) {
    try {
      await supabaseAdmin
        .from("crm_instantly_campaigns")
        .upsert(
          {
            instantly_campaign_id: campaign.id,
            name: campaign.name,
            status: campaign.status ?? 0,
            last_synced_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
          { onConflict: "instantly_campaign_id" }
        );
    } catch (err) {
      errors.push(`Campaign ${campaign.id}: ${err instanceof Error ? err.message : "Unknown error"}`);
    }
  }

  return { synced: campaigns.length, errors };
}

/**
 * Bepaal email_status op basis van Instantly lead data
 */
function determineEmailStatus(lead: InstantlyLead): string {
  if ((lead.email_reply_count || 0) > 0) return "replied";
  if ((lead.email_click_count || 0) > 0) return "clicked";
  if ((lead.email_open_count || 0) > 0) return "opened";
  if (lead.status !== undefined && lead.status < 0) return mapInstantlyStatus(lead.status);
  if (lead.status !== undefined && lead.status >= 1) return "sent";
  return "not_sent";
}

/**
 * Sync leads van een specifieke campagne.
 * Matched leads -> crm_lead_campaigns, unmatched -> crm_unmatched_instantly_leads
 */
export async function syncCampaignLeads(
  campaignDbId: string,
  instantlyCampaignId: string
): Promise<{ matched: number; unmatched: number; errors: string[] }> {
  const errors: string[] = [];
  let matched = 0;
  let unmatched = 0;

  // Fetch all leads from Instantly (cursor-based pagination)
  const allLeads: InstantlyLead[] = [];
  let cursor: string | undefined = undefined;
  let hasMore = true;

  while (hasMore) {
    const result = await getCampaignLeads(instantlyCampaignId, 100, cursor);
    allLeads.push(...result.items);
    if (result.next_starting_after) {
      cursor = result.next_starting_after;
    } else {
      hasMore = false;
    }
  }

  for (const instantlyLead of allLeads) {
    if (!instantlyLead.email) continue;
    const email = instantlyLead.email.toLowerCase().trim();
    const emailStatus = determineEmailStatus(instantlyLead);

    try {
      // Try to match against crm_leads by email
      const { data: crmLead } = await supabaseAdmin
        .from("crm_leads")
        .select("id")
        .eq("email", email)
        .is("archived_at", null)
        .is("merged_into", null)
        .maybeSingle();

      if (crmLead) {
        // Matched: upsert into crm_lead_campaigns
        await supabaseAdmin
          .from("crm_lead_campaigns")
          .upsert(
            {
              lead_id: crmLead.id,
              campaign_id: campaignDbId,
              instantly_lead_email: email,
              email_status: emailStatus,
              open_count: instantlyLead.email_open_count || 0,
              reply_count: instantlyLead.email_reply_count || 0,
              click_count: instantlyLead.email_click_count || 0,
              last_event_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            },
            { onConflict: "lead_id,campaign_id" }
          );
        matched++;
      } else {
        // Unmatched: upsert into crm_unmatched_instantly_leads
        await supabaseAdmin
          .from("crm_unmatched_instantly_leads")
          .upsert(
            {
              campaign_id: campaignDbId,
              email,
              first_name: instantlyLead.first_name || null,
              last_name: instantlyLead.last_name || null,
              company_name: instantlyLead.company_name || null,
              phone: instantlyLead.phone || null,
              website: instantlyLead.website || null,
              email_status: emailStatus,
              open_count: instantlyLead.email_open_count || 0,
              reply_count: instantlyLead.email_reply_count || 0,
              click_count: instantlyLead.email_click_count || 0,
              updated_at: new Date().toISOString(),
            },
            { onConflict: "campaign_id,email" }
          );
        unmatched++;
      }
    } catch (err) {
      errors.push(`Lead ${email}: ${err instanceof Error ? err.message : "Unknown error"}`);
    }
  }

  // Recalculate aggregate stats on campaign
  await recalculateCampaignStats(campaignDbId);

  return { matched, unmatched, errors };
}

/**
 * Herbereken de aggregate stats op een campaign op basis van crm_lead_campaigns + crm_unmatched_instantly_leads
 */
async function recalculateCampaignStats(campaignDbId: string): Promise<void> {
  // Count from crm_lead_campaigns
  const { data: lcStats } = await supabaseAdmin
    .from("crm_lead_campaigns")
    .select("email_status")
    .eq("campaign_id", campaignDbId);

  // Count from crm_unmatched_instantly_leads (pending only)
  const { data: umStats } = await supabaseAdmin
    .from("crm_unmatched_instantly_leads")
    .select("email_status")
    .eq("campaign_id", campaignDbId)
    .eq("resolution", "pending");

  const allStatuses = [...(lcStats || []), ...(umStats || [])].map(r => r.email_status);
  const total = allStatuses.length;
  const sent = allStatuses.filter(s => s !== "not_sent").length;
  const opened = allStatuses.filter(s => ["opened", "clicked", "replied"].includes(s)).length;
  const replied = allStatuses.filter(s => s === "replied").length;
  const bounced = allStatuses.filter(s => s === "bounced").length;
  const unsubs = allStatuses.filter(s => s === "unsubscribed").length;
  const clicked = allStatuses.filter(s => s === "clicked").length;

  await supabaseAdmin
    .from("crm_instantly_campaigns")
    .update({
      total_leads: total,
      leads_sent: sent,
      leads_opened: opened,
      leads_replied: replied,
      leads_bounced: bounced,
      leads_unsubscribed: unsubs,
      leads_clicked: clicked,
      last_synced_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", campaignDbId);
}

/**
 * Full sync: sync campagnes + leads voor alle campagnes
 */
export async function fullCampaignSync(): Promise<SyncResult> {
  const result: SyncResult = {
    campaigns_synced: 0,
    leads_matched: 0,
    leads_unmatched: 0,
    errors: [],
  };

  // Step 1: Sync campaigns
  const campaignResult = await syncCampaigns();
  result.campaigns_synced = campaignResult.synced;
  result.errors.push(...campaignResult.errors);

  // Step 2: Get all campaigns from DB
  const { data: campaigns } = await supabaseAdmin
    .from("crm_instantly_campaigns")
    .select("id, instantly_campaign_id");

  if (!campaigns) return result;

  // Step 3: Sync leads for each campaign
  for (const campaign of campaigns) {
    try {
      const leadResult = await syncCampaignLeads(campaign.id, campaign.instantly_campaign_id);
      result.leads_matched += leadResult.matched;
      result.leads_unmatched += leadResult.unmatched;
      result.errors.push(...leadResult.errors);
    } catch (err) {
      result.errors.push(`Campaign leads sync ${campaign.instantly_campaign_id}: ${err instanceof Error ? err.message : "Unknown error"}`);
    }
  }

  return result;
}
