import type {
  ArticleAnalysisRecord,
  RuleAction,
  RuleCondition,
  SourceRecord,
  SourceRuleRecord,
} from "@/lib/content/types";

export interface RuleEngineArticleContext {
  title: string;
  cleanedText: string;
}

export interface RuleEngineResult {
  matchedRuleIds: string[];
  tags: string[];
  audiences: string[];
  queues: string[];
  priorities: string[];
}

function getConditionHaystack(
  condition: RuleCondition,
  source: Pick<SourceRecord, "categoryFocus" | "region">,
  article: RuleEngineArticleContext,
  analysis: Pick<ArticleAnalysisRecord, "category" | "impactLevel">,
): string | string[] | null {
  switch (condition.field) {
    case "source.category_focus":
      return source.categoryFocus;
    case "source.region":
      return source.region;
    case "article.title":
      return article.title;
    case "article.cleaned_text":
      return article.cleanedText;
    case "analysis.category":
      return analysis.category;
    case "analysis.impact_level":
      return analysis.impactLevel;
    default:
      return null;
  }
}

function matchesCondition(
  condition: RuleCondition,
  source: Pick<SourceRecord, "categoryFocus" | "region">,
  article: RuleEngineArticleContext,
  analysis: Pick<ArticleAnalysisRecord, "category" | "impactLevel">,
): boolean {
  const haystack = getConditionHaystack(condition, source, article, analysis);

  if (haystack === null) {
    return false;
  }

  if (condition.operator === "equals") {
    return haystack === condition.value;
  }

  if (condition.operator === "in") {
    return Array.isArray(condition.value) && condition.value.includes(String(haystack));
  }

  if (condition.operator === "contains") {
    return String(haystack).toLowerCase().includes(String(condition.value).toLowerCase());
  }

  if (condition.operator === "contains_any") {
    const values = Array.isArray(condition.value) ? condition.value : [condition.value];

    if (Array.isArray(haystack)) {
      return values.some((value) => haystack.some((item) => item.toLowerCase().includes(value.toLowerCase())));
    }

    return values.some((value) => String(haystack).toLowerCase().includes(value.toLowerCase()));
  }

  return false;
}

function applyAction(result: RuleEngineResult, action: RuleAction) {
  if (action.type === "tag") {
    result.tags.push(action.value);
  }

  if (action.type === "set_audience") {
    result.audiences.push(action.value);
  }

  if (action.type === "route_review_queue") {
    result.queues.push(action.value);
  }

  if (action.type === "set_priority") {
    result.priorities.push(action.value);
  }
}

export function evaluateSourceRules(params: {
  rules: SourceRuleRecord[];
  source: Pick<SourceRecord, "categoryFocus" | "region">;
  article: RuleEngineArticleContext;
  analysis: Pick<ArticleAnalysisRecord, "category" | "impactLevel">;
}): RuleEngineResult {
  const result: RuleEngineResult = {
    matchedRuleIds: [],
    tags: [],
    audiences: [],
    queues: [],
    priorities: [],
  };

  const activeRules = params.rules
    .filter((rule) => rule.isActive)
    .sort((left, right) => right.priority - left.priority);

  for (const rule of activeRules) {
    const matches = rule.conditions.every((condition) =>
      matchesCondition(condition, params.source, params.article, params.analysis),
    );

    if (!matches) {
      continue;
    }

    result.matchedRuleIds.push(rule.id);
    rule.actions.forEach((action) => applyAction(result, action));
  }

  result.tags = Array.from(new Set(result.tags));
  result.audiences = Array.from(new Set(result.audiences));
  result.queues = Array.from(new Set(result.queues));
  result.priorities = Array.from(new Set(result.priorities));

  return result;
}
