import "server-only";

import { buildImagePromptPrompt } from "@/lib/ai/content-prompts";
import { imagePromptSchema, parseStructuredJson } from "@/lib/ai/json-output";
import { applyEditorialHeroBranding } from "@/lib/images/hero-branding";
import type { ImagePromptResult } from "@/lib/content/types";
import type { AiTextClient } from "@/lib/content/services/article-classification-service";

export async function generateImagePrompt(
  client: AiTextClient,
  input: { title: string; excerpt: string; visualDirection: string | null },
): Promise<ImagePromptResult> {
  const prompt = buildImagePromptPrompt(input);
  const rawResponse = await client.generateText(prompt);
  return parseStructuredJson(rawResponse, imagePromptSchema);
}

export async function brandGeneratedHeroImage(input: {
  buffer: Buffer;
  logoPath: string;
}) {
  return applyEditorialHeroBranding(input.buffer, {
    logoPath: input.logoPath,
  });
}
