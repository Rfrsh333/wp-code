import type { CRMLead, OutreachChannel } from "./types";

/**
 * Berekent het volgende beste kanaal op basis van de huidige lead staat.
 * Logica:
 * - Nieuw + telefoon → phone
 * - 1x geen gehoor + IG → instagram
 * - 1x geen gehoor + geen IG + email → email
 * - DM gestuurd + geen reactie + email → email
 * - Email opened/replied → phone
 * - Replied/Interested → phone
 * - Afspraak/testdienst stages → phone (follow-up)
 * - Klant/verloren/geen interesse → none
 * - 5+ pogingen zonder reactie → none (pauze)
 */
export function calculateNextBestChannel(lead: CRMLead): OutreachChannel {
  const {
    outreach_status, status,
    phone_available, email_available, instagram_available, facebook_available,
    call_count, email_count, instagram_dm_count, facebook_dm_count,
  } = lead;

  // Eindstatussen
  if (outreach_status === "not_interested" || outreach_status === "converted" ||
      status === "klant_geworden" || status === "verloren" || status === "geen_interesse") {
    return "none";
  }

  // 5+ pogingen zonder reactie → pauze
  const totalAttempts = call_count + email_count + instagram_dm_count + facebook_dm_count;
  if (totalAttempts >= 5 && outreach_status !== "replied" && outreach_status !== "interested") {
    return "none";
  }

  // Afspraak/testdienst stages → phone follow-up
  if (["afspraak_gepland", "testdienst_ingepland", "testdienst_afgerond", "in_onderhandeling"].includes(status)) {
    return phone_available ? "phone" : email_available ? "email" : "none";
  }

  // Replied/interested → phone voor follow-up
  if (outreach_status === "replied" || outreach_status === "interested") {
    return phone_available ? "phone" : email_available ? "email" : "none";
  }

  // Email opened/replied via Instantly → phone
  if (lead.instantly_email_status === "opened" || lead.instantly_email_status === "replied") {
    return phone_available ? "phone" : "none";
  }

  // Nog niet benaderd → bellen
  if (outreach_status === "not_started") {
    if (phone_available) return "phone";
    if (instagram_available) return "instagram";
    if (email_available) return "email";
    if (facebook_available) return "facebook";
    return "none";
  }

  // Gebeld geen gehoor → Instagram DM (als beschikbaar)
  if (status === "gebeld_geen_gehoor" || (lead.last_call_at && !lead.last_instagram_dm_at && !lead.last_email_at)) {
    if (instagram_available && !lead.last_instagram_dm_at) return "instagram";
    if (facebook_available && !lead.last_facebook_dm_at) return "facebook";
    if (email_available && !lead.last_email_at) return "email";
    return phone_available ? "phone" : "none";
  }

  // DM gestuurd + geen reactie + email beschikbaar → email
  if ((lead.last_instagram_dm_at || lead.last_facebook_dm_at) && !lead.last_email_at) {
    if (email_available) return "email";
    return phone_available ? "phone" : "none";
  }

  // Email gestuurd → bellen
  if (lead.last_email_at && phone_available) {
    return "phone";
  }

  // Fallback
  if (phone_available) return "phone";
  if (email_available) return "email";
  if (instagram_available) return "instagram";
  if (facebook_available) return "facebook";
  return "none";
}
