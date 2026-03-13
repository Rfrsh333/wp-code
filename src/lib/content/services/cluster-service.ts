import "server-only";

import { buildClusterScores } from "@/lib/scoring/content-opportunity";
import type { ArticleAnalysisRecord, ContentClusterRecord, NormalizedArticleRecord } from "@/lib/content/types";

export interface ClusterCandidate {
  slug: string;
  themeTitle: string;
  summary: string;
  analyses: ArticleAnalysisRecord[];
  articles: Pick<NormalizedArticleRecord, "id" | "publishedAt">[];
}

export function buildClusterRecord(candidate: ClusterCandidate): Omit<
  ContentClusterRecord,
  "id" | "createdAt" | "updatedAt"
> {
  const scores = buildClusterScores(candidate.analyses);
  const sortedDates = candidate.articles
    .map((article) => article.publishedAt)
    .filter((value): value is string => Boolean(value))
    .sort();

  return {
    slug: candidate.slug,
    themeTitle: candidate.themeTitle,
    summary: candidate.summary,
    timeWindowStart: sortedDates[0] ?? null,
    timeWindowEnd: sortedDates.at(-1) ?? null,
    suggestedAngles: [],
    suggestedHeadlines: [],
    metaDescriptionIdeas: [],
    ...scores,
  };
}
