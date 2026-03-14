import "server-only";

import { supabaseAdmin } from "@/lib/supabase";
import type {
  ContentClusterRecord,
  EditorialDraftRecord,
  GeneratedImageRecord,
  ReviewStatus,
  SourceHealthStatus,
  SourceRecord,
} from "@/lib/content/types";

type QueryError = { message?: string; code?: string } | null;
type GenericRow = Record<string, unknown>;

function isMissingRelationError(error: QueryError): boolean {
  return Boolean(
    error && (error.code === "42P01" || error.message?.toLowerCase().includes("does not exist")),
  );
}

function handleQueryError(scope: string, error: unknown) {
  console.error(`[content] Failed to query ${scope}`, error);
}

function mapSourceRow(row: GenericRow): SourceRecord {
  return {
    id: String(row.id),
    name: String(row.name),
    sourceType: row.source_type as SourceRecord["sourceType"],
    sourceUrl: String(row.source_url),
    rssUrl: (row.rss_url as string | null) ?? null,
    categoryFocus: Array.isArray(row.category_focus) ? (row.category_focus as string[]) : [],
    region: (row.region as string | null) ?? null,
    trustLevel: row.trust_level as SourceRecord["trustLevel"],
    isActive: Boolean(row.is_active),
    fetchFrequency: row.fetch_frequency as SourceRecord["fetchFrequency"],
    ruleProfile: (row.rule_profile as string | null) ?? null,
    lastFetchedAt: (row.last_fetched_at as string | null) ?? null,
    lastErrorAt: (row.last_error_at as string | null) ?? null,
    lastErrorMessage: (row.last_error_message as string | null) ?? null,
    healthStatus: (row.health_status as SourceHealthStatus) ?? "healthy",
    consecutiveErrorCount: Number(row.consecutive_error_count ?? 0),
    avgFetchTimeMs: (row.avg_fetch_time_ms as number | null) ?? null,
    articlesFoundLastRun: (row.articles_found_last_run as number | null) ?? null,
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  };
}

function mapClusterRow(row: GenericRow): ContentClusterRecord {
  return {
    id: String(row.id),
    slug: String(row.slug),
    themeTitle: String(row.theme_title),
    summary: (row.summary as string | null) ?? null,
    timeWindowStart: (row.time_window_start as string | null) ?? null,
    timeWindowEnd: (row.time_window_end as string | null) ?? null,
    trendScore: Number(row.trend_score ?? 0),
    businessRelevanceScore: Number(row.business_relevance_score ?? 0),
    workerRelevanceScore: Number(row.worker_relevance_score ?? 0),
    editorialPotentialScore: Number(row.editorial_potential_score ?? 0),
    suggestedAngles: Array.isArray(row.suggested_angles) ? (row.suggested_angles as string[]) : [],
    suggestedHeadlines: Array.isArray(row.suggested_headlines) ? (row.suggested_headlines as string[]) : [],
    metaDescriptionIdeas: Array.isArray(row.meta_description_ideas) ? (row.meta_description_ideas as string[]) : [],
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  };
}

function mapDraftRow(row: GenericRow): EditorialDraftRecord {
  return {
    id: String(row.id),
    clusterId: (row.cluster_id as string | null) ?? null,
    draftType: row.draft_type as EditorialDraftRecord["draftType"],
    reviewStatus: row.review_status as EditorialDraftRecord["reviewStatus"],
    primaryAudience: (row.primary_audience as EditorialDraftRecord["primaryAudience"]) ?? null,
    secondaryAudience: Array.isArray(row.secondary_audience)
      ? (row.secondary_audience as EditorialDraftRecord["secondaryAudience"])
      : [],
    title: String(row.title),
    slug: String(row.slug),
    excerpt: String(row.excerpt),
    bodyMarkdown: String(row.body_markdown),
    bodyBlocks: Array.isArray(row.body_blocks)
      ? (row.body_blocks as EditorialDraftRecord["bodyBlocks"])
      : row.body_blocks && typeof row.body_blocks === "string"
        ? (() => { try { return JSON.parse(row.body_blocks as string); } catch { return null; } })()
        : null,
    keyTakeaways: Array.isArray(row.key_takeaways) ? (row.key_takeaways as string[]) : [],
    impactSummary: (row.impact_summary as string | null) ?? null,
    actionSteps: Array.isArray(row.action_steps) ? (row.action_steps as string[]) : [],
    sourceList: Array.isArray(row.source_list)
      ? (row.source_list as EditorialDraftRecord["sourceList"])
      : [],
    seoTitle: (row.seo_title as string | null) ?? null,
    metaDescription: (row.meta_description as string | null) ?? null,
    reviewNotes: (row.review_notes as string | null) ?? null,
    factCheckFlags: Array.isArray(row.fact_check_flags) ? (row.fact_check_flags as string[]) : [],
    imagePromptSuggestion: (row.image_prompt_suggestion as string | null) ?? null,
    visualDirection: (row.visual_direction as string | null) ?? null,
    heroImageId: (row.hero_image_id as string | null) ?? null,
    publishedAt: (row.published_at as string | null) ?? null,
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  };
}

function mapImageRow(row: GenericRow): GeneratedImageRecord {
  return {
    id: String(row.id),
    draftId: String(row.draft_id),
    status: row.status as GeneratedImageRecord["status"],
    prompt: String(row.prompt),
    altText: (row.alt_text as string | null) ?? null,
    storagePathOriginal: (row.storage_path_original as string | null) ?? null,
    storagePathBranded: (row.storage_path_branded as string | null) ?? null,
    width: (row.width as number | null) ?? null,
    height: (row.height as number | null) ?? null,
    generationModel: (row.generation_model as string | null) ?? null,
    errorMessage: (row.error_message as string | null) ?? null,
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  };
}

export async function listActiveSources(): Promise<SourceRecord[]> {
  try {
    const { data, error } = await supabaseAdmin
      .from("sources")
      .select("*")
      .eq("is_active", true)
      .order("trust_level", { ascending: false })
      .order("name", { ascending: true });

    if (error) {
      console.error("[repo] listActiveSources error:", error.code, error.message);
      if (isMissingRelationError(error)) {
        return [];
      }

      throw error;
    }

    console.log(`[repo] listActiveSources: ${(data ?? []).length} rows`);
    return (data ?? []).map((row) => mapSourceRow(row as GenericRow));
  } catch (error) {
    handleQueryError("sources", error);
    throw error;
  }
}

export async function listRecentClusters(limit = 20): Promise<ContentClusterRecord[]> {
  try {
    const { data, error } = await supabaseAdmin
      .from("content_clusters")
      .select("*")
      .order("updated_at", { ascending: false })
      .limit(limit);

    if (error) {
      console.error("[repo] listRecentClusters error:", error.code, error.message);
      if (isMissingRelationError(error)) {
        return [];
      }

      throw error;
    }

    console.log(`[repo] listRecentClusters: ${(data ?? []).length} rows`);
    return (data ?? []).map((row) => mapClusterRow(row as GenericRow));
  } catch (error) {
    handleQueryError("content_clusters", error);
    return [];
  }
}

export async function listDraftsByStatus(status?: ReviewStatus, limit = 20): Promise<EditorialDraftRecord[]> {
  try {
    let query = supabaseAdmin
      .from("editorial_drafts")
      .select("*")
      .order("updated_at", { ascending: false })
      .limit(limit);

    if (status) {
      query = query.eq("review_status", status);
    }

    const { data, error } = await query;

    if (error) {
      console.error("[repo] listDraftsByStatus error:", error.code, error.message);
      if (isMissingRelationError(error)) {
        return [];
      }

      throw error;
    }

    console.log(`[repo] listDraftsByStatus(${status ?? "all"}): ${(data ?? []).length} rows`);
    return (data ?? []).map((row) => mapDraftRow(row as GenericRow));
  } catch (error) {
    handleQueryError("editorial_drafts", error);
    return [];
  }
}

export async function getPublishedDraftBySlug(slug: string): Promise<EditorialDraftRecord | null> {
  try {
    const { data, error } = await supabaseAdmin
      .from("editorial_drafts")
      .select("*")
      .eq("slug", slug)
      .eq("review_status", "published")
      .maybeSingle();

    if (error) {
      if (isMissingRelationError(error)) {
        return null;
      }

      throw error;
    }

    return data ? mapDraftRow(data as GenericRow) : null;
  } catch (error) {
    handleQueryError("editorial_drafts.by_slug", error);
    return null;
  }
}

export async function listPublishedDrafts(limit = 24): Promise<EditorialDraftRecord[]> {
  try {
    const { data, error } = await supabaseAdmin
      .from("editorial_drafts")
      .select("*")
      .eq("review_status", "published")
      .order("published_at", { ascending: false })
      .limit(limit);

    if (error) {
      if (isMissingRelationError(error)) {
        return [];
      }

      throw error;
    }

    return (data ?? []).map((row) => mapDraftRow(row as GenericRow));
  } catch (error) {
    handleQueryError("editorial_drafts.published", error);
    return [];
  }
}

export async function getDraftById(draftId: string): Promise<EditorialDraftRecord | null> {
  try {
    const { data, error } = await supabaseAdmin
      .from("editorial_drafts")
      .select("*")
      .eq("id", draftId)
      .maybeSingle();

    if (error) {
      if (isMissingRelationError(error)) {
        return null;
      }

      throw error;
    }

    return data ? mapDraftRow(data as GenericRow) : null;
  } catch (error) {
    handleQueryError("editorial_drafts.by_id", error);
    return null;
  }
}

export async function getGeneratedImageForDraft(draftId: string): Promise<GeneratedImageRecord | null> {
  try {
    const { data, error } = await supabaseAdmin
      .from("generated_images")
      .select("*")
      .eq("draft_id", draftId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      if (isMissingRelationError(error)) {
        return null;
      }

      throw error;
    }

    return data ? mapImageRow(data as GenericRow) : null;
  } catch (error) {
    handleQueryError("generated_images.by_draft", error);
    return null;
  }
}

export async function getGeneratedImageById(imageId: string): Promise<GeneratedImageRecord | null> {
  try {
    const { data, error } = await supabaseAdmin
      .from("generated_images")
      .select("*")
      .eq("id", imageId)
      .maybeSingle();

    if (error) {
      if (isMissingRelationError(error)) {
        return null;
      }

      throw error;
    }

    return data ? mapImageRow(data as GenericRow) : null;
  } catch (error) {
    handleQueryError("generated_images.by_id", error);
    return null;
  }
}

export async function getContentOverview() {
  const [sources, clusters, drafts, publishedDrafts] = await Promise.all([
    listActiveSources(),
    listRecentClusters(6),
    listDraftsByStatus(undefined, 8),
    listPublishedDrafts(8),
  ]);

  return {
    metrics: {
      activeSources: sources.length,
      liveClusters: clusters.length,
      draftQueue: drafts.filter((draft) => draft.reviewStatus !== "published").length,
      publishedCount: publishedDrafts.length,
    },
    sources,
    clusters,
    drafts,
    publishedDrafts,
  };
}
