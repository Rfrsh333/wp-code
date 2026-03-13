import "server-only";

import { supabaseAdmin } from "@/lib/supabase";
import { parseFeedXml } from "@/lib/rss/parse-feed";
import { buildRawArticleFromFeedItem } from "@/lib/content/normalization";
import { createJobRun, failJobRun, finishJobRun } from "@/lib/content/job-runs";
import { ContentPipelineError, getErrorMessage } from "@/lib/content/errors";
import type { SourceRecord } from "@/lib/content/types";

export async function ingestSourceFeed(source: Pick<SourceRecord, "id" | "sourceUrl" | "rssUrl">) {
  if (!source.rssUrl) {
    throw new ContentPipelineError("Source has no RSS URL configured.", "missing_rss_url", { sourceId: source.id });
  }

  const jobRunId = await createJobRun("content.ingestFeed", { sourceId: source.id, rssUrl: source.rssUrl });

  try {
    const response = await fetch(source.rssUrl, {
      headers: {
        "User-Agent": "TopTalentJobsContentBot/1.0 (+https://www.toptalentjobs.nl)",
      },
      next: { revalidate: 0 },
    });

    if (!response.ok) {
      throw new ContentPipelineError("Feed fetch failed.", "feed_fetch_failed", {
        sourceId: source.id,
        status: response.status,
      });
    }

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

    await supabaseAdmin
      .from("sources")
      .update({
        last_fetched_at: new Date().toISOString(),
        last_error_at: null,
        last_error_message: null,
      })
      .eq("id", source.id);

    await finishJobRun(jobRunId, {
      sourceId: source.id,
      discoveredItems: rawArticles.length,
    });

    return {
      discoveredItems: rawArticles.length,
      feedTitle: feed.title,
    };
  } catch (error) {
    await supabaseAdmin
      .from("sources")
      .update({
        last_error_at: new Date().toISOString(),
        last_error_message: getErrorMessage(error),
      })
      .eq("id", source.id);

    await failJobRun(jobRunId, error);
    throw error;
  }
}
