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

const RELEVANCE_KEYWORDS = [
  "horeca", "hotel", "restaurant", "cafe", "catering", "hospitality",
  "personeel", "uitzend", "staffing", "medewerker", "werknemer", "vacature",
  "cao", "minimumloon", "loon", "contract", "arbeidsmarkt", "werkgever",
  "zzp", "schijnzelfstandig", "handhaving", "vergunning", "exploitatie",
  "terras", "keuken", "kok", "bediening", "housekeeping", "front office",
  "uitzendbur", "flexwerk", "detachering", "payroll", "onboarding",
  "recruitment", "werving", "selectie", "personeelstekort", "krapte",
];

function isLikelyRelevant(title: string | null, excerpt: string | null): boolean {
  const text = `${title ?? ""} ${excerpt ?? ""}`.toLowerCase();
  return RELEVANCE_KEYWORDS.some((keyword) => text.includes(keyword));
}

export async function runPendingExtractionPass(limit = 10) {
  const { data: pendingArticles, error } = await supabaseAdmin
    .from("raw_articles")
    .select("id, title, excerpt")
    .eq("fetch_status", "pending")
    .order("published_at", { ascending: false })
    .limit(limit * 5);

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

  const allPending = pendingArticles ?? [];
  const relevant = allPending.filter((a) =>
    isLikelyRelevant(a.title as string | null, a.excerpt as string | null),
  );
  const irrelevant = allPending.filter((a) =>
    !isLikelyRelevant(a.title as string | null, a.excerpt as string | null),
  );

  // Mark irrelevant articles as rejected so they're skipped next time
  if (irrelevant.length > 0) {
    const irrelevantIds = irrelevant.map((a) => String(a.id));
    await supabaseAdmin
      .from("raw_articles")
      .update({ fetch_status: "rejected" })
      .in("id", irrelevantIds);
  }

  const articleIds = relevant.slice(0, limit).map((article) => String(article.id));
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
    skippedIrrelevant: irrelevant.length,
    results,
  };
}
