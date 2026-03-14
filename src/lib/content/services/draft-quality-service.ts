import "server-only";

import { z } from "zod";
import { parseStructuredJson } from "@/lib/ai/json-output";
import type { AiTextClient } from "@/lib/content/services/article-classification-service";

const qualityScoreSchema = z.object({
  overallScore: z.number().min(0).max(100).catch(50),
  accuracyScore: z.number().min(0).max(100).catch(50),
  readabilityScore: z.number().min(0).max(100).catch(50),
  seoScore: z.number().min(0).max(100).catch(50),
  engagementScore: z.number().min(0).max(100).catch(50),
  issues: z.array(z.string()).default([]).catch([]),
  suggestions: z.array(z.string()).default([]).catch([]),
});

export type QualityScore = z.infer<typeof qualityScoreSchema>;

const QUALITY_THRESHOLD = 70;

function extractBlocksText(blocks: Array<Record<string, unknown>> | null): string {
  if (!blocks || blocks.length === 0) return "";
  return blocks.map((b) => {
    const parts: string[] = [];
    if (b.content) parts.push(String(b.content));
    if (b.title) parts.push(String(b.title));
    if (b.quote) parts.push(String(b.quote));
    if (Array.isArray(b.items)) parts.push(b.items.map((i: unknown) => typeof i === "string" ? i : (i as Record<string, unknown>)?.text ?? "").join("; "));
    if (Array.isArray(b.points)) parts.push((b.points as string[]).join("; "));
    return parts.join(" ");
  }).join("\n");
}

function buildQualityCheckPrompt(draft: {
  title: string;
  excerpt: string;
  bodyMarkdown: string;
  bodyBlocks?: Array<Record<string, unknown>> | null;
  keyTakeaways: string[];
  seoTitle: string | null;
  metaDescription: string | null;
}): string {
  const bodyText = draft.bodyBlocks && draft.bodyBlocks.length > 0
    ? extractBlocksText(draft.bodyBlocks)
    : draft.bodyMarkdown;

  return `Je bent een redactionele kwaliteitscontroleur voor TopTalentJobs.nl, een platform voor de uitzendbranche en horeca in Nederland.

Beoordeel het volgende editorial artikel op kwaliteit. Geef scores van 0-100 voor elke categorie.

## Artikel
**Titel:** ${draft.title}
**SEO Titel:** ${draft.seoTitle ?? "(niet ingevuld)"}
**Meta description:** ${draft.metaDescription ?? "(niet ingevuld)"}
**Samenvatting:** ${draft.excerpt}
**Key takeaways:** ${draft.keyTakeaways.join("; ")}

**Body:**
${bodyText.slice(0, 8000)}

## Scorecriteria

1. **overallScore**: Algehele kwaliteit (0-100)
2. **accuracyScore**: Feitelijke nauwkeurigheid, geen vage claims, bronverwijzingen (0-100)
3. **readabilityScore**: Leesbaarheid, structuur, Nederlandse taalgebruik, vloeiendheid (0-100)
4. **seoScore**: SEO kwaliteit - titel lengte (max 60 chars), meta description (150-160 chars), keyword gebruik, headings structuur (0-100)
5. **engagementScore**: Hoe boeiend/relevant voor de doelgroep (horeca ondernemers, uitzendbranche) (0-100)

Geef ook:
- **issues**: Array van concrete problemen die je hebt gevonden
- **suggestions**: Array van concrete verbetervoorstellen

Antwoord in JSON format.`;
}

export async function checkDraftQuality(
  client: AiTextClient,
  draft: {
    title: string;
    excerpt: string;
    bodyMarkdown: string;
    bodyBlocks?: Array<Record<string, unknown>> | null;
    keyTakeaways: string[];
    seoTitle: string | null;
    metaDescription: string | null;
  },
): Promise<QualityScore> {
  const prompt = buildQualityCheckPrompt(draft);
  const rawResponse = await client.generateText(prompt);
  return parseStructuredJson(rawResponse, qualityScoreSchema);
}

export function passesQualityCheck(score: QualityScore): boolean {
  return score.overallScore >= QUALITY_THRESHOLD;
}

export function formatQualityNotes(score: QualityScore): string {
  const lines = [
    `Kwaliteitsscore: ${score.overallScore}/100`,
    `  Nauwkeurigheid: ${score.accuracyScore} | Leesbaarheid: ${score.readabilityScore} | SEO: ${score.seoScore} | Engagement: ${score.engagementScore}`,
  ];

  if (score.issues.length > 0) {
    lines.push(`Problemen: ${score.issues.join("; ")}`);
  }

  if (score.suggestions.length > 0) {
    lines.push(`Suggesties: ${score.suggestions.join("; ")}`);
  }

  return lines.join("\n");
}
