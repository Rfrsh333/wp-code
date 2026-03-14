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

const contentBlockSchema = z.object({
  type: z.string(),
}).passthrough();

export const draftGenerationSchema = z.object({
  title: z.string().min(10),
  slug: z.string().min(3),
  excerpt: z.string().min(30),
  bodyMarkdown: z.string().catch(""),
  bodyBlocks: z.array(contentBlockSchema).catch([]),
  keyTakeaways: z.array(z.string()).default([]).catch([]),
  impactSummary: z.string().catch("Geen impactsamenvatting beschikbaar."),
  actionSteps: z.array(z.string()).default([]).catch([]),
  seoTitle: z.string().catch(""),
  metaDescription: z.string().catch(""),
  reviewNotes: z.string().catch("Automatisch gegenereerd, review nodig."),
  factCheckFlags: z.array(z.string()).default([]),
  imagePromptSuggestion: z.string().catch("Professionele foto gerelateerd aan het onderwerp."),
  visualDirection: z.string().catch("Editorial fotografie stijl."),
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
