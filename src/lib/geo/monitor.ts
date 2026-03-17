import "server-only";

/**
 * GEO Agent Module 2: Citation Monitoring
 *
 * Monitor of en hoe AI-zoekmachines TopTalent Jobs citeren
 * bij relevante horeca-gerelateerde zoekopdrachten.
 *
 * Conform Master Prompt v1.0 specificaties.
 */

import { supabaseAdmin } from "@/lib/supabase";
import type { GeoContent } from "./types";

type AIEngine = "perplexity" | "chatgpt" | "google_ai";

interface CitationCheckResult {
  engine: AIEngine;
  zoekopdracht: string;
  geciteerd: boolean;
  brand_mention: boolean;
  citatie_positie: number | null;
  citatie_tekst: string | null;
  bron_url: string | null;
  totaal_bronnen: number;
  concurrenten_urls: string[];
  response_snippet: string;
  relevantie_score: number;
  sentiment: "positive" | "neutral" | "negative" | null;
}

/**
 * Query-set samenstellen — conform Module 2 specificaties
 *
 * Categorieën:
 * 1. Stad + dienst: "horeca uitzendbureau [stad]"
 * 2. Functie + stad: "kok vacature [stad]", "barista werk [stad]"
 * 3. Generiek: "beste horeca uitzendbureau Nederland"
 * 4. Long-tail: "hoeveel verdien je als ober in Amsterdam"
 */
export function generateSearchQueries(content: GeoContent): string[] {
  const stadNaam = content.stad === "den-haag"
    ? "Den Haag"
    : content.stad.charAt(0).toUpperCase() + content.stad.slice(1);

  const queries: string[] = [];

  // Categorie 1: Stad + dienst
  queries.push(
    `horeca uitzendbureau ${stadNaam}`,
    `horecapersoneel inhuren ${stadNaam}`,
    `horeca personeel ${stadNaam}`,
    `uitzendkracht horeca ${stadNaam}`,
  );

  // Categorie 2: Functie + stad
  queries.push(
    `kok vacature ${stadNaam}`,
    `barista werk ${stadNaam}`,
    `ober vacature ${stadNaam}`,
    `afwasser werk ${stadNaam}`,
  );

  // Categorie 3: Generiek
  queries.push(
    `beste horeca uitzendbureau Nederland`,
    `tijdelijk horecapersoneel`,
  );

  // Categorie 4: Long-tail
  queries.push(
    `hoeveel verdien je als ober in ${stadNaam}`,
    `horeca bijbaan als student ${stadNaam}`,
    `snel horecapersoneel nodig ${stadNaam}`,
  );

  // Content-specifieke queries
  if (content.content_type === "faq_cluster" && content.faq_items?.length > 0) {
    const faqQueries = content.faq_items
      .slice(0, 3)
      .map((faq) => faq.question.replace(/\?$/, ""));
    queries.push(...faqQueries);
  }

  if (content.content_type === "service_guide") {
    queries.push(
      `uitzenden horeca ${stadNaam} hoe werkt het`,
      `detachering horeca ${stadNaam}`,
      `recruitment horeca personeel ${stadNaam}`,
    );
  }

  if (content.primary_keywords?.length > 0) {
    queries.push(...content.primary_keywords.slice(0, 2));
  }

  // Deduplicate en limiteer
  return [...new Set(queries)].slice(0, 15);
}

/**
 * Check Perplexity API (primair)
 *
 * Parse antwoord op:
 * a. Wordt toptalentjobs.nl expliciet geciteerd in de bronnenlijst?
 * b. Wordt TopTalent bij naam genoemd in de antwoordtekst?
 * c. Welke concurrenten worden wél geciteerd?
 * d. Wat is de positie van TopTalent in de bronnenlijst?
 */
async function checkPerplexity(query: string): Promise<CitationCheckResult> {
  const apiKey = process.env.PERPLEXITY_API_KEY;

  if (!apiKey) {
    console.warn("[GEO Monitor] Geen PERPLEXITY_API_KEY geconfigureerd — Perplexity check overgeslagen");
    return createEmptyResult("perplexity", query, "Geen PERPLEXITY_API_KEY geconfigureerd");
  }

  try {
    const response = await fetch("https://api.perplexity.ai/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "sonar",
        messages: [{ role: "user", content: query }],
        return_citations: true,
        return_related_questions: false,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[GEO Monitor] Perplexity API fout: ${response.status} — ${errorText.slice(0, 200)}`);
      return createEmptyResult("perplexity", query, `API fout: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || "";
    const citations: string[] = data.citations || [];

    // a. Wordt toptalentjobs.nl geciteerd in de bronnenlijst?
    const toptalentIndex = citations.findIndex(
      (url: string) => url.includes("toptalentjobs.nl") || url.includes("toptalentjobs")
    );
    const geciteerd = toptalentIndex !== -1;

    // b. Wordt TopTalent bij naam genoemd in de antwoordtekst?
    const brandMention = content.toLowerCase().includes("toptalent");

    // c. Welke concurrenten worden wél geciteerd?
    const concurrenten = citations.filter(
      (url: string) =>
        !url.includes("toptalentjobs") &&
        !url.includes("toptalent.nl") &&
        (url.includes("uitzend") || url.includes("horeca") || url.includes("personeel") ||
         url.includes("staffing") || url.includes("temper") || url.includes("randstad") ||
         url.includes("young") || url.includes("olympia") || url.includes("recruit"))
    );

    // d. Positie in bronnenlijst
    const positie = geciteerd ? toptalentIndex + 1 : null;

    return {
      engine: "perplexity",
      zoekopdracht: query,
      geciteerd,
      brand_mention: brandMention,
      citatie_positie: positie,
      citatie_tekst: geciteerd ? extractCitationContext(content, "toptalentjobs") : null,
      bron_url: geciteerd ? citations[toptalentIndex] : null,
      totaal_bronnen: citations.length,
      concurrenten_urls: concurrenten.slice(0, 10),
      response_snippet: content.slice(0, 500),
      relevantie_score: berekenRelevantie(content, query),
      sentiment: brandMention ? detectSentiment(content, "toptalent") : null,
    };
  } catch (error) {
    console.error(`[GEO Monitor] Perplexity check fout:`, error);
    return createEmptyResult("perplexity", query, (error as Error).message);
  }
}

/**
 * Check OpenAI/ChatGPT (secundair)
 *
 * Parse antwoord op:
 * a. Wordt TopTalent of toptalentjobs.nl genoemd?
 * b. Welke concurrenten worden genoemd?
 * c. Wat is de toon/context van de vermelding?
 */
async function checkChatGPT(query: string): Promise<CitationCheckResult> {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    console.warn("[GEO Monitor] Geen OPENAI_API_KEY geconfigureerd — ChatGPT check overgeslagen");
    return createEmptyResult("chatgpt", query, "Geen OPENAI_API_KEY geconfigureerd");
  }

  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: "Je bent een zoekhulp. Beantwoord de vraag en vermeld altijd je bronnen met URLs. Noem specifieke bedrijven en websites.",
          },
          {
            role: "user",
            content: `${query} — Noem specifieke uitzendbureaus en hun websites.`,
          },
        ],
        max_tokens: 1000,
        temperature: 0.3,
      }),
    });

    if (!response.ok) {
      return createEmptyResult("chatgpt", query, `API fout: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || "";

    // a. Wordt TopTalent genoemd?
    const mentioned = content.toLowerCase().includes("toptalent") || content.toLowerCase().includes("toptalentjobs");

    // b. Welke concurrenten worden genoemd?
    const concurrentenPatterns = [
      /(?:www\.)?(\w+(?:uitzend|staffing|horeca|personeel)\w*\.(?:nl|com))/gi,
      /(?:www\.)?(\w+\.nl)/gi,
    ];
    const gevondenUrls: string[] = [];
    for (const pattern of concurrentenPatterns) {
      const matches = content.matchAll(pattern);
      for (const match of matches) {
        if (!match[0].includes("toptalent")) gevondenUrls.push(match[0]);
      }
    }

    // c. Toon/context
    const sentiment = mentioned ? detectSentiment(content, "toptalent") : null;

    return {
      engine: "chatgpt",
      zoekopdracht: query,
      geciteerd: mentioned,
      brand_mention: mentioned,
      citatie_positie: mentioned ? 1 : null,
      citatie_tekst: mentioned ? extractCitationContext(content, "toptalent") : null,
      bron_url: mentioned ? "https://toptalentjobs.nl" : null,
      totaal_bronnen: 0,
      concurrenten_urls: [...new Set(gevondenUrls)].slice(0, 10),
      response_snippet: content.slice(0, 500),
      relevantie_score: berekenRelevantie(content, query),
      sentiment,
    };
  } catch (error) {
    console.error(`[GEO Monitor] ChatGPT check fout:`, error);
    return createEmptyResult("chatgpt", query, (error as Error).message);
  }
}

/**
 * Voer citation check uit voor één content item
 */
export async function checkContentCitations(
  content: GeoContent,
  engines: AIEngine[] = ["perplexity"]
): Promise<CitationCheckResult[]> {
  const queries = generateSearchQueries(content);
  const results: CitationCheckResult[] = [];

  // Fallback-gedrag conform master prompt
  const beschikbareEngines = engines.filter((e) => {
    if (e === "perplexity" && !process.env.PERPLEXITY_API_KEY) return false;
    if (e === "chatgpt" && !process.env.OPENAI_API_KEY) return false;
    return true;
  });

  if (beschikbareEngines.length === 0) {
    console.error("[GEO Monitor] Geen monitoring API keys beschikbaar — module 2 uitgeschakeld");
    return [];
  }

  for (const query of queries.slice(0, 10)) {
    for (const engine of beschikbareEngines) {
      let result: CitationCheckResult;

      switch (engine) {
        case "perplexity":
          result = await checkPerplexity(query);
          break;
        case "chatgpt":
          result = await checkChatGPT(query);
          break;
        default:
          result = createEmptyResult(engine, query, "Engine niet ondersteund");
      }

      results.push(result);

      // Log in gestructureerd formaat conform master prompt
      await supabaseAdmin.from("geo_citations").insert({
        geo_content_id: content.id,
        engine: result.engine,
        zoekopdracht: result.zoekopdracht,
        geciteerd: result.geciteerd,
        citatie_positie: result.citatie_positie,
        citatie_tekst: result.citatie_tekst,
        bron_url: result.bron_url,
        totaal_bronnen: result.totaal_bronnen,
        concurrenten_urls: result.concurrenten_urls,
        response_snippet: result.response_snippet,
        relevantie_score: result.relevantie_score,
        check_type: "automatisch",
      });

      // Rate limiting — respecteer API limits
      await new Promise((r) => setTimeout(r, 1500));
    }
  }

  return results;
}

/**
 * Run monitoring — dagelijks top 20, wekelijks alle queries
 */
export async function runFullMonitoring(options?: {
  maxItems?: number;
  engines?: AIEngine[];
}): Promise<{
  checked: number;
  citaties_gevonden: number;
  brand_mentions: number;
  errors: string[];
}> {
  const maxItems = options?.maxItems || 5;
  const engines = options?.engines || ["perplexity"];

  const { data: content } = await supabaseAdmin
    .from("geo_content")
    .select("*")
    .eq("status", "gepubliceerd")
    .order("updated_at", { ascending: true })
    .limit(maxItems);

  if (!content || content.length === 0) {
    return { checked: 0, citaties_gevonden: 0, brand_mentions: 0, errors: ["Geen gepubliceerde content om te monitoren"] };
  }

  let checked = 0;
  let citaties_gevonden = 0;
  let brand_mentions = 0;
  const errors: string[] = [];

  for (const item of content) {
    try {
      console.log(`[GEO Monitor] Checken: ${item.title}`);
      const results = await checkContentCitations(item as GeoContent, engines);

      citaties_gevonden += results.filter((r) => r.geciteerd).length;
      brand_mentions += results.filter((r) => r.brand_mention).length;
      checked++;

      console.log(`[GEO Monitor] ✅ ${item.title}: ${results.filter((r) => r.geciteerd).length} citaties, ${results.filter((r) => r.brand_mention).length} brand mentions`);
    } catch (err) {
      errors.push(`Fout bij ${item.title}: ${(err as Error).message}`);
      console.error(`[GEO Monitor] ❌ ${item.title}:`, err);
    }
  }

  // Update dagelijkse performance metrics
  await updateDailyPerformance();

  return { checked, citaties_gevonden, brand_mentions, errors };
}

/**
 * Update dagelijkse performance aggregatie
 */
async function updateDailyPerformance(): Promise<void> {
  const today = new Date().toISOString().split("T")[0];

  const { data: contentItems } = await supabaseAdmin
    .from("geo_content")
    .select("id")
    .eq("status", "gepubliceerd");

  if (!contentItems) return;

  for (const item of contentItems) {
    const { data: todayCitations } = await supabaseAdmin
      .from("geo_citations")
      .select("engine, geciteerd, citatie_positie")
      .eq("geo_content_id", item.id)
      .gte("created_at", `${today}T00:00:00`)
      .lt("created_at", `${today}T23:59:59`);

    if (!todayCitations || todayCitations.length === 0) continue;

    const perplexity = todayCitations.filter((c) => c.engine === "perplexity" && c.geciteerd).length;
    const chatgpt = todayCitations.filter((c) => c.engine === "chatgpt" && c.geciteerd).length;
    const googleAi = todayCitations.filter((c) => c.engine === "google_ai" && c.geciteerd).length;
    const totaalChecks = todayCitations.length;
    const totaalCitaties = todayCitations.filter((c) => c.geciteerd).length;
    const citatiePct = totaalChecks > 0 ? (totaalCitaties / totaalChecks) * 100 : 0;

    const posities = todayCitations
      .filter((c) => c.geciteerd && c.citatie_positie)
      .map((c) => c.citatie_positie!);
    const gemPositie = posities.length > 0 ? posities.reduce((a, b) => a + b, 0) / posities.length : null;

    await supabaseAdmin.from("geo_performance").upsert(
      {
        datum: today,
        geo_content_id: item.id,
        perplexity_citaties: perplexity,
        chatgpt_citaties: chatgpt,
        google_ai_citaties: googleAi,
        totaal_checks: totaalChecks,
        totaal_citaties: totaalCitaties,
        citatie_percentage: citatiePct,
        gem_citatie_positie: gemPositie,
      },
      { onConflict: "datum,geo_content_id" }
    );
  }
}

/**
 * Haal performance data op voor dashboard
 */
export async function getPerformanceData(options?: {
  dagen?: number;
  content_id?: string;
}): Promise<any[]> {
  const dagen = options?.dagen || 30;
  const sinceDate = new Date();
  sinceDate.setDate(sinceDate.getDate() - dagen);

  let query = supabaseAdmin
    .from("geo_performance")
    .select("*, geo_content(title, stad, content_type)")
    .gte("datum", sinceDate.toISOString().split("T")[0])
    .order("datum", { ascending: false });

  if (options?.content_id) query = query.eq("geo_content_id", options.content_id);

  const { data } = await query.limit(500);
  return data || [];
}

/**
 * Haal citation details op
 */
export async function getCitationDetails(options?: {
  content_id?: string;
  engine?: string;
  limit?: number;
}): Promise<any[]> {
  let query = supabaseAdmin
    .from("geo_citations")
    .select("*, geo_content(title, stad)")
    .order("created_at", { ascending: false });

  if (options?.content_id) query = query.eq("geo_content_id", options.content_id);
  if (options?.engine) query = query.eq("engine", options.engine);

  const { data } = await query.limit(options?.limit || 50);
  return data || [];
}

// --- Helpers ---

function createEmptyResult(engine: AIEngine, query: string, reden: string): CitationCheckResult {
  return {
    engine,
    zoekopdracht: query,
    geciteerd: false,
    brand_mention: false,
    citatie_positie: null,
    citatie_tekst: null,
    bron_url: null,
    totaal_bronnen: 0,
    concurrenten_urls: [],
    response_snippet: `Check niet uitgevoerd: ${reden}`,
    relevantie_score: 0,
    sentiment: null,
  };
}

function extractCitationContext(text: string, keyword: string): string | null {
  const lowerText = text.toLowerCase();
  const idx = lowerText.indexOf(keyword.toLowerCase());
  if (idx === -1) return null;

  const start = Math.max(0, idx - 100);
  const end = Math.min(text.length, idx + keyword.length + 100);
  return text.slice(start, end).trim();
}

function berekenRelevantie(response: string, query: string): number {
  const queryWords = query.toLowerCase().split(/\s+/);
  const responseLower = response.toLowerCase();

  let matches = 0;
  for (const word of queryWords) {
    if (word.length > 2 && responseLower.includes(word)) matches++;
  }

  return queryWords.length > 0 ? Math.min(1, matches / queryWords.length) : 0;
}

function detectSentiment(text: string, keyword: string): "positive" | "neutral" | "negative" {
  const lowerText = text.toLowerCase();
  const idx = lowerText.indexOf(keyword.toLowerCase());
  if (idx === -1) return "neutral";

  // Neem de context rond de mention
  const context = lowerText.slice(Math.max(0, idx - 200), Math.min(lowerText.length, idx + 200));

  const positiveWords = ["goed", "best", "aanbevol", "betrouwbaar", "snel", "professioneel", "ervaren", "specialist", "kwaliteit", "top"];
  const negativeWords = ["slecht", "duur", "langzaam", "probleem", "klacht", "niet aanbev", "matig", "teleurstell"];

  const posCount = positiveWords.filter((w) => context.includes(w)).length;
  const negCount = negativeWords.filter((w) => context.includes(w)).length;

  if (posCount > negCount) return "positive";
  if (negCount > posCount) return "negative";
  return "neutral";
}
