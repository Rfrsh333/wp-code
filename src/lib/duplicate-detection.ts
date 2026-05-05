/**
 * Duplicate Detection Utility
 * Vindt mogelijke duplicaten in crm_leads op basis van email, telefoon, domein, company+city, social URLs.
 */

import { supabaseAdmin } from "@/lib/supabase";

export interface DuplicateCandidate {
  lead_id: string;
  company_name: string;
  city: string | null;
  email: string | null;
  phone: string | null;
  match_reasons: string[];
  confidence: "high" | "medium" | "low";
}

interface FindDuplicatesInput {
  email?: string | null;
  phone?: string | null;
  website?: string | null;
  google_maps_url?: string | null;
  company_name?: string | null;
  city?: string | null;
  instagram_url?: string | null;
  facebook_url?: string | null;
  excludeLeadId?: string;
}

/**
 * Normaliseert een telefoonnummer door +31/0 prefix, spaties en streepjes te verwijderen.
 * Retourneert de laatste 9 cijfers (NL mobiel/vast).
 */
export function normalizePhone(phone: string): string {
  let cleaned = phone.replace(/[\s\-().]/g, "");
  if (cleaned.startsWith("+31")) cleaned = cleaned.slice(3);
  if (cleaned.startsWith("0031")) cleaned = cleaned.slice(4);
  if (cleaned.startsWith("0")) cleaned = cleaned.slice(1);
  return cleaned;
}

/**
 * Extraheert het domein uit een email of URL.
 */
export function extractDomain(input: string): string | null {
  if (!input) return null;
  try {
    if (input.includes("@")) {
      return input.split("@")[1]?.toLowerCase().trim() || null;
    }
    let url = input.trim();
    if (!url.startsWith("http")) url = "https://" + url;
    const parsed = new URL(url);
    return parsed.hostname.replace(/^www\./, "").toLowerCase();
  } catch {
    return null;
  }
}

/**
 * Zoekt duplicaten in crm_leads op basis van meerdere criteria.
 */
export async function findDuplicates(input: FindDuplicatesInput): Promise<DuplicateCandidate[]> {
  const candidatesMap = new Map<string, { reasons: string[]; confidence: "high" | "medium" | "low"; data: Record<string, unknown> }>();

  function addCandidate(id: string, reason: string, confidence: "high" | "medium" | "low", data: Record<string, unknown>) {
    const existing = candidatesMap.get(id);
    if (existing) {
      existing.reasons.push(reason);
      // Upgrade confidence if higher
      if (confidence === "high") existing.confidence = "high";
      else if (confidence === "medium" && existing.confidence === "low") existing.confidence = "medium";
    } else {
      candidatesMap.set(id, { reasons: [reason], confidence, data });
    }
  }

  const excludeId = input.excludeLeadId;

  // 1. Exact email match
  if (input.email) {
    const email = input.email.toLowerCase().trim();
    const { data } = await supabaseAdmin
      .from("crm_leads")
      .select("id, company_name, city, email, phone")
      .eq("email", email)
      .is("archived_at", null)
      .is("merged_into", null);

    for (const lead of data || []) {
      if (lead.id !== excludeId) {
        addCandidate(lead.id, "Email match", "high", lead);
      }
    }
  }

  // 2. Normalized phone match
  if (input.phone) {
    const normalizedInput = normalizePhone(input.phone);
    if (normalizedInput.length >= 8) {
      const { data } = await supabaseAdmin
        .from("crm_leads")
        .select("id, company_name, city, email, phone")
        .not("phone", "is", null)
        .is("archived_at", null)
        .is("merged_into", null);

      for (const lead of data || []) {
        if (lead.id !== excludeId && lead.phone) {
          const normalizedLead = normalizePhone(lead.phone);
          if (normalizedLead === normalizedInput) {
            addCandidate(lead.id, "Telefoon match", "high", lead);
          }
        }
      }
    }
  }

  // 3. Website domain match
  if (input.website) {
    const domain = extractDomain(input.website);
    if (domain) {
      const { data } = await supabaseAdmin
        .from("crm_leads")
        .select("id, company_name, city, email, phone, website")
        .not("website", "is", null)
        .is("archived_at", null)
        .is("merged_into", null);

      for (const lead of data || []) {
        if (lead.id !== excludeId && lead.website) {
          const leadDomain = extractDomain(lead.website);
          if (leadDomain === domain) {
            addCandidate(lead.id, "Website domein match", "medium", lead);
          }
        }
      }
    }
  }

  // Also match email domain against website domain
  if (input.email) {
    const emailDomain = extractDomain(input.email);
    if (emailDomain && !["gmail.com", "hotmail.com", "outlook.com", "yahoo.com", "live.nl", "ziggo.nl", "kpnmail.nl"].includes(emailDomain)) {
      const { data } = await supabaseAdmin
        .from("crm_leads")
        .select("id, company_name, city, email, phone, website")
        .not("website", "is", null)
        .is("archived_at", null)
        .is("merged_into", null);

      for (const lead of data || []) {
        if (lead.id !== excludeId && lead.website) {
          const leadDomain = extractDomain(lead.website);
          if (leadDomain === emailDomain) {
            addCandidate(lead.id, "Email domein = website", "medium", lead);
          }
        }
      }
    }
  }

  // 4. Google Maps URL match
  if (input.google_maps_url) {
    const { data } = await supabaseAdmin
      .from("crm_leads")
      .select("id, company_name, city, email, phone")
      .eq("google_maps_url", input.google_maps_url)
      .is("archived_at", null)
      .is("merged_into", null);

    for (const lead of data || []) {
      if (lead.id !== excludeId) {
        addCandidate(lead.id, "Google Maps URL match", "high", lead);
      }
    }
  }

  // 5. Company name + city (case-insensitive)
  if (input.company_name && input.city) {
    const { data } = await supabaseAdmin
      .from("crm_leads")
      .select("id, company_name, city, email, phone")
      .ilike("company_name", input.company_name.trim())
      .ilike("city", input.city.trim())
      .is("archived_at", null)
      .is("merged_into", null);

    for (const lead of data || []) {
      if (lead.id !== excludeId) {
        addCandidate(lead.id, "Bedrijfsnaam + stad match", "medium", lead);
      }
    }
  }

  // 6. Instagram URL match
  if (input.instagram_url) {
    const { data } = await supabaseAdmin
      .from("crm_leads")
      .select("id, company_name, city, email, phone")
      .eq("instagram_url", input.instagram_url)
      .is("archived_at", null)
      .is("merged_into", null);

    for (const lead of data || []) {
      if (lead.id !== excludeId) {
        addCandidate(lead.id, "Instagram URL match", "medium", lead);
      }
    }
  }

  // 7. Facebook URL match
  if (input.facebook_url) {
    const { data } = await supabaseAdmin
      .from("crm_leads")
      .select("id, company_name, city, email, phone")
      .eq("facebook_url", input.facebook_url)
      .is("archived_at", null)
      .is("merged_into", null);

    for (const lead of data || []) {
      if (lead.id !== excludeId) {
        addCandidate(lead.id, "Facebook URL match", "medium", lead);
      }
    }
  }

  // Convert map to array
  return Array.from(candidatesMap.entries()).map(([leadId, entry]) => ({
    lead_id: leadId,
    company_name: (entry.data.company_name as string) || "",
    city: (entry.data.city as string) || null,
    email: (entry.data.email as string) || null,
    phone: (entry.data.phone as string) || null,
    match_reasons: entry.reasons,
    confidence: entry.confidence,
  }));
}
