import { createHash } from "crypto";
import type { IngestedFeedItem } from "@/lib/content/types";

export function normalizeUrl(rawUrl: string): string {
  try {
    const url = new URL(rawUrl);
    url.hash = "";
    url.searchParams.sort();

    ["utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content"].forEach((param) => {
      url.searchParams.delete(param);
    });

    return url.toString();
  } catch {
    return rawUrl.trim();
  }
}

export function stripHtmlTags(input: string): string {
  return input
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function computeContentHash(input: string): string {
  return createHash("sha256").update(input).digest("hex");
}

export function buildRawArticleFromFeedItem(
  sourceId: string,
  sourceUrl: string,
  item: IngestedFeedItem,
): Record<string, unknown> {
  const canonicalUrl = normalizeUrl(item.link);
  const excerpt = item.excerpt ? stripHtmlTags(item.excerpt).slice(0, 400) : null;
  const title = item.title.trim();
  const fingerprint = computeContentHash(`${canonicalUrl}|${title}|${excerpt ?? ""}`);

  return {
    source_id: sourceId,
    external_id: item.guid ?? item.link,
    source_url: sourceUrl,
    canonical_url: canonicalUrl,
    title,
    author: item.author,
    published_at: item.publishedAt,
    excerpt,
    raw_html: item.excerpt ?? null,
    raw_text: excerpt,
    language: "nl",
    hash: fingerprint,
    fetch_status: "pending",
    fetch_error: null,
    provenance: {
      ingest_method: "rss",
      discovered_from: sourceUrl,
    },
  };
}

export function normalizeFetchedArticle(payload: {
  sourceId: string;
  sourceName: string;
  rawArticleId: string;
  canonicalUrl: string;
  title: string;
  excerpt?: string | null;
  author?: string | null;
  cleanedText: string;
  publishedAt?: string | null;
  language?: string | null;
}): {
  rawArticleId: string;
  sourceId: string;
  title: string;
  canonicalUrl: string;
  sourceName: string;
  publishedAt: string | null;
  author: string | null;
  excerpt: string | null;
  cleanedText: string;
  language: string | null;
  contentHash: string;
  tagSuggestions: string[];
  provenance: Record<string, unknown>;
} {
  const cleanedText = payload.cleanedText.trim();

  return {
    rawArticleId: payload.rawArticleId,
    sourceId: payload.sourceId,
    title: payload.title.trim(),
    canonicalUrl: normalizeUrl(payload.canonicalUrl),
    sourceName: payload.sourceName,
    publishedAt: payload.publishedAt ?? null,
    author: payload.author ?? null,
    excerpt: payload.excerpt?.trim() ?? null,
    cleanedText,
    language: payload.language ?? "nl",
    contentHash: computeContentHash(`${payload.title}|${cleanedText}`),
    tagSuggestions: [],
    provenance: {
      normalized_at: new Date().toISOString(),
    },
  };
}
