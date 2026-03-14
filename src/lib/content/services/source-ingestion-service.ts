import "server-only";

import { supabaseAdmin } from "@/lib/supabase";
import { parseFeedXml } from "@/lib/rss/parse-feed";
import { buildRawArticleFromFeedItem } from "@/lib/content/normalization";
import { createJobRun, failJobRun, finishJobRun } from "@/lib/content/job-runs";
import { ContentPipelineError, getErrorMessage } from "@/lib/content/errors";
import type { SourceHealthStatus, SourceRecord } from "@/lib/content/types";

const MAX_RETRIES = 3;
const RETRY_DELAYS_MS = [2_000, 5_000, 15_000];

function computeHealthStatus(consecutiveErrors: number): SourceHealthStatus {
  if (consecutiveErrors === 0) return "healthy";
  if (consecutiveErrors <= 2) return "degraded";
  if (consecutiveErrors <= 5) return "failing";
  return "dead";
}

async function fetchWithRetry(url: string, retries = MAX_RETRIES): Promise<Response> {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const response = await fetch(url, {
        headers: {
          "User-Agent": "TopTalentJobsContentBot/1.0 (+https://www.toptalentjobs.nl)",
        },
        next: { revalidate: 0 },
        signal: AbortSignal.timeout(30_000),
      });

      if (response.ok) return response;

      // Don't retry on 4xx client errors (except 429)
      if (response.status >= 400 && response.status < 500 && response.status !== 429) {
        throw new ContentPipelineError("Feed fetch failed.", "feed_fetch_failed", {
          status: response.status,
        });
      }

      // Retry on 5xx or 429
      if (attempt < retries) {
        const delay = RETRY_DELAYS_MS[attempt] ?? 15_000;
        console.log(`[ingest] Retry ${attempt + 1}/${retries} for ${url} (status ${response.status}), waiting ${delay}ms`);
        await new Promise((r) => setTimeout(r, delay));
        continue;
      }

      throw new ContentPipelineError("Feed fetch failed after retries.", "feed_fetch_failed", {
        status: response.status,
        attempts: attempt + 1,
      });
    } catch (error) {
      if (error instanceof ContentPipelineError) throw error;

      if (attempt < retries) {
        const delay = RETRY_DELAYS_MS[attempt] ?? 15_000;
        console.log(`[ingest] Retry ${attempt + 1}/${retries} for ${url} (${getErrorMessage(error)}), waiting ${delay}ms`);
        await new Promise((r) => setTimeout(r, delay));
        continue;
      }

      throw new ContentPipelineError(
        `Feed fetch failed after ${attempt + 1} attempts: ${getErrorMessage(error)}`,
        "feed_fetch_failed",
        { attempts: attempt + 1 },
      );
    }
  }

  throw new ContentPipelineError("Feed fetch exhausted retries.", "feed_fetch_failed", {});
}

export async function ingestSourceFeed(
  source: Pick<SourceRecord, "id" | "sourceUrl" | "rssUrl" | "consecutiveErrorCount">,
) {
  if (!source.rssUrl) {
    throw new ContentPipelineError("Source has no RSS URL configured.", "missing_rss_url", { sourceId: source.id });
  }

  const jobRunId = await createJobRun("content.ingestFeed", { sourceId: source.id, rssUrl: source.rssUrl });
  const startTime = Date.now();

  try {
    const response = await fetchWithRetry(source.rssUrl);

    const xml = await response.text();
    const feed = parseFeedXml(xml);
    const rawArticles = feed.items.map((item) =>
      buildRawArticleFromFeedItem(source.id, source.sourceUrl, item),
    );

    if (rawArticles.length) {
      const { error } = await supabaseAdmin.from("raw_articles").upsert(rawArticles, {
        onConflict: "source_id,hash",
        ignoreDuplicates: true,
      });

      if (error) {
        throw new ContentPipelineError(
          `Upsert raw_articles failed: ${getErrorMessage(error)}`,
          "upsert_failed",
          { sourceId: source.id, articleCount: rawArticles.length },
        );
      }
    }

    const fetchTimeMs = Date.now() - startTime;

    await supabaseAdmin
      .from("sources")
      .update({
        last_fetched_at: new Date().toISOString(),
        last_error_at: null,
        last_error_message: null,
        health_status: "healthy",
        consecutive_error_count: 0,
        avg_fetch_time_ms: fetchTimeMs,
        articles_found_last_run: rawArticles.length,
      })
      .eq("id", source.id);

    await finishJobRun(jobRunId, {
      sourceId: source.id,
      discoveredItems: rawArticles.length,
      fetchTimeMs,
    });

    console.log(`[ingest] ${source.id}: ${rawArticles.length} items in ${fetchTimeMs}ms`);

    return {
      discoveredItems: rawArticles.length,
      feedTitle: feed.title,
      fetchTimeMs,
    };
  } catch (error) {
    const fetchTimeMs = Date.now() - startTime;
    const newErrorCount = (source.consecutiveErrorCount ?? 0) + 1;
    const newHealthStatus = computeHealthStatus(newErrorCount);

    await supabaseAdmin
      .from("sources")
      .update({
        last_error_at: new Date().toISOString(),
        last_error_message: getErrorMessage(error),
        health_status: newHealthStatus,
        consecutive_error_count: newErrorCount,
        avg_fetch_time_ms: fetchTimeMs,
      })
      .eq("id", source.id);

    console.warn(`[ingest] ${source.id}: FAILED (errors: ${newErrorCount}, status: ${newHealthStatus})`);

    await failJobRun(jobRunId, error);
    throw error;
  }
}
