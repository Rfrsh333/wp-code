import "server-only";

import { z } from "zod";
import { parseStructuredJson } from "@/lib/ai/json-output";
import type { AiTextClient } from "@/lib/content/services/article-classification-service";

const socialSnippetsSchema = z.object({
  linkedin: z.string().min(10).catch(""),
  twitter: z.string().max(280).catch(""),
  instagram: z.string().min(10).catch(""),
  hashtags: z.array(z.string()).default([]).catch([]),
});

export type SocialSnippets = z.infer<typeof socialSnippetsSchema>;

function buildSocialSnippetsPrompt(draft: {
  title: string;
  excerpt: string;
  keyTakeaways: string[];
  slug: string;
}): string {
  const url = `https://www.toptalentjobs.nl/blog/editorial/${draft.slug}`;

  return `Genereer social media posts voor het volgende artikel van TopTalentJobs.nl (uitzendbureau voor de horeca in Nederland).

## Artikel
**Titel:** ${draft.title}
**Samenvatting:** ${draft.excerpt}
**Key takeaways:** ${draft.keyTakeaways.join("; ")}
**URL:** ${url}

## Gewenste output

Genereer posts voor elk platform in het Nederlands:

1. **linkedin**: Professionele post (150-300 woorden). Open met een prikkelende vraag of stelling. Gebruik regelafbrekingen voor leesbaarheid. Sluit af met een CTA naar het artikel. Voeg 3-5 relevante hashtags toe aan het einde.

2. **twitter**: Korte, pakkende tweet (max 280 karakters inclusief URL). Moet nieuwsgierig maken. URL telt als 23 karakters.

3. **instagram**: Caption voor Instagram (100-200 woorden). Meer casual/storytelling toon. Sluit af met CTA. Geen URL in de tekst (die komt in bio).

4. **hashtags**: Array van 5-8 relevante hashtags (zonder #-teken).

Antwoord in JSON format.`;
}

export async function generateSocialSnippets(
  client: AiTextClient,
  draft: {
    title: string;
    excerpt: string;
    keyTakeaways: string[];
    slug: string;
  },
): Promise<SocialSnippets> {
  const prompt = buildSocialSnippetsPrompt(draft);
  const rawResponse = await client.generateText(prompt);
  return parseStructuredJson(rawResponse, socialSnippetsSchema);
}
