/**
 * Instantly.ai API v2 Client
 * Documentatie: https://developer.instantly.ai/
 * Base URL: https://api.instantly.ai/api/v2
 */

const BASE_URL = "https://api.instantly.ai/api/v2";

function getApiKey(): string {
  const key = process.env.INSTANTLY_API_KEY;
  if (!key) throw new Error("INSTANTLY_API_KEY is niet geconfigureerd");
  return key;
}

function headers() {
  return {
    Authorization: `Bearer ${getApiKey()}`,
    "Content-Type": "application/json",
  };
}

// --- Lead Status Mapping ---
// Instantly: 1=Active, 2=Paused, 3=Completed, -1=Bounced, -2=Unsubscribed, -3=Skipped
export function mapInstantlyStatus(status: number): string {
  switch (status) {
    case 1: return "sent";
    case 2: return "sent"; // paused = still sent
    case 3: return "replied"; // completed
    case -1: return "bounced";
    case -2: return "unsubscribed";
    case -3: return "sent"; // skipped
    default: return "not_sent";
  }
}

// --- Campaigns ---

export interface InstantlyCampaign {
  id: string;
  name: string;
  status: number;
  timestamp_created?: string;
}

export async function listCampaigns(): Promise<InstantlyCampaign[]> {
  const res = await fetch(`${BASE_URL}/campaigns?limit=100`, { headers: headers() });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Instantly campaigns ophalen mislukt: ${res.status} ${text}`);
  }
  const data = await res.json();
  return data.items || data || [];
}

export async function getCampaignAnalytics(campaignId: string): Promise<Record<string, unknown>> {
  const res = await fetch(`${BASE_URL}/campaigns/${campaignId}/analytics/overview`, { headers: headers() });
  if (!res.ok) throw new Error(`Campaign analytics mislukt: ${res.status}`);
  return res.json();
}

// --- Leads ---

export interface InstantlyLead {
  id?: string;
  email: string;
  first_name?: string;
  last_name?: string;
  company_name?: string;
  phone?: string;
  website?: string;
  status?: number;
  email_open_count?: number;
  email_reply_count?: number;
  email_click_count?: number;
  campaign_id?: string;
  campaign_name?: string;
  timestamp_created?: string;
}

export async function getLeadsByEmail(email: string): Promise<InstantlyLead[]> {
  const res = await fetch(`${BASE_URL}/leads/list`, {
    method: "POST",
    headers: headers(),
    body: JSON.stringify({ contacts: [email], limit: 10 }),
  });
  if (!res.ok) throw new Error(`Lead ophalen mislukt: ${res.status}`);
  const data = await res.json();
  return data.items || [];
}

export async function getCampaignLeads(campaignId: string, limit = 100, startingAfter?: string): Promise<{ items: InstantlyLead[]; next_starting_after?: string }> {
  const body: Record<string, unknown> = {
    campaign: campaignId,
    limit: Math.min(limit, 100),
  };
  if (startingAfter) body.starting_after = startingAfter;

  const res = await fetch(`${BASE_URL}/leads/list`, {
    method: "POST",
    headers: headers(),
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Campaign leads ophalen mislukt: ${res.status} ${text}`);
  }
  const data = await res.json();
  return {
    items: data.items || [],
    next_starting_after: data.next_starting_after || undefined,
  };
}

export async function addLeadsToCampaign(campaignId: string, leads: Array<{
  email: string;
  first_name?: string;
  last_name?: string;
  company_name?: string;
  phone?: string;
  website?: string;
  custom_variables?: Record<string, string>;
}>): Promise<{ added: number; errors?: string[] }> {
  const res = await fetch(`${BASE_URL}/leads`, {
    method: "POST",
    headers: headers(),
    body: JSON.stringify({
      campaign_id: campaignId,
      leads: leads.slice(0, 1000), // Max 1000 per request
    }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Leads toevoegen mislukt: ${res.status} ${text}`);
  }
  return res.json();
}

// --- Sync utility ---

/**
 * Haalt de status van leads op uit een Instantly campaign en retourneert
 * een mapping van email -> status info
 */
export async function syncCampaignStatuses(campaignId: string): Promise<Map<string, {
  status: string;
  opens: number;
  replies: number;
  clicks: number;
}>> {
  const results = new Map<string, { status: string; opens: number; replies: number; clicks: number }>();
  let cursor: string | undefined = undefined;
  let hasMore = true;

  while (hasMore) {
    const result = await getCampaignLeads(campaignId, 100, cursor);
    for (const lead of result.items) {
      if (lead.email) {
        let status = "sent";
        if ((lead.email_reply_count || 0) > 0) status = "replied";
        else if ((lead.email_open_count || 0) > 0) status = "opened";
        else if (lead.status && lead.status < 0) status = mapInstantlyStatus(lead.status);

        results.set(lead.email.toLowerCase(), {
          status,
          opens: lead.email_open_count || 0,
          replies: lead.email_reply_count || 0,
          clicks: lead.email_click_count || 0,
        });
      }
    }
    if (result.next_starting_after) {
      cursor = result.next_starting_after;
    } else {
      hasMore = false;
    }
  }

  return results;
}
