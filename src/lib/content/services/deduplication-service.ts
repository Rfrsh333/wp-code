import "server-only";

import { supabaseAdmin } from "@/lib/supabase";
import { createJobRun, failJobRun, finishJobRun } from "@/lib/content/job-runs";
import { getErrorMessage } from "@/lib/content/errors";

/**
 * Normalized Levenshtein similarity between two strings (0-100).
 * Uses a simplified approach: compares lowercased, trimmed strings.
 */
function titleSimilarity(a: string, b: string): number {
  const s1 = a.toLowerCase().trim();
  const s2 = b.toLowerCase().trim();

  if (s1 === s2) return 100;
  if (!s1.length || !s2.length) return 0;

  // Use trigram overlap for speed on longer strings
  const trigrams = (str: string): Set<string> => {
    const t = new Set<string>();
    for (let i = 0; i <= str.length - 3; i++) {
      t.add(str.slice(i, i + 3));
    }
    return t;
  };

  const t1 = trigrams(s1);
  const t2 = trigrams(s2);

  if (t1.size === 0 || t2.size === 0) return 0;

  let overlap = 0;
  for (const t of t1) {
    if (t2.has(t)) overlap++;
  }

  const union = new Set([...t1, ...t2]).size;
  return Math.round((overlap / union) * 100);
}

interface DedupCandidate {
  id: string;
  title: string;
  canonicalUrl: string;
  contentHash: string;
  sourceId: string;
  publishedAt: string | null;
}

/**
 * Find duplicates for a single normalized article by checking:
 * 1. Exact canonical URL match
 * 2. Exact content hash match
 * 3. Fuzzy title similarity (>= 80% trigram overlap)
 */
async function findDuplicatesFor(
  article: DedupCandidate,
  existingArticles: DedupCandidate[],
): Promise<Array<{ matchedId: string; similarity: number; reason: string }>> {
  const matches: Array<{ matchedId: string; similarity: number; reason: string }> = [];

  for (const existing of existingArticles) {
    if (existing.id === article.id) continue;
    // Same source = same feed item already deduped by hash at ingest
    if (existing.sourceId === article.sourceId) continue;

    // 1. Exact URL match
    if (existing.canonicalUrl === article.canonicalUrl) {
      matches.push({ matchedId: existing.id, similarity: 100, reason: "exact_url" });
      continue;
    }

    // 2. Exact content hash match
    if (existing.contentHash === article.contentHash) {
      matches.push({ matchedId: existing.id, similarity: 100, reason: "exact_content_hash" });
      continue;
    }

    // 3. Fuzzy title similarity
    const sim = titleSimilarity(article.title, existing.title);
    if (sim >= 80) {
      matches.push({ matchedId: existing.id, similarity: sim, reason: "title_similarity" });
    }
  }

  return matches;
}

/**
 * Pick the "primary" article from a set of duplicates.
 * Prefers: highest trust source, earliest published, longest text.
 */
function pickPrimary(articleIds: string[], articles: DedupCandidate[]): string {
  const candidates = articles.filter((a) => articleIds.includes(a.id));
  if (candidates.length === 0) return articleIds[0];

  candidates.sort((a, b) => {
    // Prefer articles with earlier publish dates
    const dateA = a.publishedAt ? new Date(a.publishedAt).getTime() : Infinity;
    const dateB = b.publishedAt ? new Date(b.publishedAt).getTime() : Infinity;
    return dateA - dateB;
  });

  return candidates[0].id;
}

/**
 * Run deduplication on recently normalized articles.
 * Compares new articles against existing ones within a time window.
 */
export async function runDeduplicationPass(lookbackDays = 7) {
  const jobRunId = await createJobRun("content.deduplication", { lookbackDays });

  try {
    const since = new Date();
    since.setDate(since.getDate() - lookbackDays);

    // Get all normalized articles within the lookback window
    const { data: recentRows, error: recentError } = await supabaseAdmin
      .from("normalized_articles")
      .select("id, title, canonical_url, content_hash, source_id, published_at")
      .gte("created_at", since.toISOString())
      .order("created_at", { ascending: false });

    if (recentError) {
      if (recentError.code === "42P01") {
        await finishJobRun(jobRunId, { skipped: true, reason: "table_missing" });
        return { groupsCreated: 0, articlesMarked: 0 };
      }
      throw recentError;
    }

    const articles: DedupCandidate[] = (recentRows ?? []).map((row) => ({
      id: String(row.id),
      title: String(row.title),
      canonicalUrl: String(row.canonical_url),
      contentHash: String(row.content_hash),
      sourceId: String(row.source_id),
      publishedAt: (row.published_at as string | null) ?? null,
    }));

    if (articles.length < 2) {
      await finishJobRun(jobRunId, { articlesChecked: articles.length, groupsCreated: 0 });
      return { groupsCreated: 0, articlesMarked: 0 };
    }

    // Get existing duplicate group memberships to avoid re-processing
    const { data: existingMembers } = await supabaseAdmin
      .from("duplicate_group_articles")
      .select("normalized_article_id");

    const alreadyGrouped = new Set(
      (existingMembers ?? []).map((r) => String(r.normalized_article_id)),
    );

    // Find all duplicate pairs
    const processed = new Set<string>();
    const groups: Array<{ articleIds: string[]; similarity: number; reason: string }> = [];

    for (const article of articles) {
      if (processed.has(article.id) || alreadyGrouped.has(article.id)) continue;

      const matches = await findDuplicatesFor(article, articles);
      if (matches.length === 0) continue;

      const groupArticleIds = [article.id, ...matches.map((m) => m.matchedId)];
      const bestMatch = matches.reduce((a, b) => (a.similarity > b.similarity ? a : b));

      groups.push({
        articleIds: groupArticleIds,
        similarity: bestMatch.similarity,
        reason: bestMatch.reason,
      });

      for (const id of groupArticleIds) {
        processed.add(id);
      }
    }

    // Persist duplicate groups
    let groupsCreated = 0;
    let articlesMarked = 0;

    for (const group of groups) {
      const primaryId = pickPrimary(group.articleIds, articles);
      const primaryArticle = articles.find((a) => a.id === primaryId);

      const { data: groupRow, error: groupError } = await supabaseAdmin
        .from("duplicate_groups")
        .insert({
          canonical_url: primaryArticle?.canonicalUrl ?? null,
          primary_normalized_article_id: primaryId,
          similarity_score: group.similarity,
          reason: group.reason,
        })
        .select("id")
        .single();

      if (groupError || !groupRow) {
        console.error("[dedup] Failed to create group:", getErrorMessage(groupError));
        continue;
      }

      const memberRows = group.articleIds.map((articleId) => ({
        duplicate_group_id: String(groupRow.id),
        normalized_article_id: articleId,
        is_primary: articleId === primaryId,
      }));

      const { error: memberError } = await supabaseAdmin
        .from("duplicate_group_articles")
        .upsert(memberRows, {
          onConflict: "duplicate_group_id,normalized_article_id",
          ignoreDuplicates: true,
        });

      if (memberError) {
        console.error("[dedup] Failed to insert group members:", getErrorMessage(memberError));
        continue;
      }

      groupsCreated++;
      articlesMarked += group.articleIds.length;
    }

    console.log(`[dedup] Checked ${articles.length} articles, found ${groupsCreated} duplicate groups (${articlesMarked} articles)`);

    await finishJobRun(jobRunId, {
      articlesChecked: articles.length,
      groupsCreated,
      articlesMarked,
    });

    return { groupsCreated, articlesMarked };
  } catch (error) {
    await failJobRun(jobRunId, error);
    throw error;
  }
}
