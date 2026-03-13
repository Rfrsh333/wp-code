import "server-only";

import { classificationResultSchema, parseStructuredJson } from "@/lib/ai/json-output";
import { buildClassificationPrompt } from "@/lib/ai/content-prompts";
import { defaultCategoryAudienceMap } from "@/lib/content/constants";
import type { ClassificationResult, NormalizedArticleRecord } from "@/lib/content/types";

export interface AiTextClient {
  generateText(prompt: string): Promise<string>;
}

export async function classifyNormalizedArticle(
  client: AiTextClient,
  article: Pick<NormalizedArticleRecord, "title" | "excerpt" | "cleanedText" | "sourceName">,
): Promise<ClassificationResult> {
  const prompt = buildClassificationPrompt(article);
  const rawResponse = await client.generateText(prompt);
  const parsed = parseStructuredJson(rawResponse, classificationResultSchema);

  return {
    ...parsed,
    primaryAudience:
      parsed.primaryAudience ?? (parsed.category ? defaultCategoryAudienceMap[parsed.category] ?? null : null),
  };
}
