import "server-only";

import { supabaseAdmin } from "@/lib/supabase";
import { normalizeFetchedArticle, stripHtmlTags } from "@/lib/content/normalization";
import { createJobRun, failJobRun, finishJobRun } from "@/lib/content/job-runs";
import { ContentPipelineError, getErrorMessage } from "@/lib/content/errors";

export async function extractRawArticle(rawArticleId: string) {
  const jobRunId = await createJobRun("content.extractArticle", { rawArticleId });

  try {
    const { data: rawArticle, error } = await supabaseAdmin
      .from("raw_articles")
      .select("id, source_id, canonical_url, title, excerpt, author, published_at")
      .eq("id", rawArticleId)
      .single();

    if (error || !rawArticle) {
      throw new ContentPipelineError("Raw article not found.", "raw_article_missing", { rawArticleId });
    }

    const canonicalUrl = rawArticle.canonical_url as string | null;
    if (!canonicalUrl) {
      throw new ContentPipelineError("Canonical URL missing on raw article.", "canonical_url_missing", { rawArticleId });
    }

    const { data: source } = await supabaseAdmin
      .from("sources")
      .select("name")
      .eq("id", rawArticle.source_id as string)
      .single();

    const response = await fetch(canonicalUrl, {
      headers: {
        "User-Agent": "TopTalentJobsContentBot/1.0 (+https://www.toptalentjobs.nl)",
      },
      next: { revalidate: 0 },
    });

    if (!response.ok) {
      throw new ContentPipelineError("Article fetch failed.", "article_fetch_failed", {
        rawArticleId,
        status: response.status,
      });
    }

    const html = await response.text();
    const cleanedText = stripHtmlTags(html).slice(0, 20000);
    const normalized = normalizeFetchedArticle({
      sourceId: String(rawArticle.source_id),
      sourceName: source?.name ? String(source.name) : "Unknown source",
      rawArticleId: String(rawArticle.id),
      canonicalUrl,
      title: String(rawArticle.title ?? "Untitled"),
      excerpt: (rawArticle.excerpt as string | null) ?? null,
      author: (rawArticle.author as string | null) ?? null,
      cleanedText,
      publishedAt: (rawArticle.published_at as string | null) ?? null,
      language: "nl",
    });

    const { error: upsertError } = await supabaseAdmin.from("normalized_articles").upsert(
      {
        raw_article_id: normalized.rawArticleId,
        source_id: normalized.sourceId,
        title: normalized.title,
        canonical_url: normalized.canonicalUrl,
        source_name: normalized.sourceName,
        published_at: normalized.publishedAt,
        author: normalized.author,
        excerpt: normalized.excerpt,
        cleaned_text: normalized.cleanedText,
        language: normalized.language,
        content_hash: normalized.contentHash,
        tag_suggestions: normalized.tagSuggestions,
        provenance: normalized.provenance,
      },
      { onConflict: "raw_article_id" },
    );

    if (upsertError) {
      throw new ContentPipelineError(
        `Upsert normalized_articles failed: ${getErrorMessage(upsertError)}`,
        "upsert_failed",
        { rawArticleId },
      );
    }

    await supabaseAdmin
      .from("raw_articles")
      .update({
        raw_html: html,
        raw_text: cleanedText,
        fetch_status: "processed",
        fetch_error: null,
      })
      .eq("id", rawArticleId);

    await finishJobRun(jobRunId, {
      rawArticleId,
      normalizedCharacters: cleanedText.length,
    });
  } catch (error) {
    await supabaseAdmin
      .from("raw_articles")
      .update({
        fetch_status: "error",
        fetch_error: getErrorMessage(error),
      })
      .eq("id", rawArticleId);

    await failJobRun(jobRunId, error);
    throw error;
  }
}
