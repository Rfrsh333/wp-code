import { NextRequest, NextResponse } from "next/server";
import { processInstantlyEvent } from "@/lib/instantly-events";

export async function POST(request: NextRequest) {
  // Verify webhook secret
  const webhookSecret = process.env.INSTANTLY_WEBHOOK_SECRET;
  const headerSecret = request.headers.get("x-webhook-secret");

  if (!webhookSecret || headerSecret !== webhookSecret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();

    const eventType = body.event_type || body.event || body.type;
    const email = body.email || body.lead_email || body.to;
    const eventId = body.event_id || body.id || `webhook_${eventType}_${email}_${Date.now()}`;
    const campaignId = body.campaign_id || body.campaign;
    const replyText = body.reply_text || body.reply || body.text || body.body;

    if (!eventType || !email) {
      // Unknown format, log and return 200 to avoid retries
      console.warn("[instantly-webhook] Missing event_type or email in payload:", JSON.stringify(body).substring(0, 500));
      return NextResponse.json({ received: true, warning: "missing_fields" });
    }

    const result = await processInstantlyEvent({
      event_id: eventId,
      event_type: eventType,
      email,
      campaign_id: campaignId,
      reply_text: replyText,
      payload: body,
    });

    return NextResponse.json({
      received: true,
      skipped: result.skipped,
      lead_found: result.lead_found,
    });
  } catch (err) {
    console.error("[instantly-webhook] Error:", err);
    // Return 200 to prevent Instantly from retrying
    return NextResponse.json({ received: true, error: "processing_failed" });
  }
}
