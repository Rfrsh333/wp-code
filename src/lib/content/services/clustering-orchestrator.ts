import "server-only";

import { supabaseAdmin } from "@/lib/supabase";
import { buildClusterRecord } from "@/lib/content/services/cluster-service";
import { deriveReadableClusterTitle } from "@/lib/content/presentation";
import type {
  AnalysisCategory,
  ArticleAnalysisRecord,
  AudienceType,
  ImpactLevel,
} from "@/lib/content/types";

interface ClusterSourceRow {
  id: string;
  title: string;
  published_at: string | null;
  article_analysis: {
    category: AnalysisCategory | null;
    subtopics: string[] | null;
    summary: string | null;
    is_relevant: boolean;
    business_relevance_score: number;
    worker_relevance_score: number;
    novelty_score: number;
    confidence_score: number;
    impact_level: ImpactLevel;
    primary_audience: AudienceType | null;
  } | null;
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^\w\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

function deriveClusterKey(row: ClusterSourceRow) {
  const category = row.article_analysis?.category ?? "algemeen";
  const dominantSubtopic = row.article_analysis?.subtopics?.[0] ?? "ontwikkelingen";
  return {
    slug: slugify(`${category}-${dominantSubtopic}`),
    themeTitle: deriveReadableClusterTitle({
      category,
      subtopic: dominantSubtopic,
    }),
  };
}

function summarizeCluster(rows: ClusterSourceRow[]) {
  const summaries = rows
    .map((row) => row.article_analysis?.summary)
    .filter((summary): summary is string => Boolean(summary))
    .slice(0, 3);

  if (summaries.length === 0) {
    return "Cluster opgebouwd uit recente relevante artikelen zonder samenvatting.";
  }

  return summaries.join(" ");
}

function toArticleAnalysisRecord(row: ClusterSourceRow): ArticleAnalysisRecord {
  return {
    id: `analysis-${row.id}`,
    normalizedArticleId: row.id,
    isRelevant: true,
    isNoise: false,
    primaryAudience: row.article_analysis?.primary_audience ?? null,
    secondaryAudience: [],
    category: row.article_analysis?.category ?? null,
    subtopics: row.article_analysis?.subtopics ?? [],
    contentType: "analysis",
    impactLevel: row.article_analysis?.impact_level ?? "low",
    urgencyLevel: "medium",
    confidenceScore: row.article_analysis?.confidence_score ?? 0,
    businessRelevanceScore: row.article_analysis?.business_relevance_score ?? 0,
    workerRelevanceScore: row.article_analysis?.worker_relevance_score ?? 0,
    noveltyScore: row.article_analysis?.novelty_score ?? 0,
    sourceAuthorityScore: 0,
    businessImplications: [],
    workerImplications: [],
    recommendedActions: [],
    factCheckFlags: [],
    summary: row.article_analysis?.summary ?? null,
    aiModel: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

export async function runClusteringPass(limit = 50) {
  const { data: articles, error: articlesError } = await supabaseAdmin
    .from("normalized_articles")
    .select("id, title, published_at")
    .order("published_at", { ascending: false })
    .limit(limit);

  if (articlesError) {
    if (articlesError.code === "42P01") {
      return { analyzedArticles: 0, createdOrUpdatedClusters: 0, linkedArticles: 0 };
    }
    throw articlesError;
  }

  const articleIds = (articles ?? []).map((a) => String(a.id));
  if (articleIds.length === 0) {
    return { analyzedArticles: 0, createdOrUpdatedClusters: 0, linkedArticles: 0 };
  }

  const { data: analysisRows, error: analysisError } = await supabaseAdmin
    .from("article_analysis")
    .select("normalized_article_id, category, subtopics, summary, is_relevant, business_relevance_score, worker_relevance_score, novelty_score, confidence_score, impact_level, primary_audience")
    .in("normalized_article_id", articleIds);

  if (analysisError) {
    if (analysisError.code === "42P01") {
      return { analyzedArticles: 0, createdOrUpdatedClusters: 0, linkedArticles: 0 };
    }
    throw analysisError;
  }

  const analysisByArticleId = new Map(
    (analysisRows ?? []).map((row) => [String(row.normalized_article_id), row]),
  );

  const relevantRows: ClusterSourceRow[] = (articles ?? [])
    .map((article) => {
      const analysis = analysisByArticleId.get(String(article.id));
      return {
        id: String(article.id),
        title: String(article.title),
        published_at: (article.published_at as string | null) ?? null,
        article_analysis: analysis ? {
          category: analysis.category as AnalysisCategory | null,
          subtopics: (analysis.subtopics as string[] | null) ?? [],
          summary: (analysis.summary as string | null) ?? null,
          is_relevant: Boolean(analysis.is_relevant),
          business_relevance_score: Number(analysis.business_relevance_score ?? 0),
          worker_relevance_score: Number(analysis.worker_relevance_score ?? 0),
          novelty_score: Number(analysis.novelty_score ?? 0),
          confidence_score: Number(analysis.confidence_score ?? 0),
          impact_level: (analysis.impact_level as ImpactLevel) ?? "low",
          primary_audience: (analysis.primary_audience as AudienceType | null) ?? null,
        } : null,
      };
    })
    .filter((row) => row.article_analysis?.is_relevant) as ClusterSourceRow[];

  const grouped = new Map<string, ClusterSourceRow[]>();

  for (const row of relevantRows) {
    const cluster = deriveClusterKey(row);
    const existing = grouped.get(cluster.slug) ?? [];
    existing.push(row);
    grouped.set(cluster.slug, existing);
  }

  let createdOrUpdatedClusters = 0;
  let linkedArticles = 0;

  for (const [slug, rows] of grouped.entries()) {
    const { themeTitle } = deriveClusterKey(rows[0]);
    const analyses = rows.map(toArticleAnalysisRecord);

    const clusterRecord = buildClusterRecord({
      slug,
      themeTitle,
      summary: summarizeCluster(rows),
      analyses,
      articles: rows.map((row) => ({
        id: row.id,
        publishedAt: row.published_at,
      })),
    });

    const { data: clusterRow, error: clusterError } = await supabaseAdmin
      .from("content_clusters")
      .upsert(
        {
          slug: clusterRecord.slug,
          theme_title: clusterRecord.themeTitle,
          summary: clusterRecord.summary,
          time_window_start: clusterRecord.timeWindowStart,
          time_window_end: clusterRecord.timeWindowEnd,
          trend_score: clusterRecord.trendScore,
          business_relevance_score: clusterRecord.businessRelevanceScore,
          worker_relevance_score: clusterRecord.workerRelevanceScore,
          editorial_potential_score: clusterRecord.editorialPotentialScore,
          suggested_angles: clusterRecord.suggestedAngles,
          suggested_headlines: clusterRecord.suggestedHeadlines,
          meta_description_ideas: clusterRecord.metaDescriptionIdeas,
        },
        { onConflict: "slug" },
      )
      .select("id")
      .single();

    if (clusterError) {
      throw clusterError;
    }

    createdOrUpdatedClusters += 1;

    const clusterId = String(clusterRow.id);
    const linkRows = rows.map((row) => ({
      cluster_id: clusterId,
      normalized_article_id: row.id,
    }));

    const { error: linkError } = await supabaseAdmin
      .from("cluster_articles")
      .upsert(linkRows, { onConflict: "cluster_id,normalized_article_id" });

    if (linkError) {
      throw linkError;
    }

    linkedArticles += linkRows.length;
  }

  return {
    analyzedArticles: relevantRows.length,
    createdOrUpdatedClusters,
    linkedArticles,
  };
}
