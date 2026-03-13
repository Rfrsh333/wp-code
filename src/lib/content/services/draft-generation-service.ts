import "server-only";

import { buildDraftGenerationPrompt } from "@/lib/ai/content-prompts";
import { draftGenerationSchema, parseStructuredJson } from "@/lib/ai/json-output";
import type {
  AudienceType,
  ContentType,
  DraftGenerationResult,
} from "@/lib/content/types";
import type { AiTextClient } from "@/lib/content/services/article-classification-service";

export async function generateEditorialDraft(
  client: AiTextClient,
  input: {
    audience: AudienceType;
    draftType: ContentType;
    clusterTitle: string;
    clusterSummary: string;
    articleSummaries: Array<{ title: string; sourceName: string; url: string; summary: string }>;
  },
): Promise<DraftGenerationResult> {
  const prompt = buildDraftGenerationPrompt(input);
  const rawResponse = await client.generateText(prompt);
  return parseStructuredJson(rawResponse, draftGenerationSchema);
}
