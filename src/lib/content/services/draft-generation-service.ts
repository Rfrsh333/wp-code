import "server-only";

import { z } from "zod";
import { buildDraftGenerationPrompt, buildTemplateDraftPrompt } from "@/lib/ai/content-prompts";
import { draftGenerationSchema, parseStructuredJson } from "@/lib/ai/json-output";
import { templateDraftSchema } from "@/lib/ai/template-schema";
import { buildBodyBlocksFromTemplate, buildBodyMarkdownFromTemplate } from "@/lib/content/template-builder";
import { supabaseAdmin } from "@/lib/supabase";
import { OpenAIContentClient } from "@/lib/ai/openai-content-client";
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
  const rawResponse = await client.generateText(prompt, { maxTokens: 16384, temperature: 0.4 });
  return parseStructuredJson(rawResponse, draftGenerationSchema);
}

export async function generateEditorialDraftWithTemplate(
  client: AiTextClient,
  input: {
    audience: AudienceType;
    draftType: ContentType;
    clusterTitle: string;
    clusterSummary: string;
    articleSummaries: Array<{ title: string; sourceName: string; url: string; summary: string }>;
  },
): Promise<DraftGenerationResult> {
  const prompt = buildTemplateDraftPrompt(input);
  const rawResponse = await client.generateText(prompt, { maxTokens: 4096, temperature: 0.4 });
  const templateDraft = parseStructuredJson(rawResponse, templateDraftSchema);

  const bodyBlocks = buildBodyBlocksFromTemplate(templateDraft, input.audience);
  const bodyMarkdown = buildBodyMarkdownFromTemplate(templateDraft);

  return {
    title: templateDraft.title,
    slug: templateDraft.slug,
    excerpt: templateDraft.excerpt,
    bodyMarkdown,
    bodyBlocks,
    keyTakeaways: templateDraft.keyTakeaways,
    impactSummary: templateDraft.impactSummary,
    actionSteps: templateDraft.actionSteps,
    seoTitle: templateDraft.seoTitle,
    metaDescription: templateDraft.metaDescription,
    reviewNotes: "Automatisch gegenereerd via template-aanpak, review nodig.",
    factCheckFlags: templateDraft.factCheckFlags,
    imagePromptSuggestion: templateDraft.imagePromptSuggestion,
    visualDirection: templateDraft.visualDirection,
  };
}

const regenerateTemplateSchema = templateDraftSchema.pick({
  introText: true,
  contextHighlight: true,
  sections: true,
  stats: true,
  keyTakeaways: true,
});

export async function regenerateBodyBlocks(draftId: string): Promise<void> {
  const { data: draft, error: draftError } = await supabaseAdmin
    .from("editorial_drafts")
    .select("id, title, excerpt, body_markdown, primary_audience, key_takeaways, source_list")
    .eq("id", draftId)
    .single();

  if (draftError || !draft) {
    throw draftError ?? new Error("Draft niet gevonden.");
  }

  const audience = (draft.primary_audience as AudienceType) ?? "ondernemers";
  const keyTakeaways = Array.isArray(draft.key_takeaways) ? draft.key_takeaways : [];

  const prompt = `
Je bent de redacteur van TopTalent Jobs. Herschrijf het volgende artikel naar het template-formaat.

Geef strict JSON terug met EXACT deze velden:
- introText: 1-2 alinea's inleiding (plain text, gescheiden door dubbele newline)
- contextHighlight: { title, content }
- sections: array van 4-6 secties, elk met:
  - heading, paragraphs (verplicht)
  - subsections, highlight, checklistTitle, checklistItems, quoteText, comparisonHeaders, comparisonRows, tableHeaders, tableRows (optioneel)
- stats: array van { value, label }
- keyTakeaways: 5-8 conclusies

Het artikel:
Titel: ${String(draft.title)}
Doelgroep: ${audience}
Bestaande takeaways: ${keyTakeaways.join("; ")}
Body:
${String(draft.body_markdown)}
`.trim();

  const client = new OpenAIContentClient();
  const rawResponse = await client.generateText(prompt, { maxTokens: 4096, temperature: 0.4 });
  const result = parseStructuredJson(rawResponse, regenerateTemplateSchema);

  const templateDraft = {
    ...result,
    title: String(draft.title),
    slug: "",
    excerpt: String(draft.excerpt ?? ""),
    seoTitle: "",
    metaDescription: "",
    actionSteps: [],
    factCheckFlags: [],
    imagePromptSuggestion: "",
    visualDirection: "",
    impactSummary: "",
  };

  const bodyBlocks = buildBodyBlocksFromTemplate(templateDraft, audience);

  if (bodyBlocks.length === 0) {
    throw new Error("Template builder kon geen bodyBlocks genereren.");
  }

  const { error: updateError } = await supabaseAdmin
    .from("editorial_drafts")
    .update({ body_blocks: bodyBlocks })
    .eq("id", draftId);

  if (updateError) {
    throw updateError;
  }

  console.log(`[content] Regenerated ${bodyBlocks.length} bodyBlocks (template) for draft ${draftId}`);
}
