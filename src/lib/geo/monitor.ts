import "server-only";

/**
 * GEO Monitor — Checkt of AI zoekmachines TopTalent content citeren
 *
 * Werkt door zoekopdrachten te simuleren via de Perplexity/OpenAI API's
 * en te analyseren of TopTalent in de bronnen/citaties voorkomt.
 */

import { supabaseAdmin } from "@/lib/supabase";
import type { GeoContent } from "./types";

type AIEngine = "perplexity" | "chatgpt" | "google_ai";

interface CitationCheckResult {
  engine: AIEngine;
  zoekopdracht: string;
  geciteerd: boolean;
  citatie_positie: number | null;
  citatie_tekst: string | null;
  bron_url: string | null;
  totaal_bronnen: number;
  concurrenten_urls: string[];
  response_snippet: string;
  relevantie_score: number;
}

/**
 * Genereer zoekopdrachten op basis van content
 * Dit zijn de queries die echte gebruikers aan AI zoekmachines stellen
 */
export function generateSearchQueries(content: GeoContent): string[] {
  const stadNaam = content.stad === "den-haag"
    ? "Den Haag"
    : content.stad.charAt(0).toUpperCase() + content.stad.slice(1);

  const baseQueries = [
    `horeca uitzendbureau ${stadNaam}`,
    `horeca personeel ${stadNaam}`,
    `beste uitzendbureau horeca ${stadNaam}`,
    `snel horeca personeel nodig ${stadNaam}`,
    `uitzendkracht horeca kosten ${stadNaam}`,
  ];

  // Voeg content-specifieke queries toe
  if (content.content_type === "faq_cluster" && content.faq_items?.length > 0) {
    // Gebruik FAQ vragen als zoekopdrachten (dat is precies wat mensen vragen)
    const faqQueries = content.faq_items
      .slice(0, 3)
      .map((faq) => faq.question.replace(/\?$/, ""));
    baseQueries.push(...faqQueries);
  }

  if (content.content_type === "service_guide") {
    baseQueries.push(
      `uitzenden horeca ${stadNaam} hoe werkt het`,
      `detachering horeca ${stadNaam}`,
      `recruitment horeca personeel ${stadNaam}`
    );
  }

  // Voeg primary keywords toe als queries
  if (content.primary_keywords?.length > 0) {
    baseQueries.push(...content.primary_keywords.slice(0, 2));
  }

  // Deduplicate
  return [...new Set(baseQueries)].slice(0, 10);
}

/**
 * Check Perplexity API of TopTalent geciteerd wordt
 * Gebruikt de Perplexity Online API (sonar model) die bronnen teruggeeft
 */
async function checkPerplexity(query: string): Promise<CitationCheckResult> {
  const apiKey = process.env.PERPLEXITY_API_KEY;

  if (!apiKey) {
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
        messages: [
          {
            role: "user",
            content: query,
          },
        ],
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

    // Check of TopTalent in de bronnen staat
    const toptalentIndex = citations.findIndex(
      (url: string) =>
        url.includes("toptalentjobs.nl") ||
        url.includes("toptalent.nl") ||
        url.includes("toptalentjobs")
    );

    const geciteerd = toptalentIndex !== -1;
    const concurrenten = citations.filter(
      (url: string) =>
        !url.includes("toptalentjobs") &&
        (url.includes("uitzendbureau") ||
          url.includes("horeca") ||
          url.includes("personeel") ||
          url.includes("staffing"))
    );

    // Bereken relevantie score
    const relevantieScore = berekenRelevantie(content, query);

    return {
      engine: "perplexity",
      zoekopdracht: query,
      geciteerd,
      citatie_positie: geciteerd ? toptalentIndex + 1 : null,
      citatie_tekst: geciteerd ? extractCitationContext(content, "toptalentjobs") : null,
      bron_url: geciteerd ? citations[toptalentIndex] : null,
      totaal_bronnen: citations.length,
      concurrenten_urls: concurrenten.slice(0, 10),
      response_snippet: content.slice(0, 500),
      relevantie_score: relevantieScore,
    };
  } catch (error) {
    console.error(`[GEO Monitor] Perplexity check fout:`, error);
    return createEmptyResult("perplexity", query, (error as Error).message);
  }
}

/**
 * Check via OpenAI (ChatGPT) web search
 * Gebruikt het GPT-4o model met web browsing
 */
async function checkChatGPT(query: string): Promise<CitationCheckResult> {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
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
            content:
              "Je bent een zoekhulp. Beantwoord de vraag en vermeld altijd je bronnen met URLs. Noem specifieke bedrijven en websites.",
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

    // Check of TopTalent genoemd wordt in het antwoord
    const geciteerd =
      content.toLowerCase().includes("toptalent") ||
      content.toLowerCase().includes("toptalentjobs");

    // Zoek concurrenten in het antwoord
    const concurrentenPatterns = [
      /(?:www\.)?(\w+(?:uitzend|staffing|horeca|personeel)\w*\.(?:nl|com))/gi,
      /(?:www\.)?(\w+\.nl)/gi,
    ];

    const gevondenUrls: string[] = [];
    for (const pattern of concurrentenPatterns) {
      const matches = content.matchAll(pattern);
      for (const match of matches) {
        if (!match[0].includes("toptalent")) {
          gevondenUrls.push(match[0]);
        }
      }
    }

    return {
      engine: "chatgpt",
      zoekopdracht: query,
      geciteerd,
      citatie_positie: geciteerd ? 1 : null,
      citatie_tekst: geciteerd ? extractCitationContext(content, "toptalent") : null,
      bron_url: geciteerd ? "https://toptalentjobs.nl" : null,
      totaal_bronnen: 0, // ChatGPT geeft geen gestructureerde bronnenlijst
      concurrenten_urls: [...new Set(gevondenUrls)].slice(0, 10),
      response_snippet: content.slice(0, 500),
      relevantie_score: berekenRelevantie(content, query),
    };
  } catch (error) {
    console.error(`[GEO Monitor] ChatGPT check fout:`, error);
    return createEmptyResult("chatgpt", query, (error as Error).message);
  }
}

/**
 * Voer een volledige citation check uit voor één content item
 */
export async function checkContentCitations(
  content: GeoContent,
  engines: AIEngine[] = ["perplexity"]
): Promise<CitationCheckResult[]> {
  const queries = generateSearchQueries(content);
  const results: CitationCheckResult[] = [];

  for (const query of queries.slice(0, 5)) {
    for (const engine of engines) {
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

      // Sla op in database
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

      // Rate limiting: wacht tussen API calls
      await new Promise((r) => setTimeout(r, 1500));
    }
  }

  return results;
}

/**
 * Run monitoring voor alle gepubliceerde content
 */
export async function runFullMonitoring(options?: {
  maxItems?: number;
  engines?: AIEngine[];
}): Promise<{
  checked: number;
  citaties_gevonden: number;
  errors: string[];
}> {
  const maxItems = options?.maxItems || 5;
  const engines = options?.engines || ["perplexity"];

  // Haal gepubliceerde content op, gesorteerd op laatst gecheckt
  const { data: content } = await supabaseAdmin
    .from("geo_content")
    .select("*")
    .eq("status", "gepubliceerd")
    .order("updated_at", { ascending: true })
    .limit(maxItems);

  if (!content || content.length === 0) {
    return { checked: 0, citaties_gevonden: 0, errors: ["Geen gepubliceerde content om te monitoren"] };
  }

  let checked = 0;
  let citaties_gevonden = 0;
  const errors: string[] = [];

  for (const item of content) {
    try {
      console.log(`[GEO Monitor] Checken: ${item.title}`);
      const results = await checkContentCitations(item as GeoContent, engines);

      const citaties = results.filter((r) => r.geciteerd).length;
      citaties_gevonden += citaties;
      checked++;

      console.log(`[GEO Monitor] ✅ ${item.title}: ${citaties}/${results.length} citaties`);
    } catch (err) {
      errors.push(`Fout bij ${item.title}: ${(err as Error).message}`);
      console.error(`[GEO Monitor] ❌ ${item.title}:`, err);
    }
  }

  // Update dagelijkse performance metrics
  await updateDailyPerformance();

  return { checked, citaties_gevonden, errors };
}

/**
 * Update dagelijkse performance aggregatie
 */
async function updateDailyPerformance(): Promise<void> {
  const today = new Date().toISOString().split("T")[0];

  // Haal alle content IDs op
  const { data: contentItems } = await supabaseAdmin
    .from("geo_content")
    .select("id")
    .eq("status", "gepubliceerd");

  if (!contentItems) return;

  for (const item of contentItems) {
    // Tel citaties van vandaag per engine
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

  if (options?.content_id) {
    query = query.eq("geo_content_id", options.content_id);
  }

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
    citatie_positie: null,
    citatie_tekst: null,
    bron_url: null,
    totaal_bronnen: 0,
    concurrenten_urls: [],
    response_snippet: `Check niet uitgevoerd: ${reden}`,
    relevantie_score: 0,
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
    if (word.length > 2 && responseLower.includes(word)) {
      matches++;
    }
  }

  return queryWords.length > 0 ? Math.min(1, matches / queryWords.length) : 0;
}
