/**
 * Instantly.ai Event Processor
 * Gedeelde logica voor cron sync + webhook verwerking.
 * CRM blijft source of truth — geen auto-import van nieuwe leads.
 */

import { supabaseAdmin } from "@/lib/supabase";

// Status prioriteit: nooit downgraden
const STATUS_PRIORITY: Record<string, number> = {
  not_sent: 0,
  sent: 1,
  opened: 2,
  clicked: 3,
  auto_reply: 3,
  replied: 4,
  bounced: -1,
  unsubscribed: -1,
};

type ContactLogType =
  | "instantly_sent"
  | "instantly_opened"
  | "instantly_replied"
  | "instantly_bounced"
  | "instantly_clicked"
  | "instantly_auto_reply"
  | "instantly_unsubscribed"
  | "instantly_link_clicked";

export interface InstantlyEvent {
  event_id: string;
  event_type: string;
  email: string;
  campaign_id?: string;
  reply_text?: string;
  payload?: Record<string, unknown>;
}

interface ProcessResult {
  skipped: boolean;
  lead_found: boolean;
  event_type: string;
  email: string;
}

interface BatchResult {
  total: number;
  processed: number;
  skipped: number;
  no_lead: number;
  errors: number;
}

const EVENT_MAP: Record<string, {
  instantly_email_status: string;
  outreach_status_if?: string;
  outreach_status_condition?: string;
  next_best_channel?: string | null;
  contact_log_type: ContactLogType;
  set_email_unavailable?: boolean;
}> = {
  email_sent: {
    instantly_email_status: "sent",
    outreach_status_if: "in_progress",
    outreach_status_condition: "not_started",
    contact_log_type: "instantly_sent",
  },
  email_opened: {
    instantly_email_status: "opened",
    contact_log_type: "instantly_opened",
  },
  reply_received: {
    instantly_email_status: "replied",
    outreach_status_if: "replied",
    next_best_channel: "phone",
    contact_log_type: "instantly_replied",
  },
  auto_reply_received: {
    instantly_email_status: "auto_reply",
    contact_log_type: "instantly_auto_reply",
  },
  email_bounced: {
    instantly_email_status: "bounced",
    contact_log_type: "instantly_bounced",
    set_email_unavailable: true,
  },
  lead_unsubscribed: {
    instantly_email_status: "unsubscribed",
    contact_log_type: "instantly_unsubscribed",
    set_email_unavailable: true,
  },
  link_clicked: {
    instantly_email_status: "clicked",
    next_best_channel: "phone",
    contact_log_type: "instantly_link_clicked",
  },
};

function shouldUpgradeStatus(current: string | null, next: string): boolean {
  const currentPriority = STATUS_PRIORITY[current || "not_sent"] ?? 0;
  const nextPriority = STATUS_PRIORITY[next] ?? 0;
  // Negative priorities (bounced/unsubscribed) always apply
  if (nextPriority < 0) return true;
  return nextPriority > currentPriority;
}

function calculateNextChannelOnBounce(lead: { phone_available: boolean; instagram_available: boolean; facebook_available: boolean }): string {
  if (lead.phone_available) return "phone";
  if (lead.instagram_available) return "instagram";
  if (lead.facebook_available) return "facebook";
  return "none";
}

export async function processInstantlyEvent(event: InstantlyEvent): Promise<ProcessResult> {
  const { event_id, event_type, email, campaign_id, reply_text, payload } = event;

  // Idempotency check
  const { data: existing } = await supabaseAdmin
    .from("crm_instantly_events")
    .select("id")
    .eq("event_id", event_id)
    .maybeSingle();

  if (existing) {
    return { skipped: true, lead_found: false, event_type, email };
  }

  // Find CRM lead by email
  const { data: lead } = await supabaseAdmin
    .from("crm_leads")
    .select("id, instantly_email_status, outreach_status, next_best_channel, phone_available, email_available, instagram_available, facebook_available, email_count, last_email_at")
    .eq("email", email.toLowerCase())
    .is("archived_at", null)
    .maybeSingle();

  // Insert event record
  await supabaseAdmin
    .from("crm_instantly_events")
    .insert({
      event_id,
      event_type,
      lead_id: lead?.id || null,
      email: email.toLowerCase(),
      campaign_id: campaign_id || null,
      payload: payload || null,
      processed: true,
    });

  if (!lead) {
    console.warn(`[instantly-events] No CRM lead found for email: ${email}`);
    return { skipped: false, lead_found: false, event_type, email };
  }

  await applyEventToLead(lead, event_type, reply_text);
  return { skipped: false, lead_found: true, event_type, email };
}

async function applyEventToLead(
  lead: {
    id: string;
    instantly_email_status: string | null;
    outreach_status: string;
    next_best_channel: string | null;
    phone_available: boolean;
    email_available: boolean;
    instagram_available: boolean;
    facebook_available: boolean;
    email_count: number;
    last_email_at: string | null;
  },
  eventType: string,
  replyText?: string,
): Promise<void> {
  const mapping = EVENT_MAP[eventType];
  if (!mapping) {
    console.warn(`[instantly-events] Unknown event type: ${eventType}`);
    return;
  }

  const updates: Record<string, unknown> = {
    instantly_last_event_at: new Date().toISOString(),
  };

  // Status upgrade check
  if (shouldUpgradeStatus(lead.instantly_email_status, mapping.instantly_email_status)) {
    updates.instantly_email_status = mapping.instantly_email_status;
  }

  // Outreach status
  if (mapping.outreach_status_if) {
    if (mapping.outreach_status_condition) {
      if (lead.outreach_status === mapping.outreach_status_condition) {
        updates.outreach_status = mapping.outreach_status_if;
      }
    } else {
      updates.outreach_status = mapping.outreach_status_if;
    }
  }

  // Next best channel
  if (mapping.next_best_channel !== undefined) {
    updates.next_best_channel = mapping.next_best_channel;
  }

  // Email unavailable on bounce/unsub
  if (mapping.set_email_unavailable) {
    updates.email_available = false;
    updates.next_best_channel = calculateNextChannelOnBounce(lead);
  }

  // Event-specific updates
  if (eventType === "email_sent") {
    updates.last_email_at = new Date().toISOString();
    updates.email_count = lead.email_count + 1;
  }

  if (eventType === "reply_received") {
    updates.instantly_last_reply_at = new Date().toISOString();
    if (replyText) {
      updates.instantly_last_reply_text = replyText;
    }
  }

  // Update lead
  await supabaseAdmin
    .from("crm_leads")
    .update(updates)
    .eq("id", lead.id);

  // Create contact log
  await supabaseAdmin
    .from("crm_contact_logs")
    .insert({
      lead_id: lead.id,
      type: mapping.contact_log_type,
      notes: replyText ? `Reply: ${replyText.substring(0, 500)}` : null,
    });
}

export async function processBatchEvents(events: InstantlyEvent[]): Promise<BatchResult> {
  const result: BatchResult = { total: events.length, processed: 0, skipped: 0, no_lead: 0, errors: 0 };

  for (const event of events) {
    try {
      const res = await processInstantlyEvent(event);
      if (res.skipped) {
        result.skipped++;
      } else if (!res.lead_found) {
        result.no_lead++;
      } else {
        result.processed++;
      }
    } catch (err) {
      console.error(`[instantly-events] Error processing event ${event.event_id}:`, err);
      result.errors++;
    }
  }

  return result;
}
