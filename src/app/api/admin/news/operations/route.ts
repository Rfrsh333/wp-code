import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { verifyAdmin } from "@/lib/admin-auth";
import { logAuditEvent } from "@/lib/audit-log";
import { supabaseAdmin } from "@/lib/supabase";
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
import { runDeduplicationPass } from "@/lib/content/services/deduplication-service";
import { generateSocialSnippets } from "@/lib/content/services/social-snippets-service";
import { OpenAIContentClient } from "@/lib/ai/openai-content-client";
import { getErrorMessage } from "@/lib/content/errors";

const operationsSchema = z.object({
  action: z.enum([
    "seed_sources",
    "run_ingestion",
    "run_extraction",
    "run_analysis",
    "run_clustering",
    "generate_drafts",
    "generate_images",
    "run_deduplication",
    "generate_social_snippets",
    "run_publish_queue",
    "reset_rejected",
    "reset_analyses",
    "run_full_pipeline",
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
  } else if (parsed.data.action === "run_deduplication") {
    result = await runDeduplicationPass();
  } else if (parsed.data.action === "generate_social_snippets") {
    // Generate social snippets for a specific draft (pass draftId via limit field for now)
    const { data: recentDrafts } = await supabaseAdmin
      .from("editorial_drafts")
      .select("id, title, excerpt, slug, key_takeaways")
      .eq("review_status", "published")
      .order("published_at", { ascending: false })
      .limit(parsed.data.limit ?? 1);

    const client = new OpenAIContentClient();
    const snippetResults: Array<{ draftId: string; title: string; snippets: Record<string, unknown> }> = [];

    for (const draft of recentDrafts ?? []) {
      const snippets = await generateSocialSnippets(client, {
        title: String(draft.title),
        excerpt: String(draft.excerpt),
        keyTakeaways: Array.isArray(draft.key_takeaways) ? (draft.key_takeaways as string[]) : [],
        slug: String(draft.slug),
      });
      snippetResults.push({
        draftId: String(draft.id),
        title: String(draft.title),
        snippets,
      });
    }

    result = { generated: snippetResults.length, results: snippetResults };
  } else if (parsed.data.action === "run_publish_queue") {
    result = await runPublishQueue(parsed.data.limit ?? 10);
  } else if (parsed.data.action === "reset_rejected") {
    const { data: resetRows, error: resetError } = await supabaseAdmin
      .from("raw_articles")
      .update({ fetch_status: "pending" })
      .eq("fetch_status", "rejected")
      .select("id");

    if (resetError) {
      throw resetError;
    }

    result = { resetCount: resetRows?.length ?? 0 };
  } else if (parsed.data.action === "reset_analyses") {
    // Verwijder alle bestaande analyses zodat artikelen opnieuw geanalyseerd worden
    const { data: deletedRows, error: deleteError } = await supabaseAdmin
      .from("article_analysis")
      .delete()
      .neq("id", "00000000-0000-0000-0000-000000000000") // delete all rows
      .select("id");

    if (deleteError && deleteError.code !== "42P01") {
      throw deleteError;
    }

    result = { deletedAnalyses: deletedRows?.length ?? 0 };
  } else if (parsed.data.action === "run_full_pipeline") {
    const steps: { name: string; result: Record<string, unknown> | null; error: string | null }[] = [];

    // 1. Seed sources
    try {
      const r = await seedCuratedSources();
      console.log("[pipeline] seed_sources result:", JSON.stringify(r));
      steps.push({ name: "seed_sources", result: r, error: null });
    } catch (e) {
      console.error("[pipeline] seed_sources error:", e);
      steps.push({ name: "seed_sources", result: null, error: getErrorMessage(e) });
    }

    // 2. Feed ingestion
    try {
      const r = await runFeedIngestionPass();
      console.log("[pipeline] run_ingestion result:", JSON.stringify(r));
      steps.push({ name: "run_ingestion", result: r, error: null });
    } catch (e) {
      console.error("[pipeline] run_ingestion error:", e);
      steps.push({ name: "run_ingestion", result: null, error: getErrorMessage(e) });
    }

    // 3. Extraction
    try {
      const r = await runPendingExtractionPass(20);
      console.log("[pipeline] run_extraction result:", JSON.stringify(r));
      steps.push({ name: "run_extraction", result: r, error: null });
    } catch (e) {
      console.error("[pipeline] run_extraction error:", e);
      steps.push({ name: "run_extraction", result: null, error: getErrorMessage(e) });
    }

    // 4. Deduplication
    try {
      const r = await runDeduplicationPass();
      console.log("[pipeline] run_deduplication result:", JSON.stringify(r));
      steps.push({ name: "run_deduplication", result: r, error: null });
    } catch (e) {
      console.error("[pipeline] run_deduplication error:", e);
      steps.push({ name: "run_deduplication", result: null, error: getErrorMessage(e) });
    }

    // 5. Analysis
    try {
      const r = await runPendingAnalysisPass(20);
      console.log("[pipeline] run_analysis result:", JSON.stringify(r));
      steps.push({ name: "run_analysis", result: r, error: null });
    } catch (e) {
      console.error("[pipeline] run_analysis error:", e);
      steps.push({ name: "run_analysis", result: null, error: getErrorMessage(e) });
    }

    // 6. Clustering
    try {
      const r = await runClusteringPass(50);
      console.log("[pipeline] run_clustering result:", JSON.stringify(r));
      steps.push({ name: "run_clustering", result: r, error: null });
    } catch (e) {
      console.error("[pipeline] run_clustering error:", e);
      steps.push({ name: "run_clustering", result: null, error: getErrorMessage(e) });
    }

    // 7. Generate drafts
    try {
      const r = await generateDraftsFromTopClusters(3);
      console.log("[pipeline] generate_drafts result:", JSON.stringify(r));
      steps.push({ name: "generate_drafts", result: r, error: null });
    } catch (e) {
      console.error("[pipeline] generate_drafts error:", e);
      steps.push({ name: "generate_drafts", result: null, error: getErrorMessage(e) });
    }

    const succeeded = steps.filter((s) => s.error === null).length;
    const failed = steps.filter((s) => s.error !== null).length;

    result = { steps, summary: { total: steps.length, succeeded, failed } };
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
