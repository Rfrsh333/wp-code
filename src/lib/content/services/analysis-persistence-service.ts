import "server-only";

import { supabaseAdmin } from "@/lib/supabase";
import type { ClassificationResult, SourceRuleRecord } from "@/lib/content/types";
import { evaluateSourceRules } from "@/lib/rules/engine";

interface PersistAnalysisInput {
  normalizedArticleId: string;
  source: {
    id: string;
    categoryFocus: string[];
    region: string | null;
  };
  article: {
    title: string;
    cleanedText: string;
  };
  analysis: ClassificationResult;
  rules: SourceRuleRecord[];
  modelName: string;
}

export async function persistArticleAnalysis(input: PersistAnalysisInput) {
  const ruleResult = evaluateSourceRules({
    rules: input.rules,
    source: {
      categoryFocus: input.source.categoryFocus,
      region: input.source.region,
    },
    article: {
      title: input.article.title,
      cleanedText: input.article.cleanedText,
    },
    analysis: {
      category: input.analysis.category,
      impactLevel: input.analysis.impactLevel,
    },
  });

  const mergedSecondaryAudience = Array.from(
    new Set([...input.analysis.secondaryAudience, ...ruleResult.audiences]),
  );
  const mergedFactCheckFlags = Array.from(
    new Set([
      ...input.analysis.factCheckFlags,
      ...(ruleResult.queues.includes("priority_regulation")
        ? ["Menselijke review verplicht wegens regelgeving/compliance."]
        : []),
    ]),
  );

  const { error: analysisError } = await supabaseAdmin.from("article_analysis").upsert(
    {
      normalized_article_id: input.normalizedArticleId,
      is_relevant: input.analysis.isRelevant,
      is_noise: input.analysis.isNoise,
      primary_audience: input.analysis.primaryAudience,
      secondary_audience: mergedSecondaryAudience,
      category: input.analysis.category,
      subtopics: input.analysis.subtopics,
      content_type: input.analysis.contentType,
      impact_level: input.analysis.impactLevel,
      urgency_level: input.analysis.urgencyLevel,
      confidence_score: input.analysis.confidenceScore,
      business_relevance_score: input.analysis.businessRelevanceScore,
      worker_relevance_score: input.analysis.workerRelevanceScore,
      novelty_score: input.analysis.noveltyScore,
      source_authority_score: input.analysis.sourceAuthorityScore,
      business_implications: input.analysis.businessImplications,
      worker_implications: input.analysis.workerImplications,
      recommended_actions: input.analysis.recommendedActions,
      fact_check_flags: mergedFactCheckFlags,
      summary: input.analysis.summary,
      ai_model: input.modelName,
    },
    { onConflict: "normalized_article_id" },
  );

  if (analysisError) {
    throw analysisError;
  }

  const tags = Array.from(
    new Set([
      ...input.analysis.subtopics,
      ...ruleResult.tags,
      ...(input.analysis.category ? [input.analysis.category] : []),
      ...(input.analysis.primaryAudience ? [input.analysis.primaryAudience] : []),
    ]),
  );

  if (tags.length > 0) {
    const { error: tagError } = await supabaseAdmin.from("article_tags").upsert(
      tags.map((tag) => ({
        normalized_article_id: input.normalizedArticleId,
        tag,
        origin: ruleResult.tags.includes(tag) ? "rule" : "ai",
      })),
      { onConflict: "normalized_article_id,tag" },
    );

    if (tagError) {
      throw tagError;
    }
  }

  return {
    tags,
    matchedRuleIds: ruleResult.matchedRuleIds,
    reviewQueues: ruleResult.queues,
  };
}
