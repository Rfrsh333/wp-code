import { NextRequest, NextResponse } from "next/server";
import { verifyAdmin } from "@/lib/admin-auth";
import { supabaseAdmin } from "@/lib/supabase";
import { syncCampaignLeads } from "@/lib/campaign-sync";

// POST: Sync a single campaign
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { isAdmin } = await verifyAdmin(request);
  if (!isAdmin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  // Get campaign
  const { data: campaign } = await supabaseAdmin
    .from("crm_instantly_campaigns")
    .select("id, instantly_campaign_id")
    .eq("id", id)
    .single();

  if (!campaign) {
    return NextResponse.json({ error: "Campaign niet gevonden" }, { status: 404 });
  }

  try {
    const result = await syncCampaignLeads(campaign.id, campaign.instantly_campaign_id);
    return NextResponse.json(result);
  } catch (err) {
    console.error("Campaign sync error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Sync failed", details: String(err) },
      { status: 500 }
    );
  }
}
