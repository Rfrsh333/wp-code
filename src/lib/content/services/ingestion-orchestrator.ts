import "server-only";

import { supabaseAdmin } from "@/lib/supabase";
import { listActiveSources } from "@/lib/content/repository";
import { ingestSourceFeed } from "@/lib/content/services/source-ingestion-service";
import { extractRawArticle } from "@/lib/content/services/article-extraction-service";
import { getErrorMessage } from "@/lib/content/errors";

export async function runFeedIngestionPass() {
  const sources = await listActiveSources();
  const rssSources = sources.filter((source) => source.rssUrl);

  const results: Array<{
    sourceId: string;
    sourceName: string;
    discoveredItems: number;
    status: "success" | "failed";
    error?: string;
  }> = [];

  for (const source of rssSources) {
    try {
      const result = await ingestSourceFeed(source);
      results.push({
        sourceId: source.id,
        sourceName: source.name,
        discoveredItems: result.discoveredItems,
        status: "success",
      });
    } catch (error) {
      results.push({
        sourceId: source.id,
        sourceName: source.name,
        discoveredItems: 0,
        status: "failed",
        error: getErrorMessage(error),
      });
    }
  }

  return {
    processedSources: rssSources.length,
    successes: results.filter((result) => result.status === "success").length,
    failures: results.filter((result) => result.status === "failed").length,
    results,
  };
}

export async function runPendingExtractionPass(limit = 10) {
  const { data: pendingArticles, error } = await supabaseAdmin
    .from("raw_articles")
    .select("id")
    .eq("fetch_status", "pending")
    .order("published_at", { ascending: false })
    .limit(limit);

  if (error) {
    if (error.code === "42P01") {
      return {
        attempted: 0,
        extracted: 0,
        failed: 0,
        results: [],
      };
    }

    throw error;
  }

  const articleIds = (pendingArticles ?? []).map((article) => String(article.id));
  const results: Array<{ rawArticleId: string; status: "success" | "failed"; error?: string }> = [];

  for (const rawArticleId of articleIds) {
    try {
      await extractRawArticle(rawArticleId);
      results.push({ rawArticleId, status: "success" });
    } catch (error) {
      results.push({
        rawArticleId,
        status: "failed",
        error: getErrorMessage(error),
      });
    }
  }

  return {
    attempted: articleIds.length,
    extracted: results.filter((result) => result.status === "success").length,
    failed: results.filter((result) => result.status === "failed").length,
    results,
  };
}
