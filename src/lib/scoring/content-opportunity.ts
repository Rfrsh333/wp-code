import type { ArticleAnalysisRecord, ContentClusterRecord, SourceTrustLevel } from "@/lib/content/types";

const trustScoreMap: Record<SourceTrustLevel, number> = {
  low: 20,
  medium: 50,
  high: 75,
  verified: 90,
};

export function scoreSourceAuthority(trustLevel: SourceTrustLevel): number {
  return trustScoreMap[trustLevel];
}

export function scoreTrendOpportunity(params: {
  articleCount: number;
  averageHoursOld: number;
  averageAuthority: number;
  businessRelevance: number;
  workerRelevance: number;
  novelty: number;
}): number {
  const recencyScore = Math.max(0, 100 - params.averageHoursOld * 3);
  const coverageScore = Math.min(100, params.articleCount * 20);

  return Math.round(
    coverageScore * 0.2 +
      recencyScore * 0.2 +
      params.averageAuthority * 0.15 +
      params.businessRelevance * 0.2 +
      params.workerRelevance * 0.1 +
      params.novelty * 0.15,
  );
}

export function buildClusterScores(analyses: ArticleAnalysisRecord[]): Pick<
  ContentClusterRecord,
  "trendScore" | "businessRelevanceScore" | "workerRelevanceScore" | "editorialPotentialScore"
> {
  if (analyses.length === 0) {
    return {
      trendScore: 0,
      businessRelevanceScore: 0,
      workerRelevanceScore: 0,
      editorialPotentialScore: 0,
    };
  }

  const businessRelevanceScore = Math.round(
    analyses.reduce((total, analysis) => total + analysis.businessRelevanceScore, 0) / analyses.length,
  );
  const workerRelevanceScore = Math.round(
    analyses.reduce((total, analysis) => total + analysis.workerRelevanceScore, 0) / analyses.length,
  );
  const editorialPotentialScore = Math.round(
    analyses.reduce((total, analysis) => total + analysis.noveltyScore + analysis.confidenceScore, 0) /
      (analyses.length * 2),
  );

  return {
    trendScore: Math.round((businessRelevanceScore + workerRelevanceScore + editorialPotentialScore) / 3),
    businessRelevanceScore,
    workerRelevanceScore,
    editorialPotentialScore,
  };
}
