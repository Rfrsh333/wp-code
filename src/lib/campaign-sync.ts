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

  if (campaigns.length > 0) {
    const rows = campaigns.map(c => ({
      instantly_campaign_id: c.id,
      name: c.name,
      status: c.status ?? 0,
      last_synced_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }));

    const { error } = await supabaseAdmin
      .from("crm_instantly_campaigns")
      .upsert(rows, { onConflict: "instantly_campaign_id" });

    if (error) errors.push(`Campaign upsert: ${error.message}`);
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
 * Sync leads van een specifieke campagne (batch-optimized).
 * Matched leads -> crm_lead_campaigns, unmatched -> crm_unmatched_instantly_leads
 */
export async function syncCampaignLeads(
  campaignDbId: string,
  instantlyCampaignId: string
): Promise<{ matched: number; unmatched: number; errors: string[] }> {
  const errors: string[] = [];

  // Step 1: Fetch all leads from Instantly (cursor-based pagination)
  const allLeads: InstantlyLead[] = [];
  let cursor: string | undefined = undefined;
  let hasMore = true;

  while (hasMore) {
    const result = await getCampaignLeads(instantlyCampaignId, 100, cursor);
    allLeads.push(...result.items);
    if (result.next_starting_after && result.items.length > 0) {
      cursor = result.next_starting_after;
    } else {
      hasMore = false;
    }
  }

  if (allLeads.length === 0) {
    await recalculateCampaignStats(campaignDbId);
    return { matched: 0, unmatched: 0, errors };
  }

  // Step 2: Collect all emails and batch-lookup CRM leads
  const emailsSet = new Set<string>();
  for (const lead of allLeads) {
    if (lead.email) emailsSet.add(lead.email.toLowerCase().trim());
  }
  const allEmails = Array.from(emailsSet);

  // Batch fetch matching CRM leads (chunks of 500 to stay within Supabase limits)
  const emailToLeadId = new Map<string, string>();
  for (let i = 0; i < allEmails.length; i += 500) {
    const chunk = allEmails.slice(i, i + 500);
    const { data: crmLeads } = await supabaseAdmin
      .from("crm_leads")
      .select("id, email")
      .in("email", chunk)
      .is("archived_at", null)
      .is("merged_into", null);

    if (crmLeads) {
      for (const cl of crmLeads) {
        if (cl.email) emailToLeadId.set(cl.email.toLowerCase().trim(), cl.id);
      }
    }
  }

  // Step 3: Split into matched and unmatched, build batch rows
  const now = new Date().toISOString();
  const matchedRows: Record<string, unknown>[] = [];
  const unmatchedRows: Record<string, unknown>[] = [];
  const seenMatched = new Set<string>();
  const seenUnmatched = new Set<string>();

  for (const instantlyLead of allLeads) {
    if (!instantlyLead.email) continue;
    const email = instantlyLead.email.toLowerCase().trim();
    const emailStatus = determineEmailStatus(instantlyLead);
    const crmLeadId = emailToLeadId.get(email);

    if (crmLeadId) {
      const key = `${crmLeadId}_${campaignDbId}`;
      if (seenMatched.has(key)) continue;
      seenMatched.add(key);

      matchedRows.push({
        lead_id: crmLeadId,
        campaign_id: campaignDbId,
        instantly_lead_email: email,
        email_status: emailStatus,
        open_count: instantlyLead.email_open_count || 0,
        reply_count: instantlyLead.email_reply_count || 0,
        click_count: instantlyLead.email_click_count || 0,
        last_event_at: now,
        updated_at: now,
      });
    } else {
      const key = `${campaignDbId}_${email}`;
      if (seenUnmatched.has(key)) continue;
      seenUnmatched.add(key);

      unmatchedRows.push({
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
        updated_at: now,
      });
    }
  }

  // Step 4: Batch upsert matched leads (chunks of 500)
  for (let i = 0; i < matchedRows.length; i += 500) {
    const chunk = matchedRows.slice(i, i + 500);
    const { error } = await supabaseAdmin
      .from("crm_lead_campaigns")
      .upsert(chunk, { onConflict: "lead_id,campaign_id" });
    if (error) errors.push(`Matched upsert batch ${i}: ${error.message}`);
  }

  // Step 5: Batch upsert unmatched leads (chunks of 500)
  for (let i = 0; i < unmatchedRows.length; i += 500) {
    const chunk = unmatchedRows.slice(i, i + 500);
    const { error } = await supabaseAdmin
      .from("crm_unmatched_instantly_leads")
      .upsert(chunk, { onConflict: "campaign_id,email" });
    if (error) errors.push(`Unmatched upsert batch ${i}: ${error.message}`);
  }

  // Step 6: Recalculate aggregate stats
  await recalculateCampaignStats(campaignDbId);

  return { matched: matchedRows.length, unmatched: unmatchedRows.length, errors };
}

/**
 * Herbereken de aggregate stats op een campaign op basis van crm_lead_campaigns + crm_unmatched_instantly_leads
 */
async function recalculateCampaignStats(campaignDbId: string): Promise<void> {
  const { data: lcStats } = await supabaseAdmin
    .from("crm_lead_campaigns")
    .select("email_status")
    .eq("campaign_id", campaignDbId);

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
