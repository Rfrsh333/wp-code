import "server-only";

import { supabaseAdmin } from "@/lib/supabase";
import { OpenAIContentClient } from "@/lib/ai/openai-content-client";
import { generateEditorialDraftWithTemplate } from "@/lib/content/services/draft-generation-service";
function normalizeSlug(value: string) {
  return value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^\w\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

export async function generateDraftFromCluster(clusterId: string) {
  const { data: cluster, error: clusterError } = await supabaseAdmin
    .from("content_clusters")
    .select("id, theme_title, summary")
    .eq("id", clusterId)
    .single();

  if (clusterError || !cluster) {
    throw clusterError ?? new Error("Cluster niet gevonden.");
  }

  const { data: existingDraft } = await supabaseAdmin
    .from("editorial_drafts")
    .select("id")
    .eq("cluster_id", clusterId)
    .maybeSingle();

  if (existingDraft?.id) {
    return { status: "skipped" as const, draftId: String(existingDraft.id), reason: "Er bestaat al een draft voor dit cluster." };
  }

  const { data: clusterArticles, error: clusterArticlesError } = await supabaseAdmin
    .from("cluster_articles")
    .select(`
      normalized_article_id,
      normalized_articles (
        title,
        canonical_url,
        source_name,
        article_analysis (
          summary
        )
      )
    `)
    .eq("cluster_id", clusterId)
    .limit(8);

  if (clusterArticlesError) {
    throw clusterArticlesError;
  }

  const articleSummaries = (clusterArticles ?? [])
    .map((row) => {
      const article = Array.isArray(row.normalized_articles)
        ? row.normalized_articles[0]
        : row.normalized_articles;
      const analysis = article?.article_analysis
        ? Array.isArray(article.article_analysis)
          ? article.article_analysis[0]
          : article.article_analysis
        : null;

      if (!article?.title || !article?.canonical_url || !article?.source_name) {
        return null;
      }

      return {
        title: String(article.title),
        sourceName: String(article.source_name),
        url: String(article.canonical_url),
        summary: analysis?.summary ? String(analysis.summary) : "Geen samenvatting beschikbaar.",
      };
    })
    .filter((item): item is NonNullable<typeof item> => Boolean(item));

  if (articleSummaries.length < 1) {
    return { status: "skipped" as const, reason: "Te weinig artikelen in dit cluster (minimaal 2 nodig)." };
  }

  const primaryAudience =
    typeof cluster.theme_title === "string" &&
    cluster.theme_title.toLowerCase().includes("medewerker")
      ? "medewerkers"
      : "ondernemers";

  const client = new OpenAIContentClient();
  const draft = await generateEditorialDraftWithTemplate(client, {
    audience: primaryAudience,
    draftType: "analysis",
    clusterTitle: String(cluster.theme_title),
    clusterSummary: String(cluster.summary ?? ""),
    articleSummaries,
  });

  const slug = normalizeSlug(draft.slug);
  const { data: draftRow, error: draftError } = await supabaseAdmin
    .from("editorial_drafts")
    .insert({
      cluster_id: clusterId,
      draft_type: "analysis",
      review_status: "draft",
      primary_audience: primaryAudience,
      secondary_audience: [],
      title: draft.title,
      slug,
      excerpt: draft.excerpt,
      body_markdown: draft.bodyMarkdown,
      body_blocks: draft.bodyBlocks.length > 0 ? draft.bodyBlocks : null,
      key_takeaways: draft.keyTakeaways,
      impact_summary: draft.impactSummary,
      action_steps: draft.actionSteps,
      source_list: articleSummaries,
      seo_title: draft.seoTitle,
      meta_description: draft.metaDescription,
      review_notes: draft.reviewNotes,
      fact_check_flags: draft.factCheckFlags,
      image_prompt_suggestion: draft.imagePromptSuggestion,
      visual_direction: draft.visualDirection,
    })
    .select("id")
    .single();

  if (draftError) {
    throw draftError;
  }

  const draftId = String(draftRow.id);

  const sourceLinks = (clusterArticles ?? []).map((row, index) => ({
    draft_id: draftId,
    normalized_article_id: String(row.normalized_article_id),
    source_order: index,
  }));

  if (sourceLinks.length > 0) {
    const { error: linkError } = await supabaseAdmin
      .from("editorial_draft_sources")
      .upsert(sourceLinks, { onConflict: "draft_id,normalized_article_id" });

    if (linkError) {
      throw linkError;
    }
  }

  // Quality check en hero image worden getriggerd vanuit admin UI (past niet in Vercel Hobby 10s limiet)

  return { status: "generated" as const, draftId };
}

export async function generateDraftsFromTopClusters(limit = 5) {
  const { data: clusters, error } = await supabaseAdmin
    .from("content_clusters")
    .select("id, theme_title, summary")
    .order("editorial_potential_score", { ascending: false })
    .limit(limit);

  if (error) {
    if (error.code === "42P01") {
      return {
        attempted: 0,
        generated: 0,
        skipped: 0,
        results: [],
      };
    }

    throw error;
  }

  const client = new OpenAIContentClient();
  const results: Array<{
    clusterId: string;
    status: "generated" | "skipped" | "failed";
    draftId?: string;
    error?: string;
  }> = [];

  for (const cluster of clusters ?? []) {
    const clusterId = String(cluster.id);
    const { data: existingDraft } = await supabaseAdmin
      .from("editorial_drafts")
      .select("id")
      .eq("cluster_id", clusterId)
      .maybeSingle();

    if (existingDraft?.id) {
      results.push({
        clusterId,
        status: "skipped",
        draftId: String(existingDraft.id),
      });
      continue;
    }

    try {
      const { data: clusterArticles, error: clusterArticlesError } = await supabaseAdmin
        .from("cluster_articles")
        .select(`
          normalized_article_id,
          normalized_articles (
            title,
            canonical_url,
            source_name,
            article_analysis (
              summary
            )
          )
        `)
        .eq("cluster_id", clusterId)
        .limit(8);

      if (clusterArticlesError) {
        throw clusterArticlesError;
      }

      const articleSummaries = (clusterArticles ?? [])
        .map((row) => {
          const article = Array.isArray(row.normalized_articles)
            ? row.normalized_articles[0]
            : row.normalized_articles;
          const analysis = article?.article_analysis
            ? Array.isArray(article.article_analysis)
              ? article.article_analysis[0]
              : article.article_analysis
            : null;

          if (!article?.title || !article?.canonical_url || !article?.source_name) {
            return null;
          }

          return {
            title: String(article.title),
            sourceName: String(article.source_name),
            url: String(article.canonical_url),
            summary: analysis?.summary ? String(analysis.summary) : "Geen samenvatting beschikbaar.",
          };
        })
        .filter((item): item is NonNullable<typeof item> => Boolean(item));

      if (articleSummaries.length < 1) {
        results.push({
          clusterId,
          status: "skipped",
        });
        continue;
      }

      const primaryAudience =
        typeof cluster.theme_title === "string" &&
        cluster.theme_title.toLowerCase().includes("medewerker")
          ? "medewerkers"
          : "ondernemers";

      const draft = await generateEditorialDraftWithTemplate(client, {
        audience: primaryAudience,
        draftType: "analysis",
        clusterTitle: String(cluster.theme_title),
        clusterSummary: String(cluster.summary ?? ""),
        articleSummaries,
      });

      const slug = normalizeSlug(draft.slug);
      const { data: draftRow, error: draftError } = await supabaseAdmin
        .from("editorial_drafts")
        .insert({
          cluster_id: clusterId,
          draft_type: "analysis",
          review_status: "draft",
          primary_audience: primaryAudience,
          secondary_audience: [],
          title: draft.title,
          slug,
          excerpt: draft.excerpt,
          body_markdown: draft.bodyMarkdown,
          body_blocks: draft.bodyBlocks.length > 0 ? draft.bodyBlocks : null,
          key_takeaways: draft.keyTakeaways,
          impact_summary: draft.impactSummary,
          action_steps: draft.actionSteps,
          source_list: articleSummaries,
          seo_title: draft.seoTitle,
          meta_description: draft.metaDescription,
          review_notes: draft.reviewNotes,
          fact_check_flags: draft.factCheckFlags,
          image_prompt_suggestion: draft.imagePromptSuggestion,
          visual_direction: draft.visualDirection,
        })
        .select("id")
        .single();

      if (draftError) {
        throw draftError;
      }

      const draftId = String(draftRow.id);

      const sourceLinks = (clusterArticles ?? []).map((row, index) => ({
        draft_id: draftId,
        normalized_article_id: String(row.normalized_article_id),
        source_order: index,
      }));

      if (sourceLinks.length > 0) {
        const { error: linkError } = await supabaseAdmin
          .from("editorial_draft_sources")
          .upsert(sourceLinks, { onConflict: "draft_id,normalized_article_id" });

        if (linkError) {
          throw linkError;
        }
      }

      // Quality check en hero image worden getriggerd vanuit admin UI

      results.push({
        clusterId,
        status: "generated",
        draftId,
      });
    } catch (error) {
      results.push({
        clusterId,
        status: "failed",
        error: error instanceof Error ? error.message : "Unknown draft generation error",
      });
    }
  }

  return {
    attempted: (clusters ?? []).length,
    generated: results.filter((result) => result.status === "generated").length,
    skipped: results.filter((result) => result.status === "skipped").length,
    failed: results.filter((result) => result.status === "failed").length,
    results,
  };
}
