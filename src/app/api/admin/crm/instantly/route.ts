import { NextRequest, NextResponse } from "next/server";
import { verifyAdmin } from "@/lib/admin-auth";
import { supabaseAdmin } from "@/lib/supabase";
import { listCampaigns, addLeadsToCampaign, syncCampaignStatuses } from "@/lib/instantly";

/**
 * GET - Lijst campagnes van Instantly
 * POST - Leads toevoegen aan een Instantly campagne
 * PATCH - Sync statuses van een campagne terug naar CRM
 */

export async function GET(request: NextRequest) {
  const { isAdmin } = await verifyAdmin(request);
  if (!isAdmin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const campaigns = await listCampaigns();
    return NextResponse.json({ campaigns });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Onbekende fout";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const { isAdmin } = await verifyAdmin(request);
  if (!isAdmin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const { campaign_id, lead_ids } = body;

  if (!campaign_id || !lead_ids || !Array.isArray(lead_ids) || lead_ids.length === 0) {
    return NextResponse.json({ error: "campaign_id en lead_ids zijn verplicht" }, { status: 400 });
  }

  // Fetch leads from CRM
  const { data: leads, error } = await supabaseAdmin
    .from("crm_leads")
    .select("id, email, company_name, phone, website, city")
    .in("id", lead_ids)
    .not("email", "is", null);

  if (error || !leads || leads.length === 0) {
    return NextResponse.json({ error: "Geen leads gevonden met email" }, { status: 404 });
  }

  // Get campaign name for reference
  const campaigns = await listCampaigns();
  const campaign = campaigns.find(c => c.id === campaign_id);
  const campaignName = campaign?.name || campaign_id;

  // Format leads for Instantly
  const instantlyLeads = leads.map(l => ({
    email: l.email!,
    company_name: l.company_name,
    phone: l.phone || undefined,
    website: l.website || undefined,
    custom_variables: {
      city: l.city || "",
      crm_id: l.id,
    },
  }));

  try {
    const result = await addLeadsToCampaign(campaign_id, instantlyLeads);

    // Update CRM leads with campaign info
    const now = new Date().toISOString();
    for (const lead of leads) {
      await supabaseAdmin
        .from("crm_leads")
        .update({
          instantly_campaign_id: campaign_id,
          instantly_campaign_name: campaignName,
          instantly_email_status: "sent",
          last_email_at: now,
          email_count: (lead as Record<string, unknown>).email_count
            ? (lead as Record<string, unknown>).email_count as number + 1
            : 1,
        })
        .eq("id", lead.id);

      // Create contact log
      await supabaseAdmin
        .from("crm_contact_logs")
        .insert({
          lead_id: lead.id,
          type: "instantly_sent",
          notes: `Toegevoegd aan Instantly campagne: ${campaignName}`,
        });
    }

    return NextResponse.json({
      success: true,
      added: leads.length,
      campaign_name: campaignName,
      instantly_response: result,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Onbekende fout";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  const { isAdmin } = await verifyAdmin(request);
  if (!isAdmin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const { campaign_id } = body;

  if (!campaign_id) {
    return NextResponse.json({ error: "campaign_id is verplicht" }, { status: 400 });
  }

  try {
    // Get all statuses from Instantly
    const statuses = await syncCampaignStatuses(campaign_id);

    if (statuses.size === 0) {
      return NextResponse.json({ synced: 0, message: "Geen leads gevonden in campagne" });
    }

    // Find matching CRM leads
    const emails = Array.from(statuses.keys());
    const { data: crmLeads } = await supabaseAdmin
      .from("crm_leads")
      .select("id, email, instantly_email_status, outreach_status")
      .in("email", emails);

    if (!crmLeads || crmLeads.length === 0) {
      return NextResponse.json({ synced: 0, message: "Geen matching leads in CRM" });
    }

    let synced = 0;
    const contactLogs: Array<{ lead_id: string; type: string; notes: string }> = [];

    for (const lead of crmLeads) {
      if (!lead.email) continue;
      const info = statuses.get(lead.email.toLowerCase());
      if (!info) continue;

      const updates: Record<string, unknown> = {
        instantly_email_status: info.status,
        instantly_last_event_at: new Date().toISOString(),
      };

      // If status changed to replied, update outreach_status
      if (info.status === "replied" && lead.instantly_email_status !== "replied") {
        updates.outreach_status = "replied";
        updates.next_best_channel = "phone";
        contactLogs.push({
          lead_id: lead.id,
          type: "instantly_replied",
          notes: `Email beantwoord (Instantly sync)`,
        });
      } else if (info.status === "opened" && lead.instantly_email_status !== "opened" && lead.instantly_email_status !== "replied") {
        contactLogs.push({
          lead_id: lead.id,
          type: "instantly_opened",
          notes: `Email geopend (${info.opens}x)`,
        });
      } else if (info.status === "bounced" && lead.instantly_email_status !== "bounced") {
        contactLogs.push({
          lead_id: lead.id,
          type: "instantly_bounced",
          notes: "Email bounced (Instantly sync)",
        });
      }

      await supabaseAdmin.from("crm_leads").update(updates).eq("id", lead.id);
      synced++;
    }

    // Bulk insert contact logs
    if (contactLogs.length > 0) {
      await supabaseAdmin.from("crm_contact_logs").insert(contactLogs);
    }

    return NextResponse.json({
      synced,
      total_in_campaign: statuses.size,
      matched_in_crm: crmLeads.length,
      new_replies: contactLogs.filter(l => l.type === "instantly_replied").length,
      new_opens: contactLogs.filter(l => l.type === "instantly_opened").length,
      new_bounces: contactLogs.filter(l => l.type === "instantly_bounced").length,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Onbekende fout";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
