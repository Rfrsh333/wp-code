import "server-only";

import { supabaseAdmin } from "@/lib/supabase";
import { createJobRun, failJobRun, finishJobRun } from "@/lib/content/job-runs";
import { OpenAIContentClient } from "@/lib/ai/openai-content-client";
import { classifyNormalizedArticle } from "@/lib/content/services/article-classification-service";
import { persistArticleAnalysis } from "@/lib/content/services/analysis-persistence-service";
import type { SourceRuleRecord } from "@/lib/content/types";

function mapSourceRules(rows: Array<Record<string, unknown>>): SourceRuleRecord[] {
  return rows.map((row) => ({
    id: String(row.id),
    sourceId: (row.source_id as string | null) ?? null,
    name: String(row.name),
    description: (row.description as string | null) ?? null,
    priority: Number(row.priority ?? 0),
    isActive: Boolean(row.is_active),
    conditions: Array.isArray(row.conditions)
      ? (row.conditions as SourceRuleRecord["conditions"])
      : [],
    actions: Array.isArray(row.actions)
      ? (row.actions as SourceRuleRecord["actions"])
      : [],
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  }));
}

export async function analyzeNormalizedArticle(normalizedArticleId: string) {
  const jobRunId = await createJobRun("content.classifyArticle", { normalizedArticleId });

  try {
    const { data: article, error: articleError } = await supabaseAdmin
      .from("normalized_articles")
      .select("id, source_id, title, excerpt, cleaned_text")
      .eq("id", normalizedArticleId)
      .single();

    if (articleError || !article) {
      throw articleError ?? new Error("Normalized article not found.");
    }

    const { data: source, error: sourceError } = await supabaseAdmin
      .from("sources")
      .select("id, name, category_focus, region")
      .eq("id", article.source_id as string)
      .single();

    if (sourceError || !source) {
      throw sourceError ?? new Error("Source not found.");
    }

    const { data: rules, error: rulesError } = await supabaseAdmin
      .from("source_rules")
      .select("id, source_id, name, description, priority, is_active, conditions, actions, created_at, updated_at")
      .or(`source_id.is.null,source_id.eq.${source.id}`);

    if (rulesError && rulesError.code !== "42P01") {
      throw rulesError;
    }

    const client = new OpenAIContentClient();
    const analysis = await classifyNormalizedArticle(client, {
      sourceName: String(source.name),
      title: String(article.title),
      excerpt: (article.excerpt as string | null) ?? null,
      cleanedText: String(article.cleaned_text),
    });

    const persistence = await persistArticleAnalysis({
      normalizedArticleId,
      source: {
        id: String(source.id),
        categoryFocus: Array.isArray(source.category_focus)
          ? (source.category_focus as string[])
          : [],
        region: (source.region as string | null) ?? null,
      },
      article: {
        title: String(article.title),
        cleanedText: String(article.cleaned_text),
      },
      analysis,
      rules: mapSourceRules((rules ?? []) as Array<Record<string, unknown>>),
      modelName: process.env.OPENAI_CONTENT_MODEL || "gpt-5-mini",
    });

    await finishJobRun(jobRunId, {
      normalizedArticleId,
      primaryAudience: analysis.primaryAudience,
      category: analysis.category,
      matchedRuleIds: persistence.matchedRuleIds,
      tags: persistence.tags,
    });

    return {
      analysis,
      persistence,
    };
  } catch (error) {
    await failJobRun(jobRunId, error);
    throw error;
  }
}

export async function runPendingAnalysisPass(limit = 10) {
  const { data: normalizedRows, error: normalizedError } = await supabaseAdmin
    .from("normalized_articles")
    .select("id")
    .order("published_at", { ascending: false })
    .limit(limit);

  if (normalizedError) {
    if (normalizedError.code === "42P01") {
      return {
        attempted: 0,
        analyzed: 0,
        failed: 0,
        results: [],
      };
    }

    throw normalizedError;
  }

  const { data: analyzedRows, error: analyzedError } = await supabaseAdmin
    .from("article_analysis")
    .select("normalized_article_id");

  if (analyzedError && analyzedError.code !== "42P01") {
    throw analyzedError;
  }

  const analyzedIds = new Set((analyzedRows ?? []).map((row) => String(row.normalized_article_id)));
  const pendingIds = (normalizedRows ?? [])
    .map((row) => String(row.id))
    .filter((id) => !analyzedIds.has(id))
    .slice(0, limit);

  return analyzeArticleIds(pendingIds);
}

async function analyzeArticleIds(articleIds: string[]) {
  const results: Array<{
    normalizedArticleId: string;
    status: "success" | "failed";
    error?: string;
  }> = [];

  for (const normalizedArticleId of articleIds) {
    try {
      await analyzeNormalizedArticle(normalizedArticleId);
      results.push({
        normalizedArticleId,
        status: "success",
      });
    } catch (error) {
      results.push({
        normalizedArticleId,
        status: "failed",
        error: error instanceof Error ? error.message : (error && typeof error === "object" && "message" in error ? String((error as Record<string, unknown>).message) : "Unknown analysis error"),
      });
    }
  }

  return {
    attempted: articleIds.length,
    analyzed: results.filter((result) => result.status === "success").length,
    failed: results.filter((result) => result.status === "failed").length,
    results,
  };
}
