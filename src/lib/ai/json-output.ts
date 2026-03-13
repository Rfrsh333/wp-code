import { z } from "zod";
import {
  analysisCategories,
  audienceTypes,
  contentTypes,
  impactLevels,
  urgencyLevels,
} from "@/lib/content/types";

export const classificationResultSchema = z.object({
  isRelevant: z.boolean().catch(true),
  isNoise: z.boolean().catch(false),
  primaryAudience: z.enum(audienceTypes).nullable().catch(null),
  secondaryAudience: z.array(z.enum(audienceTypes).catch("ondernemers")).default([]),
  category: z.enum(analysisCategories).nullable().catch(null),
  subtopics: z.array(z.string()).default([]),
  contentType: z.enum(contentTypes).catch("analysis"),
  impactLevel: z.enum(impactLevels).catch("medium"),
  urgencyLevel: z.enum(urgencyLevels).catch("low"),
  confidenceScore: z.number().min(0).max(100).catch(50),
  businessRelevanceScore: z.number().min(0).max(100).catch(50),
  workerRelevanceScore: z.number().min(0).max(100).catch(50),
  noveltyScore: z.number().min(0).max(100).catch(50),
  sourceAuthorityScore: z.number().min(0).max(100).catch(50),
  businessImplications: z.array(z.string()).default([]),
  workerImplications: z.array(z.string()).default([]),
  recommendedActions: z.array(z.string()).default([]),
  factCheckFlags: z.array(z.string()).default([]),
  summary: z.string().catch("Geen samenvatting beschikbaar."),
});

export const draftGenerationSchema = z.object({
  title: z.string().min(10),
  slug: z.string().min(3),
  excerpt: z.string().min(30),
  bodyMarkdown: z.string().min(100),
  keyTakeaways: z.array(z.string()).min(2),
  impactSummary: z.string().min(20),
  actionSteps: z.array(z.string()).min(2),
  seoTitle: z.string().min(10),
  metaDescription: z.string().min(20),
  reviewNotes: z.string().min(10),
  factCheckFlags: z.array(z.string()).default([]),
  imagePromptSuggestion: z.string().min(20),
  visualDirection: z.string().min(10),
});

export const imagePromptSchema = z.object({
  prompt: z.string().min(20),
  altText: z.string().min(10),
  visualDirection: z.string().min(10),
});

export function parseStructuredJson<T>(payload: string, schema: z.ZodType<T>): T {
  const firstBrace = payload.indexOf("{");
  const lastBrace = payload.lastIndexOf("}");

  if (firstBrace === -1 || lastBrace === -1 || lastBrace <= firstBrace) {
    throw new Error("No JSON object found in model response.");
  }

  const jsonSlice = payload.slice(firstBrace, lastBrace + 1);
  return schema.parse(JSON.parse(jsonSlice));
}
