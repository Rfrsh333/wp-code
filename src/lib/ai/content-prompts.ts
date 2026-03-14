import type { AudienceType, ContentType } from "@/lib/content/types";

export function buildClassificationPrompt(input: {
  sourceName: string;
  title: string;
  excerpt: string | null;
  cleanedText: string;
}) {
  return `
You classify Dutch or English content for the editorial intelligence system of TopTalent Jobs, a staffing and recruitment agency focused on hospitality, but also covering broader labour market, employment, and business news.

An article is RELEVANT (isRelevant: true) if it relates to ANY of these topics:
- Horeca & hospitality (restaurants, hotels, catering, events, etc.)
- Staffing, recruitment, uitzendwerk, detachering, payroll
- Labour market (arbeidsmarkt), employment trends, vacatures, personeelstekort
- Employment law, CAO, minimumloon, salaris, arbeidsovereenkomsten
- ZZP, freelance, schijnzelfstandigheid, Wet DBA
- Vergunningen, compliance, regelgeving, arbeidsinspectie, NVWA
- Arbeidsmigratie, expats, werkvergunningen
- Ondernemen, MKB, bedrijfsvoering, omzet, kosten
- HR, onboarding, employee management
- Economic news that impacts employers or workers

An article is NOT relevant only if it has zero connection to employment, business, or hospitality (e.g. sports results, entertainment gossip, weather).

Target audiences:
- horecaondernemers
- werkgevers (general employers)
- uitzendbureaus (staffing agencies)
- medewerkers (workers/employees)
- zzp'ers (freelancers/self-employed)
- hotel_operators

Return strict JSON with EXACTLY these fields and allowed values:
- isRelevant: boolean (true if the article matches ANY topic above)
- isNoise: boolean
- primaryAudience: one of "ondernemers"|"werkgevers"|"uitzendbureaus"|"medewerkers"|"zzpers"|"hotel_operators" or null
- secondaryAudience: array of "ondernemers"|"werkgevers"|"uitzendbureaus"|"medewerkers"|"zzpers"|"hotel_operators"
- category: one of "horeca_nieuws"|"hospitality_trends"|"arbeidsmarkt"|"recruitment"|"wetgeving"|"vergunningen"|"compliance"|"operations"|"hr"|"hotel_nieuws"|"zzp"|"ondernemen"|"arbeidsmigratie"|"economie" or null
- subtopics: string[]
- contentType: one of "breaking_news"|"analysis"|"explainer"|"roundup"|"opinion"|"guide"
- impactLevel: one of "low"|"medium"|"high"
- urgencyLevel: one of "low"|"medium"|"high"|"critical"
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

IMPORTANT: Use ONLY the exact enum values listed above. Do not invent new values.

Rules:
- Be GENEROUS with isRelevant — mark true for any article that could interest employers, workers, or staffing agencies
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
You are the editorial writer for TopTalent Jobs, a hospitality staffing and recruitment brand in the Netherlands. You write long-form, visually rich blog articles that look professional and magazine-quality.

Write a comprehensive multi-source article in Dutch. Synthesize ALL sources into one cohesive, in-depth editorial piece. Do NOT rewrite a single source — combine insights from all of them.

Target audience: ${input.audience}
Draft type: ${input.draftType}
Theme: ${input.clusterTitle}
Theme summary: ${input.clusterSummary}

Return strict JSON with:
- title
- slug
- excerpt (2-3 sentences, compelling)
- bodyMarkdown (SHORT plain markdown fallback — max 300 words summary of the article, NOT the full article)
- bodyBlocks (REQUIRED — this is the PRIMARY full article content as rich block array, see detailed instructions below)
- keyTakeaways: string[] (5-8 concrete takeaways)
- impactSummary (3-4 sentences)
- actionSteps: string[] (4-6 practical steps)
- seoTitle
- metaDescription
- reviewNotes
- factCheckFlags: string[]
- imagePromptSuggestion
- visualDirection

## bodyBlocks — CRITICAL INSTRUCTIONS

bodyBlocks is the PRIMARY content format. This must be a visually rich, magazine-quality article. Each block has a "type" and type-specific fields.

### Available block types with EXACT JSON format:

1. PARAGRAPH — body text
{"type": "paragraph", "content": "Text with **bold** and *italic*. Can include <a href=\\"/diensten\\">links</a>."}

2. HEADING2 — main section heading
{"type": "heading2", "content": "Section Title"}

3. HEADING3 — subsection heading
{"type": "heading3", "content": "Subsection Title"}

4. LIST — bullet points
{"type": "list", "items": ["First point", "Second point", "Third point"]}

5. HIGHLIGHT — colored info/tip/warning/definition box
{"type": "highlight", "title": "Box Title", "content": "Important information here.", "variant": "info"}
Variants: "info" (blue), "tip" (green), "warning" (orange/red), "definition" (purple)

6. CHECKLIST — checkable items with variant
{"type": "checklist", "title": "Title", "variant": "benefits", "items": [{"text": "**Bold label** — with description", "checked": false}]}
Variants: "checklist" (with check marks), "steps" (numbered process), "benefits" (advantages list)

7. QUOTE — attributed quote
{"type": "quote", "quote": "The quote text here.", "variant": "insight"}
Variants: "testimonial", "insight", "highlight"

8. STATS — key numbers
{"type": "stats", "stats": [{"value": "85%", "label": "Description of the stat"}]}

9. SUMMARY — key points summary box
{"type": "summary", "title": "Samenvatting", "points": ["Point 1", "Point 2", "Point 3"]}

10. TABLE — data table
{"type": "table", "headers": ["Column 1", "Column 2"], "rows": [["Cell 1", "Cell 2"]]}

11. DIVIDER — section separator
{"type": "divider"}

12. CTA — call-to-action box (USE 2-3 PER ARTICLE)
{"type": "cta", "title": "CTA Title", "description": "Compelling description.", "primaryLink": {"href": "/diensten/uitzenden", "text": "Button text"}, "variant": "orange"}
Variants: "orange" (primary), "dark" (footer CTA)
Optional: "secondaryLink": {"href": "/contact", "text": "Secondary action"}

13. COMPARISON — comparison table with features
{"type": "comparison", "title": "Title", "headers": ["Aspect", "Option A", "Option B"], "rows": [{"feature": "Feature name", "optionA": "Value A", "optionB": "Value B"}]}

14. RELATED LINK — link to related content
{"type": "relatedLink", "href": "/blog/related-slug", "text": "Read more about this topic"}

15. PRICE TABLE — pricing information
{"type": "priceTable", "title": "Title", "rows": [{"item": "Service", "price": "€25 – €35", "note": "per hour"}], "footer": "Additional pricing note"}

### ARTICLE STRUCTURE TEMPLATE (follow this pattern):

1. 1-2 paragraphs as engaging introduction
2. 1 highlight box (info variant) with key context
3. divider
4. SECTION 1: heading2 → paragraphs → checklist/comparison → highlight(tip) → cta(orange)
5. divider
6. SECTION 2: heading2 → heading3 subsections → paragraphs → stats → quote(insight)
7. divider
8. SECTION 3: heading2 → paragraphs → comparison or table → highlight(warning) → relatedLink
9. divider
10. SECTION 4: heading2 → paragraphs → checklist(steps) → quote(highlight)
11. divider
12. SECTION 5: heading2 → paragraphs → highlight(tip) → relatedLink
13. divider
14. summary block with 4-6 key takeaways
15. cta(dark) as final conversion block

### MANDATORY REQUIREMENTS:
- Generate **20-30 blocks** total for a complete article
- Write at least **1200-1800 words** of actual content across the blocks
- Include **at least 3-4 heading2 sections**
- Include **at least 2 highlight boxes** (mix of info, tip, warning)
- Include **at least 1 checklist** (benefits, steps, or checklist variant)
- Include **2 CTA blocks** placed after sections
- Include **at least 1 quote block** (insight or highlight variant)
- Include **1 stats, comparison, or table** block for structured data
- Use **dividers** between major sections
- End with a **summary** block followed by a **CTA (dark variant)**
- IMPORTANT: bodyMarkdown should be a SHORT 200-300 word summary, NOT the full article. The full content goes in bodyBlocks.

### INTERNAL LINKS (use in paragraphs and relatedLink blocks):
- /diensten/uitzenden — Uitzendservice
- /diensten/recruitment — Recruitment
- /diensten — Alle diensten
- /personeel-aanvragen — Personeel aanvragen
- /contact — Contact
- /vacatures — Vacatures
- /blog — Blog overzicht

## SEO optimization

- seoTitle: max 60 characters, primary keyword at the start
- metaDescription: 150-160 characters, include call-to-action and primary keyword
- Use H2/H3 structure with keywords naturally integrated
- Include 2-3 internal links in paragraph content using <a href="/path">anchor text</a>

## AEO (AI Engine Optimization)

- Include FAQ-style sections (heading3 as question → paragraph as answer)
- Use structured lists and tables for AI-extractable data
- Be entity-rich: mention specific Dutch laws (Wet DBA, WAB, Waadi), organizations (UWV, KHN, SNA, ABU, NBBU), and concrete numbers
- Include citable facts with source attribution
- Use highlight blocks with "definition" variant for industry terms

## Editorial style

- Professional but accessible Dutch — like Misset Horeca or FD
- Practical and concrete, never vague or fluffy
- Show genuine expertise about the staffing/hospitality industry
- Mention uncertainty where needed — do not fabricate statistics or legal certainty
- Include concrete implications and actionable advice for the target audience
- Use "wij" perspective when referring to TopTalent's experience
- Write paragraphs of 2-4 sentences, not walls of text

Sources:
${input.articleSummaries
  .map(
    (article, index) =>
      `${index + 1}. ${article.title} | ${article.sourceName} | ${article.url}\n${article.summary}`,
  )
  .join("\n\n")}
`.trim();
}

export function buildTemplateDraftPrompt(input: {
  audience: AudienceType;
  draftType: ContentType;
  clusterTitle: string;
  clusterSummary: string;
  articleSummaries: Array<{ title: string; sourceName: string; url: string; summary: string }>;
}) {
  return `
Je bent de redacteur van TopTalent Jobs, een uitzendbureau voor de horeca in Nederland. Schrijf een uitgebreid Nederlandstalig artikel op basis van de bronnen hieronder.

Doelgroep: ${input.audience}
Artikeltype: ${input.draftType}
Thema: ${input.clusterTitle}
Samenvatting thema: ${input.clusterSummary}

Geef strict JSON terug met EXACT deze velden:

- title: pakkende titel (50-70 tekens)
- slug: url-vriendelijke slug
- excerpt: 2-3 zinnen, overtuigend
- seoTitle: max 60 tekens, keyword vooraan
- metaDescription: 150-160 tekens met call-to-action
- introText: 1-2 alinea's inleiding (plain text, gescheiden door dubbele newline)
- contextHighlight: { title, content } — kerncontext in een info-box
- sections: array van 4-6 secties, elk met:
  - heading: sectiekop (H2)
  - paragraphs: array van 2-4 alinea's (plain text)
  - subsections: optioneel array van { heading, paragraphs } voor H3-onderdelen
  - highlight: optioneel { title, content, variant } — variant is "info"|"tip"|"warning"|"definition"
  - checklistTitle + checklistItems: optioneel — titel en array van checklist-items als strings
  - quoteText: optioneel — een relevant citaat of inzicht
  - comparisonHeaders + comparisonRows: optioneel — [aspect, optionA, optionB] headers + array van { feature, optionA, optionB }
  - tableHeaders + tableRows: optioneel — headers array + rows als string[][]
- stats: array van { value, label } — belangrijke cijfers (bijv. "85%", "€2.500")
- keyTakeaways: 5-8 concrete conclusies
- actionSteps: 4-6 praktische stappen
- factCheckFlags: onzekerheden of claims die gecheckt moeten worden
- imagePromptSuggestion: beschrijving voor hero image
- visualDirection: visuele stijl
- impactSummary: 3-4 zinnen impact

BELANGRIJK:
- Schrijf alleen Nederlandse tekst, GEEN HTML, markdown of block types
- Interne links en CTAs worden automatisch toegevoegd
- Wees concreet en praktisch, noem specifieke wetten (Wet DBA, WAB), organisaties (KHN, ABU, UWV) en cijfers waar relevant
- Minimaal 1200 woorden totale content verspreid over de secties
- Elke paragraph moet 3-5 zinnen lang zijn — NIET slechts 1 zin per alinea
- Elke sectie moet 2-4 uitgebreide alinea's bevatten met concrete details, voorbeelden en context
- Gebruik minimaal 2 highlights, 1 checklist en 1 quote verspreid over de secties
- Gebruik "wij" als je verwijst naar TopTalent's ervaring
- Als er weinig bronmateriaal is, vul aan met je eigen kennis over de Nederlandse arbeidsmarkt en horeca

Bronnen:
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
Create a photojournalistic editorial hero image prompt for a hospitality industry article.

Return strict JSON:
- prompt
- altText
- visualDirection

Photography style requirements:
- Photojournalistic, shot on a professional DSLR camera (e.g. Canon EOS R5 or Nikon Z9)
- Natural lighting with soft shadows, shallow depth of field (f/1.8–f/2.8)
- Editorial photography quality like NRC Handelsblad, Financial Times, or Misset Horeca
- Real people in authentic work settings: restaurant kitchens, hotel lobbies, office spaces, café terraces
- Candid, unposed moments — people genuinely working, discussing, or serving
- Warm color palette with natural tones, no heavy color grading or filters

Strict rules:
- NEVER include any text, watermarks, logos, overlays, or typography in the image
- NEVER include illustrations, cartoons, CGI, or stock photo aesthetics
- NEVER include unrealistic perfection — slight imperfection adds authenticity
- Leave natural space at the bottom third for editorial overlay
- Focus on the human element: hands at work, facial expressions, team interactions
- Setting must feel like a real Dutch or European hospitality location

Title: ${input.title}
Excerpt: ${input.excerpt}
Existing visual direction: ${input.visualDirection ?? "none"}
`.trim();
}
