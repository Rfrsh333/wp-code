/**
 * ReachIQ-adapter voor TopTalent Jobs.
 *
 * Pusht een acquisitie-lead + AI-gegenereerde cold-intro email naar ReachIQ:
 *   1. POST /v1/contacts  — upsert op email (idempotent) met AVG-velden
 *   2. POST /v1/campaigns/{id}/enroll — inschrijven op de horeca-campagne
 *
 * Auth: X-API-Key via REACHIQ_API_KEY. Instance via REACHIQ_BASE_URL,
 * campagne via REACHIQ_CAMPAIGN_ID. Zonder die env doet de route niets.
 */

import { generateOutreachEmail } from "@/lib/agents/outreach-email";

const BASE_URL = process.env.REACHIQ_BASE_URL?.replace(/\/+$/, "");
const API_KEY  = process.env.REACHIQ_API_KEY;
const CAMPAIGN_ID = process.env.REACHIQ_CAMPAIGN_ID;

export function isReachiqConfigured(): boolean {
  return Boolean(BASE_URL && API_KEY && CAMPAIGN_ID);
}

export interface ReachiqLeadInput {
  email: string;
  bedrijfsnaam: string;
  contactpersoon?: string | null;
  branche?: string | null;
  stad?: string | null;
  ai_score?: number | null;
  pain_points?: string[] | null;
  personalisatie_notities?: string | null;
  emails_verzonden_count?: number;
}

export interface ReachiqPushResult {
  ok: boolean;
  contactId?: string;
  enrolled?: number;
  emailSubject?: string;
  error?: string;
}

interface RiqResponse {
  ok: boolean;
  status: number;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  json: any;
  error?: string;
}

async function riqPost(path: string, body: unknown): Promise<RiqResponse> {
  try {
    const res = await fetch(`${BASE_URL}${path}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-API-Key": API_KEY as string,
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(15_000),
    });
    const text = await res.text();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let json: any = null;
    try { json = text ? JSON.parse(text) : null; } catch { /* non-JSON */ }
    if (!res.ok) {
      const detail = json?.detail || json?.error || `HTTP ${res.status}`;
      return { ok: false, status: res.status, json, error: String(detail) };
    }
    return { ok: true, status: res.status, json };
  } catch (e) {
    return { ok: false, status: 0, json: null, error: e instanceof Error ? e.message : "fetch-fout" };
  }
}

/**
 * Genereer een gepersonaliseerde cold-intro email via AI en push de lead naar
 * ReachIQ. De sequence-template in ReachIQ rendert {{ai_subject}}/{{ai_body}}
 * (stap 1), gevolgd door 2 vaste follow-up stappen.
 */
export async function pushLeadToReachiq(lead: ReachiqLeadInput): Promise<ReachiqPushResult> {
  if (!isReachiqConfigured()) {
    return {
      ok: false,
      error: "ReachIQ niet geconfigureerd (REACHIQ_BASE_URL/API_KEY/CAMPAIGN_ID ontbreken)",
    };
  }

  if (!lead.email) {
    return { ok: false, error: "Lead heeft geen emailadres" };
  }

  // 1. AI-draft genereren voor de eerste email (cold_intro)
  let emailSubject = `TopTalent Jobs – Horeca personeel voor ${lead.bedrijfsnaam}`;
  let emailBody = "";
  try {
    const draft = await generateOutreachEmail({
      type: "cold_intro",
      bedrijfsnaam: lead.bedrijfsnaam,
      contactpersoon: lead.contactpersoon || null,
      branche: lead.branche || "horeca",
      stad: lead.stad || null,
      pain_points: lead.pain_points || [],
      personalisatie_notities: lead.personalisatie_notities || null,
      eerdere_emails_count: lead.emails_verzonden_count ?? 0,
      laatste_contact_type: null,
    });
    emailSubject = draft.onderwerp;
    emailBody = draft.inhoud;
  } catch {
    // Fallback: stuur zonder AI-draft, ReachIQ gebruikt de standaard template
    emailBody = `Beste ${lead.contactpersoon || ""},\n\nTopTalent Jobs levert snel gescreend horecapersoneel in Utrecht en omgeving. Interesse in een vrijblijvend gesprek?\n\nMet vriendelijke groet,\nTopTalent Jobs`;
  }

  const customFields: Record<string, string> = {
    ai_subject: emailSubject,
    ai_body: emailBody,
  };
  if (lead.ai_score != null) {
    customFields.ai_score = String(lead.ai_score);
  }
  if (lead.stad) {
    customFields.stad = lead.stad;
  }
  if (lead.branche) {
    customFields.branche = lead.branche;
  }

  // 2. Contact upserten in ReachIQ
  const contact = await riqPost("/v1/contacts", {
    email: lead.email,
    first_name: lead.contactpersoon || undefined,
    company: lead.bedrijfsnaam,
    industry: lead.branche || undefined,
    target_country: "NL",
    legal_basis: "legitimate_interest",
    provenance_source: "toptalent:acquisitie",
    list_name: "TopTalent – Horeca Campagne",
    custom_fields: customFields,
  });

  if (!contact.ok) {
    return { ok: false, error: `Contact-upsert mislukt: ${contact.error}` };
  }

  const contactId = contact.json?.id as string | undefined;
  if (!contactId) {
    return { ok: false, error: "ReachIQ gaf geen contact-id terug" };
  }

  // 3. Inschrijven op de horeca-campagne
  const enroll = await riqPost(`/v1/campaigns/${CAMPAIGN_ID}/enroll`, {
    contact_ids: [contactId],
  });

  if (!enroll.ok) {
    return { ok: false, contactId, error: `Enrollen mislukt: ${enroll.error}` };
  }

  const enrolled = enroll.json?.summary?.enrolled as number | undefined;
  return { ok: true, contactId, enrolled: enrolled ?? 0, emailSubject };
}
