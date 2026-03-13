export const sourceTypes = ["rss", "scrape", "manual"] as const;
export type SourceType = (typeof sourceTypes)[number];

export const sourceTrustLevels = ["low", "medium", "high", "verified"] as const;
export type SourceTrustLevel = (typeof sourceTrustLevels)[number];

export const fetchFrequencies = ["hourly", "every_6_hours", "daily", "weekly"] as const;
export type FetchFrequency = (typeof fetchFrequencies)[number];

export const contentStatuses = ["pending", "processed", "rejected", "error"] as const;
export type ContentStatus = (typeof contentStatuses)[number];

export const audienceTypes = [
  "ondernemers",
  "werkgevers",
  "uitzendbureaus",
  "medewerkers",
  "zzpers",
  "hotel_operators",
] as const;
export type AudienceType = (typeof audienceTypes)[number];

export const impactLevels = ["low", "medium", "high"] as const;
export type ImpactLevel = (typeof impactLevels)[number];

export const urgencyLevels = ["low", "medium", "high", "critical"] as const;
export type UrgencyLevel = (typeof urgencyLevels)[number];

export const analysisCategories = [
  "horeca_nieuws",
  "hospitality_trends",
  "arbeidsmarkt",
  "recruitment",
  "wetgeving",
  "vergunningen",
  "compliance",
  "operations",
  "hr",
  "hotel_nieuws",
] as const;
export type AnalysisCategory = (typeof analysisCategories)[number];

export const contentTypes = [
  "breaking_news",
  "analysis",
  "explainer",
  "roundup",
  "opinion",
  "guide",
] as const;
export type ContentType = (typeof contentTypes)[number];

export const reviewStatuses = [
  "draft",
  "needs_review",
  "approved",
  "rejected",
  "published",
] as const;
export type ReviewStatus = (typeof reviewStatuses)[number];

export const imageStatuses = [
  "queued",
  "prompt_ready",
  "generating",
  "branding",
  "completed",
  "failed",
] as const;
export type ImageStatus = (typeof imageStatuses)[number];

export interface SourceRecord {
  id: string;
  name: string;
  sourceType: SourceType;
  sourceUrl: string;
  rssUrl: string | null;
  categoryFocus: string[];
  region: string | null;
  trustLevel: SourceTrustLevel;
  isActive: boolean;
  fetchFrequency: FetchFrequency;
  ruleProfile: string | null;
  lastFetchedAt: string | null;
  lastErrorAt: string | null;
  lastErrorMessage: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface RawArticleRecord {
  id: string;
  sourceId: string;
  externalId: string | null;
  sourceUrl: string;
  canonicalUrl: string | null;
  title: string | null;
  author: string | null;
  publishedAt: string | null;
  excerpt: string | null;
  rawHtml: string | null;
  rawText: string | null;
  language: string | null;
  hash: string | null;
  fetchStatus: ContentStatus;
  fetchError: string | null;
  provenance: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface NormalizedArticleRecord {
  id: string;
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
  createdAt: string;
  updatedAt: string;
}

export interface ArticleAnalysisRecord {
  id: string;
  normalizedArticleId: string;
  isRelevant: boolean;
  isNoise: boolean;
  primaryAudience: AudienceType | null;
  secondaryAudience: AudienceType[];
  category: AnalysisCategory | null;
  subtopics: string[];
  contentType: ContentType | null;
  impactLevel: ImpactLevel;
  urgencyLevel: UrgencyLevel;
  confidenceScore: number;
  businessRelevanceScore: number;
  workerRelevanceScore: number;
  noveltyScore: number;
  sourceAuthorityScore: number;
  businessImplications: string[];
  workerImplications: string[];
  recommendedActions: string[];
  factCheckFlags: string[];
  summary: string | null;
  aiModel: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface RuleCondition {
  field:
    | "source.category_focus"
    | "source.region"
    | "article.title"
    | "article.cleaned_text"
    | "analysis.category"
    | "analysis.impact_level";
  operator: "contains" | "contains_any" | "equals" | "in";
  value: string | string[];
}

export interface RuleAction {
  type: "tag" | "set_priority" | "route_review_queue" | "set_audience";
  value: string;
}

export interface SourceRuleRecord {
  id: string;
  sourceId: string | null;
  name: string;
  description: string | null;
  priority: number;
  isActive: boolean;
  conditions: RuleCondition[];
  actions: RuleAction[];
  createdAt: string;
  updatedAt: string;
}

export interface DuplicateGroupRecord {
  id: string;
  canonicalUrl: string | null;
  primaryNormalizedArticleId: string | null;
  similarityScore: number;
  reason: string;
  createdAt: string;
  updatedAt: string;
}

export interface ContentClusterRecord {
  id: string;
  slug: string;
  themeTitle: string;
  summary: string | null;
  timeWindowStart: string | null;
  timeWindowEnd: string | null;
  trendScore: number;
  businessRelevanceScore: number;
  workerRelevanceScore: number;
  editorialPotentialScore: number;
  suggestedAngles: string[];
  suggestedHeadlines: string[];
  metaDescriptionIdeas: string[];
  createdAt: string;
  updatedAt: string;
}

export interface EditorialDraftRecord {
  id: string;
  clusterId: string | null;
  draftType: ContentType;
  reviewStatus: ReviewStatus;
  primaryAudience: AudienceType | null;
  secondaryAudience: AudienceType[];
  title: string;
  slug: string;
  excerpt: string;
  bodyMarkdown: string;
  keyTakeaways: string[];
  impactSummary: string | null;
  actionSteps: string[];
  sourceList: Array<{ title: string; url: string; sourceName: string }>;
  seoTitle: string | null;
  metaDescription: string | null;
  reviewNotes: string | null;
  factCheckFlags: string[];
  imagePromptSuggestion: string | null;
  visualDirection: string | null;
  heroImageId: string | null;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface GeneratedImageRecord {
  id: string;
  draftId: string;
  status: ImageStatus;
  prompt: string;
  altText: string | null;
  storagePathOriginal: string | null;
  storagePathBranded: string | null;
  width: number | null;
  height: number | null;
  generationModel: string | null;
  errorMessage: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PublishQueueRecord {
  id: string;
  draftId: string;
  scheduledFor: string | null;
  status: ReviewStatus;
  notes: string | null;
  publishedUrl: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ReviewEventRecord {
  id: string;
  entityType: "article" | "cluster" | "draft" | "image";
  entityId: string;
  eventType: "approved" | "rejected" | "requested_changes" | "published" | "queued";
  actorEmail: string | null;
  note: string | null;
  metadata: Record<string, unknown>;
  createdAt: string;
}

export interface IngestedFeedItem {
  guid: string | null;
  link: string;
  title: string;
  excerpt: string | null;
  author: string | null;
  publishedAt: string | null;
}

export interface ParsedFeed {
  title: string | null;
  description: string | null;
  items: IngestedFeedItem[];
}

export interface ClassificationResult {
  isRelevant: boolean;
  isNoise: boolean;
  primaryAudience: AudienceType | null;
  secondaryAudience: AudienceType[];
  category: AnalysisCategory | null;
  subtopics: string[];
  contentType: ContentType;
  impactLevel: ImpactLevel;
  urgencyLevel: UrgencyLevel;
  confidenceScore: number;
  businessRelevanceScore: number;
  workerRelevanceScore: number;
  noveltyScore: number;
  sourceAuthorityScore: number;
  businessImplications: string[];
  workerImplications: string[];
  recommendedActions: string[];
  factCheckFlags: string[];
  summary: string;
}

export interface DraftGenerationResult {
  title: string;
  slug: string;
  excerpt: string;
  bodyMarkdown: string;
  keyTakeaways: string[];
  impactSummary: string;
  actionSteps: string[];
  seoTitle: string;
  metaDescription: string;
  reviewNotes: string;
  factCheckFlags: string[];
  imagePromptSuggestion: string;
  visualDirection: string;
}

export interface ImagePromptResult {
  prompt: string;
  altText: string;
  visualDirection: string;
}
