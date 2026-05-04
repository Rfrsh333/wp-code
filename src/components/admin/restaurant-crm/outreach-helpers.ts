import type { CRMLead, OutreachChannel } from "./types";

/**
 * Berekent het volgende beste kanaal op basis van de huidige lead staat.
 * Workflow: Bel eerst → geen gehoor → Instagram DM → e-mail → opnieuw bellen
 */
export function calculateNextBestChannel(lead: CRMLead): OutreachChannel {
  const { outreach_status, phone_available, email_available, instagram_available, facebook_available } = lead;

  // Eindstatussen
  if (outreach_status === "not_interested" || outreach_status === "converted") {
    return "none";
  }

  // Als replied/interested → phone voor follow-up
  if (outreach_status === "replied" || outreach_status === "interested") {
    return phone_available ? "phone" : email_available ? "email" : "none";
  }

  // Nog niet benaderd → bellen
  if (outreach_status === "not_started") {
    if (phone_available) return "phone";
    if (instagram_available) return "instagram";
    if (email_available) return "email";
    if (facebook_available) return "facebook";
    return "none";
  }

  // Gebeld geen gehoor → Instagram DM
  if (lead.status === "gebeld_geen_gehoor" || (lead.last_call_at && !lead.last_instagram_dm_at)) {
    if (instagram_available && !lead.last_instagram_dm_at) return "instagram";
    if (facebook_available && !lead.last_facebook_dm_at) return "facebook";
    if (email_available && !lead.last_email_at) return "email";
    return phone_available ? "phone" : "none";
  }

  // Instagram DM gestuurd → email
  if (lead.last_instagram_dm_at && !lead.last_email_at) {
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
