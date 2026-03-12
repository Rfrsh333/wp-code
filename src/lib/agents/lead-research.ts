import { chatCompletion, type ChatMessage } from "@/lib/openai";

interface ResearchInput {
  bedrijfsnaam: string;
  website: string | null;
  branche: string | null;
  stad: string | null;
  adres: string | null;
  telefoon: string | null;
  email: string | null;
}

export interface EnrichmentData {
  // Bedrijfsprofiel
  website_type: string | null;
  grootte_indicatie: "klein" | "middel" | "groot" | "keten" | "onbekend";
  prijsrange: "budget" | "middel" | "upscale" | "fine_dining" | "onbekend";
  heeft_vacatures: boolean;
  heeft_terras: boolean | null;
  aantal_locaties: number | null;

  // Reviews
  reviews_count: number | null;
  reviews_score: number | null;
  reviews_pain_points: string[];
  reviews_positief: string[];

  // Social media
  social_media: {
    instagram: string | null;
    facebook: string | null;
    linkedin: string | null;
  };

  // AI Analyse
  branche_verfijnd: string;
  type_gelegenheid: string;
  geschat_aantal_medewerkers: string;
  pain_points: string[];
  personalisatie_notities: string;
  seizoen_advies: string;
  concurrenten_hint: string | null;
  tags: string[];

  // Website content
  website_samenvatting: string | null;
  menu_type: string | null;
  openingstijden_hint: string | null;

  // Meta
  laatst_verrijkt_op: string;
  verrijking_bron: string;
}

export interface ResearchResult {
  branche_verfijnd: string;
  geschat_aantal_medewerkers: string;
  type_gelegenheid: string;
  pain_points: string[];
  personalisatie_notities: string;
  tags: string[];
}

// Probeer website content op te halen via een simpele fetch
async function fetchWebsiteContent(url: string): Promise<string | null> {
  try {
    const fullUrl = url.startsWith("http") ? url : `https://${url}`;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);

    const res = await fetch(fullUrl, {
      signal: controller.signal,
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; TopTalentBot/1.0)",
        "Accept": "text/html",
      },
    });
    clearTimeout(timeout);

    if (!res.ok) return null;

    const html = await res.text();

    // Simpele HTML → tekst extractie (strip tags, scripts, styles)
    const cleaned = html
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, " ")
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, " ")
      .replace(/<nav[^>]*>[\s\S]*?<\/nav>/gi, " ")
      .replace(/<footer[^>]*>[\s\S]*?<\/footer>/gi, " ")
      .replace(/<[^>]+>/g, " ")
      .replace(/&[a-z]+;/gi, " ")
      .replace(/\s+/g, " ")
      .trim();

    // Neem max 3000 chars voor AI analyse
    return cleaned.slice(0, 3000);
  } catch {
    return null;
  }
}

// Zoek naar vacature-pagina
async function checkVacaturePagina(baseUrl: string): Promise<boolean> {
  const vacatureUrls = ["/vacatures", "/werken-bij", "/jobs", "/careers", "/werk"];
  const fullBase = baseUrl.startsWith("http") ? baseUrl : `https://${baseUrl}`;

  for (const path of vacatureUrls) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 5000);
      const res = await fetch(`${fullBase}${path}`, {
        method: "HEAD",
        signal: controller.signal,
        redirect: "follow",
      });
      clearTimeout(timeout);
      if (res.ok) return true;
    } catch {
      // Ignore
    }
  }
  return false;
}

const ENRICHMENT_SYSTEM_PROMPT = `Je bent een uitgebreide business intelligence specialist voor TopTalent Jobs, een horeca uitzendbureau in Utrecht/Amsterdam.

Je analyseert alle beschikbare informatie over een horecabedrijf en maakt een compleet profiel.

Over TopTalent Jobs:
- Specialist in horeca personeel: bediening, bar, keuken, afwas, evenementen
- Actief in Utrecht, Amsterdam en omgeving
- Levert flexibel personeel per dienst of per week

Vandaag is ${new Date().toLocaleDateString("nl-NL", { day: "numeric", month: "long", year: "numeric" })}.
Huidige maand: ${new Date().toLocaleDateString("nl-NL", { month: "long" })}.

Analyseer en geef terug:
1. Type zaak (fine dining, casual, fast-casual, fastfood, cafe, bar, hotel, catering, etc.)
2. Grootte-indicatie (klein=1-10 pers, middel=10-25, groot=25+, keten=meerdere locaties)
3. Prijsrange (budget, middel, upscale, fine_dining)
4. Of ze een terras hebben (null als onbekend)
5. Geschat aantal locaties
6. Pain points specifiek voor hun type zaak rond personeel
7. Gepersonaliseerde outreach tips
8. Seizoensadvies: wat is NU relevant voor dit type zaak? (terrasseizoen, feestdagen, zomer-drukte, etc.)
9. Concurrenten hint: andere uitzendbureaus die hier actief zouden kunnen zijn
10. Relevante tags
11. Als er website content beschikbaar is: vat de website samen, detecteer menu type en openingstijden hints

BELANGRIJK: Geef CONCRETE, BRUIKBARE inzichten. Geen generieke teksten.

Antwoord ALTIJD in exact dit JSON format:
{
  "website_type": "<type website: restaurant-site, hotel-corporate, keten-site, etc. of null>",
  "grootte_indicatie": "klein" | "middel" | "groot" | "keten" | "onbekend",
  "prijsrange": "budget" | "middel" | "upscale" | "fine_dining" | "onbekend",
  "heeft_terras": true | false | null,
  "aantal_locaties": <getal of null>,
  "branche_verfijnd": "<specifieke branche>",
  "type_gelegenheid": "<type>",
  "geschat_aantal_medewerkers": "<range of beschrijving>",
  "pain_points": ["<specifiek pain point>", "..."],
  "personalisatie_notities": "<concrete outreach tip>",
  "seizoen_advies": "<wat is nu relevant voor dit bedrijf>",
  "concurrenten_hint": "<mogelijke concurrenten of null>",
  "tags": ["<tag>", "..."],
  "website_samenvatting": "<samenvatting of null>",
  "menu_type": "<type menu of null>",
  "openingstijden_hint": "<openingstijden of null>",
  "reviews_pain_points": ["<pain point uit reviews context>"],
  "reviews_positief": ["<positief punt>"]
}`;

export async function researchLead(input: ResearchInput): Promise<ResearchResult> {
  const enrichment = await enrichLead(input);
  return {
    branche_verfijnd: enrichment.branche_verfijnd,
    geschat_aantal_medewerkers: enrichment.geschat_aantal_medewerkers,
    type_gelegenheid: enrichment.type_gelegenheid,
    pain_points: enrichment.pain_points,
    personalisatie_notities: enrichment.personalisatie_notities,
    tags: enrichment.tags,
  };
}

export async function enrichLead(input: ResearchInput): Promise<EnrichmentData> {
  // Fase 1: Website content ophalen (parallel)
  let websiteContent: string | null = null;
  let heeftVacatures = false;

  if (input.website) {
    const [content, vacatures] = await Promise.all([
      fetchWebsiteContent(input.website),
      checkVacaturePagina(input.website),
    ]);
    websiteContent = content;
    heeftVacatures = vacatures;
  }

  // Fase 2: AI analyse met alle verzamelde data
  const userPrompt = `Analyseer dit horecabedrijf volledig:

Bedrijfsnaam: ${input.bedrijfsnaam}
Website: ${input.website || "niet beschikbaar"}
Branche: ${input.branche || "onbekend"}
Stad: ${input.stad || "onbekend"}
Adres: ${input.adres || "onbekend"}
Email: ${input.email || "niet beschikbaar"}
Telefoon: ${input.telefoon || "niet beschikbaar"}
Heeft vacaturepagina: ${heeftVacatures ? "JA (ze zoeken actief personeel!)" : "niet gevonden"}

${websiteContent ? `\n--- WEBSITE CONTENT ---\n${websiteContent}\n--- EINDE WEBSITE ---` : "Geen website content beschikbaar."}

Maak een compleet profiel op basis van alle beschikbare informatie.`;

  const messages: ChatMessage[] = [
    { role: "system", content: ENRICHMENT_SYSTEM_PROMPT },
    { role: "user", content: userPrompt },
  ];

  const response = await chatCompletion(messages, { temperature: 0.3, maxTokens: 1500 });

  try {
    const cleaned = response.replace(/```json\n?|\n?```/g, "").trim();
    const aiResult = JSON.parse(cleaned);

    const enrichment: EnrichmentData = {
      website_type: aiResult.website_type || null,
      grootte_indicatie: aiResult.grootte_indicatie || "onbekend",
      prijsrange: aiResult.prijsrange || "onbekend",
      heeft_vacatures: heeftVacatures,
      heeft_terras: aiResult.heeft_terras ?? null,
      aantal_locaties: aiResult.aantal_locaties || null,

      reviews_count: null,
      reviews_score: null,
      reviews_pain_points: aiResult.reviews_pain_points || [],
      reviews_positief: aiResult.reviews_positief || [],

      social_media: {
        instagram: null,
        facebook: null,
        linkedin: null,
      },

      branche_verfijnd: aiResult.branche_verfijnd || input.branche || "horeca",
      type_gelegenheid: aiResult.type_gelegenheid || "onbekend",
      geschat_aantal_medewerkers: aiResult.geschat_aantal_medewerkers || "onbekend",
      pain_points: aiResult.pain_points || [],
      personalisatie_notities: aiResult.personalisatie_notities || "",
      seizoen_advies: aiResult.seizoen_advies || "",
      concurrenten_hint: aiResult.concurrenten_hint || null,
      tags: aiResult.tags || [],

      website_samenvatting: aiResult.website_samenvatting || null,
      menu_type: aiResult.menu_type || null,
      openingstijden_hint: aiResult.openingstijden_hint || null,

      laatst_verrijkt_op: new Date().toISOString(),
      verrijking_bron: websiteContent ? "website+ai" : "ai",
    };

    // Probeer social media links te extraheren uit website content
    if (websiteContent) {
      const igMatch = websiteContent.match(/instagram\.com\/([a-zA-Z0-9_.]+)/);
      const fbMatch = websiteContent.match(/facebook\.com\/([a-zA-Z0-9_.]+)/);
      const liMatch = websiteContent.match(/linkedin\.com\/(?:company|in)\/([a-zA-Z0-9_.-]+)/);
      if (igMatch) enrichment.social_media.instagram = igMatch[1];
      if (fbMatch) enrichment.social_media.facebook = fbMatch[1];
      if (liMatch) enrichment.social_media.linkedin = liMatch[1];
    }

    return enrichment;
  } catch {
    return {
      website_type: null,
      grootte_indicatie: "onbekend",
      prijsrange: "onbekend",
      heeft_vacatures: heeftVacatures,
      heeft_terras: null,
      aantal_locaties: null,
      reviews_count: null,
      reviews_score: null,
      reviews_pain_points: [],
      reviews_positief: [],
      social_media: { instagram: null, facebook: null, linkedin: null },
      branche_verfijnd: input.branche || "horeca",
      type_gelegenheid: "onbekend",
      geschat_aantal_medewerkers: "onbekend",
      pain_points: [],
      personalisatie_notities: "Handmatig onderzoek aanbevolen",
      seizoen_advies: "",
      concurrenten_hint: null,
      tags: [],
      website_samenvatting: null,
      menu_type: null,
      openingstijden_hint: null,
      laatst_verrijkt_op: new Date().toISOString(),
      verrijking_bron: "fallback",
    };
  }
}

export async function enrichLeadsBatch(
  leads: (ResearchInput & { id: string })[]
): Promise<Map<string, EnrichmentData>> {
  const results = new Map<string, EnrichmentData>();
  // Process in chunks of 2 (website fetching + AI = heavy)
  for (let i = 0; i < leads.length; i += 2) {
    const chunk = leads.slice(i, i + 2);
    const chunkResults = await Promise.all(chunk.map((lead) => enrichLead(lead)));
    chunk.forEach((lead, j) => results.set(lead.id, chunkResults[j]));
  }
  return results;
}
