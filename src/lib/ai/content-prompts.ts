import type { AudienceType, ContentType } from "@/lib/content/types";

export function buildClassificationPrompt(input: {
  sourceName: string;
  title: string;
  excerpt: string | null;
  cleanedText: string;
}) {
  return `
You classify Dutch or English hospitality-industry content for an editorial intelligence system.

Business scope:
- horecaondernemers
- horeca-uitzendbureaus
- horecamedewerkers
- werkgevers
- zzp'ers
- hotel and hospitality operators

Return strict JSON with:
- isRelevant: boolean
- isNoise: boolean
- primaryAudience
- secondaryAudience: string[]
- category
- subtopics: string[]
- contentType
- impactLevel
- urgencyLevel
- confidenceScore: number 0-100
- businessRelevanceScore: number 0-100
- workerRelevanceScore: number 0-100
- noveltyScore: number 0-100
- sourceAuthorityScore: number 0-100
- businessImplications: string[]
- workerImplications: string[]
- recommendedActions: string[]
- factCheckFlags: string[]
- summary: string

Rules:
- prioritize real operational, staffing, labour, compliance, hospitality and regulation value
- mark legal or regulatory uncertainty in factCheckFlags
- do not overstate certainty
- keep subtopics specific

Source: ${input.sourceName}
Title: ${input.title}
Excerpt: ${input.excerpt ?? ""}
Body:
${input.cleanedText.slice(0, 8000)}
`.trim();
}

export function buildDraftGenerationPrompt(input: {
  audience: AudienceType;
  draftType: ContentType;
  clusterTitle: string;
  clusterSummary: string;
  articleSummaries: Array<{ title: string; sourceName: string; url: string; summary: string }>;
}) {
  return `
You are writing an editorial draft for TopTalent Jobs, a hospitality staffing and recruitment brand.

Write a multi-source article in Dutch. Do not rewrite a single source. Synthesize multiple sources into one useful editorial piece.

Target audience: ${input.audience}
Draft type: ${input.draftType}
Theme: ${input.clusterTitle}
Theme summary: ${input.clusterSummary}

Return strict JSON with:
- title
- slug
- excerpt
- bodyMarkdown
- keyTakeaways: string[]
- impactSummary
- actionSteps: string[]
- seoTitle
- metaDescription
- reviewNotes
- factCheckFlags: string[]
- imagePromptSuggestion
- visualDirection

Editorial rules:
- practical, clear, not fluffy
- mention uncertainty where needed
- include concrete implications for the target audience
- avoid legal certainty unless clearly supported
- do not fabricate numbers or quotes

Sources:
${input.articleSummaries
  .map(
    (article, index) =>
      `${index + 1}. ${article.title} | ${article.sourceName} | ${article.url}\n${article.summary}`,
  )
  .join("\n\n")}
`.trim();
}

export function buildImagePromptPrompt(input: {
  title: string;
  excerpt: string;
  visualDirection: string | null;
}) {
  return `
Create a realistic editorial hero image prompt for a hospitality industry article.

Return strict JSON:
- prompt
- altText
- visualDirection

Rules:
- realistic photography style
- no illustrations, cartoons, or exaggerated CGI
- suitable for premium editorial publishing
- leave space for subtle lower-third overlay and branding
- visual metaphor should match the topic

Title: ${input.title}
Excerpt: ${input.excerpt}
Existing visual direction: ${input.visualDirection ?? "none"}
`.trim();
}
