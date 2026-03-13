import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { verifyAdmin } from "@/lib/admin-auth";
import { logAuditEvent } from "@/lib/audit-log";
import { seedCuratedSources } from "@/lib/content/services/source-seed-service";
import {
  runFeedIngestionPass,
  runPendingExtractionPass,
} from "@/lib/content/services/ingestion-orchestrator";
import { runPendingAnalysisPass } from "@/lib/content/services/article-analysis-service";
import { runClusteringPass } from "@/lib/content/services/clustering-orchestrator";
import { generateDraftsFromTopClusters } from "@/lib/content/services/draft-orchestrator";
import { generateHeroImagesForReadyDrafts } from "@/lib/content/services/hero-image-orchestrator";
import { runPublishQueue } from "@/lib/content/services/publish-service";

const operationsSchema = z.object({
  action: z.enum([
    "seed_sources",
    "run_ingestion",
    "run_extraction",
    "run_analysis",
    "run_clustering",
    "generate_drafts",
    "generate_images",
    "run_publish_queue",
  ]),
  limit: z.number().int().min(1).max(50).optional(),
});

export async function POST(request: NextRequest) {
  const { isAdmin, email, role } = await verifyAdmin(request);
  if (!isAdmin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const parsed = operationsSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid operation payload" }, { status: 400 });
  }

  let result: Record<string, unknown>;

  if (parsed.data.action === "seed_sources") {
    result = await seedCuratedSources();
  } else if (parsed.data.action === "run_ingestion") {
    result = await runFeedIngestionPass();
  } else if (parsed.data.action === "run_analysis") {
    result = await runPendingAnalysisPass(parsed.data.limit ?? 10);
  } else if (parsed.data.action === "run_clustering") {
    result = await runClusteringPass(parsed.data.limit ?? 50);
  } else if (parsed.data.action === "generate_drafts") {
    result = await generateDraftsFromTopClusters(parsed.data.limit ?? 5);
  } else if (parsed.data.action === "generate_images") {
    result = await generateHeroImagesForReadyDrafts(parsed.data.limit ?? 3);
  } else if (parsed.data.action === "run_publish_queue") {
    result = await runPublishQueue(parsed.data.limit ?? 10);
  } else {
    result = await runPendingExtractionPass(parsed.data.limit ?? 10);
  }

  await logAuditEvent({
    actorEmail: email,
    actorRole: role,
    action: `content_${parsed.data.action}`,
    targetTable: "content_intelligence",
    targetId: null,
    summary: `Content operatie uitgevoerd: ${parsed.data.action}`,
    metadata: result,
  });

  return NextResponse.json({ action: parsed.data.action, result });
}
