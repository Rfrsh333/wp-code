import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { sendTelegramAlert } from "@/lib/telegram";
import { createHmac } from "crypto";

/**
 * Resend Webhook Handler
 *
 * Tracks email delivery events: delivered, bounced, opened, clicked, complained
 * Handles both:
 * - General email_log tracking (bestaand)
 * - Acquisitie lead engagement scoring (nieuw)
 *
 * Setup in Resend Dashboard:
 * 1. Go to Settings → Webhooks
 * 2. Add webhook URL: https://yourdomain.com/api/webhooks/resend
 * 3. Select events: email.delivered, email.bounced, email.opened, email.clicked, email.complained
 * 4. Copy webhook secret to .env.local as RESEND_WEBHOOK_SECRET
 */

interface ResendWebhookEvent {
  type: "email.sent" | "email.delivered" | "email.delivery_delayed" | "email.complained" | "email.bounced" | "email.opened" | "email.clicked";
  created_at: string;
  data: {
    email_id: string;
    from: string;
    to: string[];
    subject: string;
    created_at: string;
    click?: {
      link: string;
      timestamp: string;
    };
  };
}

interface EmailLogRow {
  id: string;
  opened_at: string | null;
  clicked_at: string | null;
}

// Engagement score punten per event
const ENGAGEMENT_POINTS: Record<string, number> = {
  "email.delivered": 0,
  "email.opened": 5,
  "email.clicked": 15,
  "email.bounced": -20,
  "email.complained": -30,
};

function verifyWebhookSignature(payload: string, signature: string): boolean {
  const secret = process.env.RESEND_WEBHOOK_SECRET;
  if (!secret) {
    console.error("[WEBHOOK] RESEND_WEBHOOK_SECRET niet ingesteld — webhook geweigerd");
    return false;
  }
  const hmac = createHmac("sha256", secret);
  const digest = hmac.update(payload).digest("hex");
  return signature === digest;
}

export async function POST(request: NextRequest) {
  try {
    const signature = request.headers.get("svix-signature") || "";
    const payload = await request.text();

    if (!verifyWebhookSignature(payload, signature)) {
      console.error("[WEBHOOK] Ongeldige signature");
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }

    const event: ResendWebhookEvent = JSON.parse(payload);
    const emailId = event.data.email_id;

    if (!emailId) {
      return NextResponse.json({ received: true, skipped: "no_email_id" });
    }

    console.log(`[WEBHOOK] Resend: ${event.type} voor ${emailId}`);

    // === 1. Bestaande email_log tracking ===
    await handleEmailLog(event);

    // === 2. Acquisitie lead tracking ===
    await handleAcquisitieTracking(event);

    return NextResponse.json({ received: true, type: event.type });
  } catch (error) {
    console.error("[WEBHOOK] Error:", error);
    return NextResponse.json({ error: "Webhook verwerking mislukt" }, { status: 500 });
  }
}

// Bestaande email_log tracking
async function handleEmailLog(event: ResendWebhookEvent) {
  const emailId = event.data.email_id;

  const { data: emailLog } = await supabaseAdmin
    .from("email_log")
    .select("id, opened_at, clicked_at")
    .eq("resend_email_id", emailId)
    .single<EmailLogRow>();

  if (!emailLog) return; // Niet in email_log, skip

  const updates: Record<string, string> = {};

  switch (event.type) {
    case "email.delivered":
      updates.status = "delivered";
      updates.delivered_at = new Date(event.created_at).toISOString();
      break;
    case "email.bounced":
      updates.status = "bounced";
      updates.bounced_at = new Date(event.created_at).toISOString();
      if (event.data.to?.[0]) {
        await supabaseAdmin
          .from("inschrijvingen")
          .update({ email_bounced: true })
          .eq("email", event.data.to[0]);
      }
      break;
    case "email.opened":
      if (!emailLog.opened_at) updates.opened_at = new Date(event.created_at).toISOString();
      break;
    case "email.clicked":
      if (!emailLog.clicked_at) updates.clicked_at = new Date(event.created_at).toISOString();
      break;
    case "email.complained":
      updates.status = "failed";
      break;
  }

  if (Object.keys(updates).length > 0) {
    await supabaseAdmin.from("email_log").update(updates).eq("id", emailLog.id);
  }
}

// Acquisitie engagement tracking
async function handleAcquisitieTracking(event: ResendWebhookEvent) {
  const emailId = event.data.email_id;

  // Zoek contactmoment met dit email_id
  const { data: contactmoment } = await supabaseAdmin
    .from("acquisitie_contactmomenten")
    .select("id, lead_id")
    .eq("email_id", emailId)
    .single();

  if (!contactmoment) return; // Geen acquisitie email

  const leadId = contactmoment.lead_id;

  const { data: lead } = await supabaseAdmin
    .from("acquisitie_leads")
    .select("id, bedrijfsnaam, pipeline_stage, engagement_score, email, tags, auto_sequence_active")
    .eq("id", leadId)
    .single();

  if (!lead) return;

  const currentEngagement = lead.engagement_score || 0;
  const points = ENGAGEMENT_POINTS[event.type] || 0;
  const newEngagement = Math.max(0, currentEngagement + points);

  switch (event.type) {
    case "email.delivered": {
      await supabaseAdmin
        .from("acquisitie_leads")
        .update({ engagement_score: newEngagement })
        .eq("id", leadId);
      break;
    }

    case "email.opened": {
      const updateData: Record<string, unknown> = {
        engagement_score: newEngagement,
        laatste_email_geopend_op: new Date().toISOString(),
      };

      // Auto-stage progressie
      if (lead.pipeline_stage === "nieuw") {
        updateData.pipeline_stage = "benaderd";
      }

      await supabaseAdmin
        .from("acquisitie_leads")
        .update(updateData)
        .eq("id", leadId);

      // Update campagne_leads status
      await supabaseAdmin
        .from("acquisitie_campagne_leads")
        .update({ status: "opened" })
        .eq("lead_id", leadId)
        .eq("status", "sent");

      await incrementCampagneStat(leadId, "emails_opened");
      break;
    }

    case "email.clicked": {
      await supabaseAdmin
        .from("acquisitie_leads")
        .update({ engagement_score: newEngagement })
        .eq("id", leadId);

      await supabaseAdmin
        .from("acquisitie_campagne_leads")
        .update({ status: "clicked" })
        .eq("lead_id", leadId)
        .in("status", ["sent", "opened"]);

      await incrementCampagneStat(leadId, "emails_clicked");
      break;
    }

    case "email.bounced": {
      // Tag als bounced
      const currentTags: string[] = lead.tags || [];
      const updatedTags = currentTags.includes("email-bounced")
        ? currentTags
        : [...currentTags, "email-bounced"];

      await supabaseAdmin
        .from("acquisitie_leads")
        .update({
          engagement_score: newEngagement,
          tags: updatedTags,
        })
        .eq("id", leadId);

      // Stop toekomstige campaign sends
      await supabaseAdmin
        .from("acquisitie_campagne_leads")
        .update({ next_send_date: null })
        .eq("lead_id", leadId)
        .eq("status", "queued");

      await sendTelegramAlert(
        `⚠️ <b>Email bounced</b>\n\n` +
        `Bedrijf: ${lead.bedrijfsnaam}\n` +
        `Email: ${lead.email}\n` +
        `Email gemarkeerd als ongeldig, campagne emails gestopt.`
      );
      break;
    }

    case "email.complained": {
      await supabaseAdmin
        .from("acquisitie_leads")
        .update({
          engagement_score: newEngagement,
          pipeline_stage: "afgewezen",
          auto_sequence_active: false,
        })
        .eq("id", leadId);

      // Stop alles
      await supabaseAdmin
        .from("acquisitie_campagne_leads")
        .update({ next_send_date: null })
        .eq("lead_id", leadId);

      await sendTelegramAlert(
        `🚫 <b>Spam klacht!</b>\n\n` +
        `Bedrijf: ${lead.bedrijfsnaam}\n` +
        `Email: ${lead.email}\n` +
        `Lead afgewezen, alle emails gestopt.`
      );
      break;
    }
  }

  // Hot Lead Alert: engagement stijgt boven 50
  if (newEngagement >= 50 && currentEngagement < 50) {
    await sendTelegramAlert(
      `🔥 <b>Hot Lead!</b>\n\n` +
      `Bedrijf: ${lead.bedrijfsnaam}\n` +
      `Engagement: ${newEngagement}\n` +
      `Stage: ${lead.pipeline_stage}\n\n` +
      `Direct opvolgen!`
    );
  }
}

// Helper: increment campagne stat
async function incrementCampagneStat(leadId: string, field: "emails_opened" | "emails_clicked") {
  const { data: links } = await supabaseAdmin
    .from("acquisitie_campagne_leads")
    .select("campagne_id")
    .eq("lead_id", leadId);

  if (!links) return;

  const campagneIds = [...new Set(links.map((l) => l.campagne_id))];
  for (const campagneId of campagneIds) {
    const { data: campagne } = await supabaseAdmin
      .from("acquisitie_campagnes")
      .select(field)
      .eq("id", campagneId)
      .single();

    if (campagne) {
      await supabaseAdmin
        .from("acquisitie_campagnes")
        .update({ [field]: ((campagne as Record<string, number>)[field] || 0) + 1 })
        .eq("id", campagneId);
    }
  }
}

// Health check
export async function GET() {
  return NextResponse.json({
    status: "ok",
    webhook: "resend",
    tracking: ["email_log", "acquisitie_engagement"],
    events: ["email.delivered", "email.bounced", "email.opened", "email.clicked", "email.complained"],
  });
}
