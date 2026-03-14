import { NextRequest, NextResponse } from "next/server";
import { verifyAdmin } from "@/lib/admin-auth";
import { getContentOverview } from "@/lib/content/repository";

export async function GET(request: NextRequest) {
  const { isAdmin } = await verifyAdmin(request);
  if (!isAdmin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  try {
    const overview = await getContentOverview();
    console.log("[overview] metrics:", JSON.stringify(overview.metrics));
    console.log("[overview] sources:", overview.sources.length, "clusters:", overview.clusters.length, "drafts:", overview.drafts.length);
    return NextResponse.json(overview);
  } catch (error) {
    console.error("[overview] Error loading overview:", error);
    return NextResponse.json({ error: "Failed to load overview" }, { status: 500 });
  }
}
