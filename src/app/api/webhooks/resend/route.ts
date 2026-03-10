import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { createHmac } from "crypto";

/**
 * Resend Webhook Handler
 *
 * Tracks email delivery events: delivered, bounced, opened, clicked
 *
 * Setup in Resend Dashboard:
 * 1. Go to Settings → Webhooks
 * 2. Add webhook URL: https://yourdomain.com/api/webhooks/resend
 * 3. Select events: email.delivered, email.bounced, email.opened, email.clicked
 * 4. Copy webhook secret to .env.local as RESEND_WEBHOOK_SECRET
 *
 * Docs: https://resend.com/docs/dashboard/webhooks/event-types
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
    // Additional fields vary per event type
    click?: {
      link: string;
      timestamp: string;
    };
  };
}

// Verify webhook signature from Resend
function verifyWebhookSignature(payload: string, signature: string): boolean {
  const secret = process.env.RESEND_WEBHOOK_SECRET;

  if (!secret) {
    console.warn("⚠️ RESEND_WEBHOOK_SECRET not set - webhook signature verification disabled");
    return true; // Allow in dev, but log warning
  }

  const hmac = createHmac("sha256", secret);
  const digest = hmac.update(payload).digest("hex");

  return signature === digest;
}

export async function POST(request: NextRequest) {
  try {
    const signature = request.headers.get("svix-signature") || "";
    const payload = await request.text();

    // Verify webhook is from Resend
    if (!verifyWebhookSignature(payload, signature)) {
      console.error("❌ Invalid webhook signature");
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }

    const event: ResendWebhookEvent = JSON.parse(payload);
    const emailId = event.data.email_id;

    console.log(`📧 Resend webhook: ${event.type} for email ${emailId}`);

    // Find email log entry by Resend email ID
    const { data: emailLog } = await supabaseAdmin
      .from("email_log")
      .select("*")
      .eq("resend_email_id", emailId)
      .single();

    if (!emailLog) {
      console.warn(`⚠️ Email log not found for Resend email ID: ${emailId}`);
      return NextResponse.json({ received: true, skipped: "email_not_found" });
    }

    // Update email_log based on event type
    const updates: Record<string, any> = {};

    switch (event.type) {
      case "email.delivered":
        updates.status = "delivered";
        updates.delivered_at = new Date(event.created_at).toISOString();
        break;

      case "email.bounced":
        updates.status = "bounced";
        updates.bounced_at = new Date(event.created_at).toISOString();
        break;

      case "email.opened":
        // Only set if not already opened (track first open)
        if (!emailLog.opened_at) {
          updates.opened_at = new Date(event.created_at).toISOString();
        }
        break;

      case "email.clicked":
        // Only set if not already clicked (track first click)
        if (!emailLog.clicked_at) {
          updates.clicked_at = new Date(event.created_at).toISOString();
        }
        break;

      case "email.complained":
        // User marked as spam
        updates.status = "failed";
        console.warn(`⚠️ Email ${emailId} marked as spam by recipient`);
        break;

      default:
        console.log(`ℹ️ Ignoring event type: ${event.type}`);
    }

    // Save updates to database
    if (Object.keys(updates).length > 0) {
      const { error } = await supabaseAdmin
        .from("email_log")
        .update(updates)
        .eq("id", emailLog.id);

      if (error) {
        console.error("Database update error:", error);
        return NextResponse.json({ error: "Database error" }, { status: 500 });
      }

      console.log(`✅ Updated email_log for ${emailId}:`, updates);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("Resend webhook error:", error);
    return NextResponse.json({ error: "Webhook processing failed" }, { status: 500 });
  }
}

// Health check endpoint
export async function GET() {
  return NextResponse.json({
    status: "ok",
    webhook: "resend",
    message: "Webhook endpoint is active. Use POST to receive events from Resend.",
  });
}
