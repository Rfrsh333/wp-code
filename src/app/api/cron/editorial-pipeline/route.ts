import { NextRequest, NextResponse } from "next/server";
import { runFeedIngestionPass, runPendingExtractionPass } from "@/lib/content/services/ingestion-orchestrator";
import { runPendingAnalysisPass } from "@/lib/content/services/article-analysis-service";
import { runClusteringPass } from "@/lib/content/services/clustering-orchestrator";
import { generateDraftsFromTopClusters } from "@/lib/content/services/draft-orchestrator";
import { captureRouteError, withCronMonitor } from "@/lib/sentry-utils";

// Cron: ma-vr om 10:00 — volledige editorial pipeline
// 1. RSS feeds ophalen
// 2. Artikelen extraheren
// 3. AI classificatie
// 4. Clustering
// 5. Drafts genereren (status: "draft")
// 6. Hero images genereren
// Resultaat: concepten klaar voor review in admin dashboard
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return withCronMonitor("cron-editorial-pipeline", async () => {

  const log: Record<string, unknown> = {};

  try {
    // Stap 1: RSS feeds ophalen van alle 18 bronnen
    const ingestion = await runFeedIngestionPass();
    log.ingestion = {
      sources: ingestion.processedSources,
      successes: ingestion.successes,
      failures: ingestion.failures,
    };

    // Stap 2: Relevante artikelen extraheren (max 20)
    const extraction = await runPendingExtractionPass(20);
    log.extraction = {
      attempted: extraction.attempted,
      extracted: extraction.extracted,
      skippedIrrelevant: extraction.skippedIrrelevant,
    };

    // Stap 3: AI classificatie van niet-geanalyseerde artikelen (max 20)
    const analysis = await runPendingAnalysisPass(20);
    log.analysis = {
      attempted: analysis.attempted,
      analyzed: analysis.analyzed,
      failed: analysis.failed,
    };

    // Stap 4: Artikelen clusteren naar thema's
    const clustering = await runClusteringPass();
    log.clustering = {
      analyzedArticles: clustering.analyzedArticles,
      clustersCreated: clustering.createdOrUpdatedClusters,
      articlesLinked: clustering.linkedArticles,
    };

    // Stap 5: Drafts genereren van top clusters (max 3)
    // Hero images en quality check worden handmatig getriggerd vanuit admin UI
    // (past niet in Vercel Hobby 10s limiet)
    const drafts = await generateDraftsFromTopClusters(3);
    log.drafts = {
      attempted: drafts.attempted,
      generated: drafts.generated,
      skipped: drafts.skipped,
      failed: drafts.failed,
    };

    // Telegram notificatie als er nieuwe drafts zijn
    if (drafts.generated > 0 && process.env.TELEGRAM_BOT_TOKEN && process.env.TELEGRAM_CHAT_ID) {
      const draftTitles = drafts.results
        .filter((r) => r.status === "generated")
        .map((r) => r.draftId)
        .join(", ");

      try {
        await fetch(`https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/sendMessage`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            chat_id: process.env.TELEGRAM_CHAT_ID,
            text: `📰 Editorial pipeline klaar!\n\n${drafts.generated} nieuwe concept(en) staan klaar voor review.\n\nBekijk ze in het admin dashboard → News → Drafts`,
          }),
        });
      } catch {
        // Telegram niet kritiek
      }
    }

    return NextResponse.json({
      message: `Pipeline voltooid: ${drafts.generated} nieuwe concepten`,
      ...log,
    });
  } catch (error) {
    captureRouteError(error, { route: "/api/cron/editorial-pipeline", action: "GET" });
    // console.error("Editorial pipeline cron error:", error);
    return NextResponse.json(
      {
        error: "Pipeline failed",
        step: log,
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
  });
}
