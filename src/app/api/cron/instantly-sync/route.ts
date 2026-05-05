import { NextRequest, NextResponse } from "next/server";
import { listCampaigns, syncCampaignStatuses } from "@/lib/instantly";
import { processBatchEvents, type InstantlyEvent } from "@/lib/instantly-events";
import { fullCampaignSync } from "@/lib/campaign-sync";

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const campaigns = await listCampaigns();
    const today = new Date().toISOString().split("T")[0];

    let totalLeadsChecked = 0;
    let totalEventsProcessed = 0;
    let totalSkipped = 0;
    let totalNoLead = 0;
    let totalErrors = 0;

    for (const campaign of campaigns) {
      const statuses = await syncCampaignStatuses(campaign.id);
      const events: InstantlyEvent[] = [];

      for (const [email, info] of statuses) {
        totalLeadsChecked++;

        // Generate idempotent event based on current status
        const eventId = `cron_${campaign.id}_${email}_${info.status}_${today}`;
        let eventType: string;

        switch (info.status) {
          case "replied":
            eventType = "reply_received";
            break;
          case "opened":
            eventType = "email_opened";
            break;
          case "bounced":
            eventType = "email_bounced";
            break;
          case "unsubscribed":
            eventType = "lead_unsubscribed";
            break;
          default:
            eventType = "email_sent";
        }

        // Also generate click events if clicks > 0
        if (info.clicks > 0) {
          events.push({
            event_id: `cron_${campaign.id}_${email}_clicked_${today}`,
            event_type: "link_clicked",
            email,
            campaign_id: campaign.id,
          });
        }

        events.push({
          event_id: eventId,
          event_type: eventType,
          email,
          campaign_id: campaign.id,
        });
      }

      const result = await processBatchEvents(events);
      totalEventsProcessed += result.processed;
      totalSkipped += result.skipped;
      totalNoLead += result.no_lead;
      totalErrors += result.errors;
    }

    // Also run campaign sync (crm_instantly_campaigns + crm_lead_campaigns)
    let campaignSyncResult = null;
    try {
      campaignSyncResult = await fullCampaignSync();
    } catch (err) {
      console.error("[instantly-sync] Campaign sync error:", err);
    }

    return NextResponse.json({
      success: true,
      campaigns_synced: campaigns.length,
      leads_checked: totalLeadsChecked,
      events_processed: totalEventsProcessed,
      skipped: totalSkipped,
      no_lead: totalNoLead,
      errors: totalErrors,
      campaign_sync: campaignSyncResult,
    });
  } catch (err) {
    console.error("[instantly-sync] Cron error:", err);
    return NextResponse.json(
      { error: "Sync failed", message: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 },
    );
  }
}
