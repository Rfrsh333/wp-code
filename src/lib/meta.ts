/**
 * Meta Graph API Configuration & Helpers
 *
 * Handles Meta (Facebook/Instagram) API configuration for Instagram Inbox Sync.
 * Currently only used for connection testing. Full inbox sync is planned for later.
 *
 * TODO (toekomstige implementatie):
 * - Instagram conversations ophalen via GET /{ig-account-id}/conversations
 * - Messages ophalen via GET /{conversation-id}/messages
 * - Inbound replies matchen aan crm_leads (op basis van IG username/account)
 * - Webhook endpoint toevoegen voor real-time message notifications
 * - Contactlogs aanmaken bij nieuwe replies
 * - outreach_status naar "replied" zetten bij inbound messages
 * - next_best_channel naar "phone" zetten bij replies
 *
 * BELANGRIJK: Geen automatische DM-verzending implementeren.
 * Alleen inbound message sync (lezen, niet schrijven).
 */

const META_GRAPH_VERSION = "v23.0";
const META_GRAPH_BASE = "https://graph.facebook.com";

export interface MetaConfig {
  appId: string;
  appSecret: string;
  pageId: string;
  pageAccessToken: string;
  igAccountId: string;
  webhookVerifyToken: string;
}

export interface MetaConfigStatus {
  hasAppId: boolean;
  hasAppSecret: boolean;
  hasPageId: boolean;
  hasPageAccessToken: boolean;
  hasIgAccountId: boolean;
  hasWebhookVerifyToken: boolean;
  isComplete: boolean;
}

/**
 * Leest Meta configuratie uit environment variables.
 * Gooit GEEN errors - retourneert wat beschikbaar is.
 */
export function getMetaConfig(): Partial<MetaConfig> {
  return {
    appId: process.env.META_APP_ID || undefined,
    appSecret: process.env.META_APP_SECRET || undefined,
    pageId: process.env.META_PAGE_ID || undefined,
    pageAccessToken: process.env.META_PAGE_ACCESS_TOKEN || undefined,
    igAccountId: process.env.META_IG_ACCOUNT_ID || undefined,
    webhookVerifyToken: process.env.META_WEBHOOK_VERIFY_TOKEN || undefined,
  };
}

/**
 * Valideert of alle verplichte Meta config aanwezig is.
 * Retourneert status per veld zonder de waarden te exposen.
 */
export function validateMetaConfig(): MetaConfigStatus {
  const config = getMetaConfig();
  const status: MetaConfigStatus = {
    hasAppId: Boolean(config.appId),
    hasAppSecret: Boolean(config.appSecret),
    hasPageId: Boolean(config.pageId),
    hasPageAccessToken: Boolean(config.pageAccessToken),
    hasIgAccountId: Boolean(config.igAccountId),
    hasWebhookVerifyToken: Boolean(config.webhookVerifyToken),
    isComplete: false,
  };
  status.isComplete = status.hasAppId && status.hasAppSecret && status.hasPageId
    && status.hasPageAccessToken && status.hasIgAccountId && status.hasWebhookVerifyToken;
  return status;
}

/**
 * Bouwt een volledige Meta Graph API URL.
 * Voegt GEEN access token toe aan de URL (doe dat in de fetch call).
 */
export function getMetaGraphUrl(path: string, params?: Record<string, string>): string {
  const url = new URL(`${META_GRAPH_BASE}/${META_GRAPH_VERSION}/${path.replace(/^\//, "")}`);
  if (params) {
    for (const [key, value] of Object.entries(params)) {
      url.searchParams.set(key, value);
    }
  }
  return url.toString();
}

/**
 * Voert een authenticated GET request uit naar de Meta Graph API.
 * Access token wordt als query parameter meegegeven (Meta standaard).
 */
export async function metaGraphGet<T = Record<string, unknown>>(
  path: string,
  params?: Record<string, string>
): Promise<T> {
  const config = getMetaConfig();
  if (!config.pageAccessToken) {
    throw new Error("META_PAGE_ACCESS_TOKEN is niet geconfigureerd");
  }

  const url = getMetaGraphUrl(path, {
    ...params,
    access_token: config.pageAccessToken,
  });

  const res = await fetch(url);
  if (!res.ok) {
    const error = await res.json().catch(() => ({ error: { message: "Unknown error" } }));
    const message = error?.error?.message || `Meta API fout: ${res.status}`;
    throw new Error(message);
  }

  return res.json() as Promise<T>;
}
