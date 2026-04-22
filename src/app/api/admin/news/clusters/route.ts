import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { verifyAdmin } from "@/lib/admin-auth";
import { listRecentClusters } from "@/lib/content/repository";
import { generateDraftFromCluster } from "@/lib/content/services/draft-orchestrator";
import { logAuditEvent } from "@/lib/audit-log";
import { captureRouteError } from "@/lib/sentry-utils";

export const maxDuration = 60;

export async function GET(request: NextRequest) {
  const { isAdmin } = await verifyAdmin(request);
  if (!isAdmin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  try {
    const clusters = await listRecentClusters(25);
    return NextResponse.json({ clusters });
  } catch (error) {
    captureRouteError(error, { route: "/api/admin/news/clusters", action: "GET" });
    // console.error("[news/clusters] GET error:", error);
    return NextResponse.json({ clusters: [], error: "Clusters konden niet geladen worden" }, { status: 500 });
  }
}

const clusterActionSchema = z.object({
  clusterId: z.string().uuid(),
  action: z.enum(["generate_draft"]),
});

export async function POST(request: NextRequest) {
  const { isAdmin, email, role } = await verifyAdmin(request);
  if (!isAdmin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const parsed = clusterActionSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Ongeldige actie" }, { status: 400 });
  }

  try {
    const result = await generateDraftFromCluster(parsed.data.clusterId);

    await logAuditEvent({
      actorEmail: email,
      actorRole: role,
      action: "content_cluster_generate_draft",
      targetTable: "content_clusters",
      targetId: parsed.data.clusterId,
      summary: `Draft gegenereerd vanuit cluster`,
      metadata: { result },
    });

    if (result.status === "skipped") {
      return NextResponse.json({
        status: "skipped",
        reason: result.reason,
        draftId: "draftId" in result ? result.draftId : undefined,
      });
    }

    return NextResponse.json({
      status: "generated",
      draftId: result.draftId,
    });
  } catch (error) {
    captureRouteError(error, { route: "/api/admin/news/clusters", action: "POST" });
    // console.error("[content] Failed to generate draft from cluster", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Draft generatie mislukt" },
      { status: 500 },
    );
  }
}
