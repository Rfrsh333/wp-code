import type { TriggerJobDefinition } from "./types";

export const contentIntelligenceJobs: TriggerJobDefinition[] = [
  {
    id: "content.fetchSources",
    name: "Fetch active sources",
    schedule: "0 * * * *",
    queue: "content-ingest",
    retryLimit: 3,
    payloadSchema: {},
    description: "Schedules ingestion for active source profiles based on fetch cadence.",
  },
  {
    id: "content.ingestFeed",
    name: "Ingest RSS feed",
    queue: "content-ingest",
    retryLimit: 5,
    payloadSchema: {
      sourceId: "uuid",
      rssUrl: "string",
    },
    description: "Fetches and parses RSS or Atom feeds into raw article records.",
  },
  {
    id: "content.extractArticle",
    name: "Extract article content",
    queue: "content-extract",
    retryLimit: 5,
    payloadSchema: {
      rawArticleId: "uuid",
    },
    description: "Fetches the canonical article page, normalizes content, and stores provenance.",
  },
  {
    id: "content.classifyArticle",
    name: "Classify normalized article",
    queue: "content-ai",
    retryLimit: 4,
    payloadSchema: {
      normalizedArticleId: "uuid",
    },
    description: "Runs AI classification, business impact scoring, and rule evaluation.",
  },
  {
    id: "content.dedupe",
    name: "Deduplicate articles",
    queue: "content-maintenance",
    retryLimit: 3,
    payloadSchema: {
      windowHours: "number",
    },
    description: "Groups exact and near-duplicate stories while preserving source provenance.",
  },
  {
    id: "content.cluster",
    name: "Cluster story themes",
    queue: "content-ai",
    retryLimit: 3,
    payloadSchema: {
      windowHours: "number",
    },
    description: "Builds editorial clusters, summaries, and trend scores from related stories.",
  },
  {
    id: "content.generateDraft",
    name: "Generate editorial draft",
    queue: "content-ai",
    retryLimit: 3,
    payloadSchema: {
      clusterId: "uuid",
      draftType: "string",
      primaryAudience: "string",
    },
    description: "Generates multi-source editorial drafts with citations and review notes.",
  },
  {
    id: "content.generateWeeklyDigest",
    name: "Generate weekly digest",
    schedule: "0 7 * * 1",
    queue: "content-ai",
    retryLimit: 2,
    payloadSchema: {},
    description: "Produces a weekly editorial roundup from top clusters and approved stories.",
  },
  {
    id: "content.generateImagePrompt",
    name: "Generate image prompt",
    queue: "content-ai",
    retryLimit: 3,
    payloadSchema: {
      draftId: "uuid",
    },
    description: "Creates a realistic hero image prompt and alt text from the editorial draft.",
  },
  {
    id: "content.generateHeroImage",
    name: "Generate hero image",
    queue: "content-images",
    retryLimit: 3,
    payloadSchema: {
      generatedImageId: "uuid",
    },
    description: "Calls the image generation provider and stores the raw render for branding.",
  },
  {
    id: "content.brandHeroImage",
    name: "Brand hero image",
    queue: "content-images",
    retryLimit: 3,
    payloadSchema: {
      generatedImageId: "uuid",
    },
    description: "Applies deterministic logo placement and orange glow post-processing.",
  },
  {
    id: "content.notifyAdmins",
    name: "Notify admins",
    queue: "content-notifications",
    retryLimit: 5,
    payloadSchema: {
      eventType: "string",
      entityId: "uuid",
    },
    description: "Sends admin notifications for priority review items and workflow failures.",
  },
];
