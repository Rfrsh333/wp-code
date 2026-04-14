import "server-only";

/**
 * GEO Concurrentie-analyse & Content Gap Detectie — Module 4
 *
 * Conform Master Prompt v1.0:
 * - Genereert gestructureerd concurrentie-rapport (JSON)
 * - Identificeert content gaps volgens strikte regels
 * - Analyseert sterke/zwakke punten per concurrent
 * - Prioriteert gaps op basis van engines, concurrent-count en volume
 */

import { supabaseAdmin } from "@/lib/supabase";
import type { GeoStad } from "./types";
import { GEO_STEDEN } from "./types";

// --- Interfaces conform Master Prompt Module 4 ---

interface CitationRecord {
  concurrenten_urls?: string[];
  zoekopdracht?: string;
  engine?: string;
  citatie_positie?: number;
  stad?: string;
  toptalent_geciteerd?: boolean;
  [key: string]: unknown;
}

interface ConcurrentScore {
  naam: string;
  website: string;
  citaties: number;
  citatie_percentage: number;
  queries: string[];
  sterke_punten: string[];
  zwakke_punten: string[];
}

interface ContentGap {
  zoekopdracht: string;
  stad: string | null;
  concurrent_urls: string[];
  concurrent_titels: string[];
  geschat_volume: "hoog" | "middel" | "laag";
  voorgesteld_type: string;
  voorgestelde_keywords: string[];
  prioriteit: number;
  engines_waar_gemist: string[];
  aantal_concurrenten_geciteerd: number;
}

/**
 * Gestructureerd concurrentie-rapport conform Master Prompt
 * Format: { period, total_queries_monitored, toptalent_citation_rate, top_competitors, ... }
 */
export interface ConcurrentieRapport {
  period: string;
  total_queries_monitored: number;
  toptalent_citation_rate: string;
  toptalent_brand_mentions: number;
  top_competitors: {
    naam: string;
    website: string;
    citation_rate: string;
    totaal_citaties: number;
    top_queries: string[];
    sterke_punten: string[];
    zwakke_punten: string[];
  }[];
  content_gaps_gevonden: number;
  aanbevelingen: string[];
}

/**
 * Genereer volledig concurrentie-rapport conform Master Prompt Module 4
 */
export async function genereerConcurrentieRapport(
  dagen: number = 30
): Promise<ConcurrentieRapport> {
  const startDatum = new Date();
  startDatum.setDate(startDatum.getDate() - dagen);
  const startStr = startDatum.toISOString().split("T")[0];
  const eindStr = new Date().toISOString().split("T")[0];

  // Haal alle citations op in de periode
  const { data: alleCitations } = await supabaseAdmin
    .from("geo_citations")
    .select("*")
    .gte("created_at", startDatum.toISOString())
    .order("created_at", { ascending: false })
    .limit(500);

  const citations = alleCitations || [];
  const totalQueries = citations.length;

  // TopTalent citation rate
  const geciteerd = citations.filter((c) => c.geciteerd).length;
  const citationRate =
    totalQueries > 0 ? ((geciteerd / totalQueries) * 100).toFixed(1) : "0.0";

  // Brand mentions tellen (uit response_snippet)
  const brandMentions = citations.filter(
    (c) =>
      c.response_snippet &&
      c.response_snippet.toLowerCase().includes("toptalent")
  ).length;

  // Analyseer concurrenten
  const concurrenten = await analyseerConcurrenten(citations);

  // Tel content gaps
  const { data: openGaps } = await supabaseAdmin
    .from("geo_content_gaps")
    .select("id")
    .eq("status", "open");

  // Genereer aanbevelingen
  const aanbevelingen = genereerAanbevelingen(
    parseFloat(citationRate),
    concurrenten,
    (openGaps || []).length
  );

  return {
    period: `${startStr} tot ${eindStr}`,
    total_queries_monitored: totalQueries,
    toptalent_citation_rate: `${citationRate}%`,
    toptalent_brand_mentions: brandMentions,
    top_competitors: concurrenten.slice(0, 10).map((c) => ({
      naam: c.naam,
      website: c.website,
      citation_rate: `${c.citatie_percentage.toFixed(1)}%`,
      totaal_citaties: c.citaties,
      top_queries: c.queries.slice(0, 5),
      sterke_punten: c.sterke_punten,
      zwakke_punten: c.zwakke_punten,
    })),
    content_gaps_gevonden: (openGaps || []).length,
    aanbevelingen,
  };
}

/**
 * Analyseer concurrenten uit citation data
 * Identificeert wie er wél geciteerd wordt waar TopTalent dat niet wordt
 * + analyseert sterke/zwakke punten per concurrent
 */
export async function analyseerConcurrenten(
  citationsInput?: CitationRecord[]
): Promise<ConcurrentScore[]> {
  let citations = citationsInput;

  if (!citations) {
    const { data: missedCitations } = await supabaseAdmin
      .from("geo_citations")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(500);
    citations = missedCitations || [];
  }

  if (citations.length === 0) return [];

  // Totaal checks per concurrent-domein
  const totalChecks = citations.length;

  // Tel hoe vaak elke concurrent URL voorkomt
  const concurrentMap = new Map<
    string,
    {
      citaties: number;
      queries: Set<string>;
      engines: Set<string>;
      posities: number[];
    }
  >();

  for (const citation of citations) {
    const urls = citation.concurrenten_urls || [];
    for (const url of urls) {
      const domain = extractDomain(url);
      if (!domain || domain.includes("toptalent")) continue;

      const existing = concurrentMap.get(domain) || {
        citaties: 0,
        queries: new Set(),
        engines: new Set(),
        posities: [],
      };

      existing.citaties++;
      if (citation.zoekopdracht) existing.queries.add(citation.zoekopdracht);
      if (citation.engine) existing.engines.add(citation.engine);

      if (citation.citatie_positie) {
        existing.posities.push(citation.citatie_positie);
      }

      concurrentMap.set(domain, existing);
    }
  }

  // Bouw scores met sterke/zwakke punten analyse
  const scores: ConcurrentScore[] = Array.from(concurrentMap.entries())
    .map(([domain, data]) => {
      const gemPositie =
        data.posities.length > 0
          ? data.posities.reduce((a, b) => a + b, 0) / data.posities.length
          : 0;

      const sterke_punten: string[] = [];
      const zwakke_punten: string[] = [];

      // Analyseer sterke punten
      if (data.citaties > totalChecks * 0.3)
        sterke_punten.push("Hoge citation rate (>30%)");
      if (data.engines.size >= 3)
        sterke_punten.push(`Geciteerd door ${data.engines.size} engines`);
      if (gemPositie > 0 && gemPositie <= 2)
        sterke_punten.push("Vaak als eerste bron geciteerd");
      if (data.queries.size >= 10)
        sterke_punten.push("Breed topicbereik");

      // Analyseer zwakke punten
      if (data.engines.size === 1)
        zwakke_punten.push(`Alleen geciteerd door ${Array.from(data.engines)[0]}`);
      if (gemPositie > 3)
        zwakke_punten.push("Gemiddeld lage positie in bronnenlijst");
      if (data.queries.size <= 3)
        zwakke_punten.push("Beperkt topicbereik");

      return {
        naam: domain.replace(/^www\./, "").split(".")[0],
        website: domain,
        citaties: data.citaties,
        citatie_percentage:
          totalChecks > 0 ? (data.citaties / totalChecks) * 100 : 0,
        queries: Array.from(data.queries).slice(0, 10),
        sterke_punten,
        zwakke_punten,
      };
    })
    .sort((a, b) => b.citaties - a.citaties)
    .slice(0, 20);

  // Update concurrenten tabel met sterke/zwakke punten
  for (const score of scores.slice(0, 10)) {
    await supabaseAdmin.from("geo_concurrenten").upsert(
      {
        naam: score.naam,
        website: score.website,
        actief: true,
        laatste_check: new Date().toISOString(),
        totaal_citaties: score.citaties,
        citatie_percentage: score.citatie_percentage,
        sterke_punten: score.sterke_punten,
        zwakke_punten: score.zwakke_punten,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "website" }
    );
  }

  return scores;
}

/**
 * Detecteer content gaps conform Master Prompt Module 4
 *
 * Een content gap bestaat wanneer:
 * 1. TopTalent NIET geciteerd wordt voor een query
 * 2. Maar minimaal 1 concurrent WÉL geciteerd wordt
 *
 * Prioriteit wordt bepaald door:
 * - Aantal engines waar gemist (meer engines = hogere prioriteit)
 * - Aantal concurrenten dat wél geciteerd wordt
 * - Geschat zoekvolume
 */
export async function detecteerContentGaps(): Promise<ContentGap[]> {
  // Haal queries op waar TopTalent niet geciteerd werd
  // maar waar WEL concurrenten geciteerd werden (Master Prompt regel)
  const { data: missedCitations } = await supabaseAdmin
    .from("geo_citations")
    .select("zoekopdracht, concurrenten_urls, engine")
    .eq("geciteerd", false)
    .order("created_at", { ascending: false })
    .limit(300);

  if (!missedCitations || missedCitations.length === 0) return [];

  // Filter: alleen gaps waar minimaal 1 concurrent WÉL geciteerd werd
  const relevantCitations = missedCitations.filter(
    (c) => c.concurrenten_urls && c.concurrenten_urls.length > 0
  );

  if (relevantCitations.length === 0) return [];

  // Groepeer per unieke zoekopdracht
  const queryMap = new Map<
    string,
    {
      count: number;
      concurrenten: Set<string>;
      engines: Set<string>;
    }
  >();

  for (const citation of relevantCitations) {
    const q = citation.zoekopdracht.toLowerCase().trim();
    const existing = queryMap.get(q) || {
      count: 0,
      concurrenten: new Set(),
      engines: new Set(),
    };

    existing.count++;
    existing.engines.add(citation.engine);

    for (const url of citation.concurrenten_urls || []) {
      existing.concurrenten.add(url);
    }

    queryMap.set(q, existing);
  }

  // Haal bestaande content gaps op om duplicaten te vermijden
  const { data: bestaandeGaps } = await supabaseAdmin
    .from("geo_content_gaps")
    .select("zoekopdracht")
    .in("status", ["open", "gepland"]);

  const bestaandeQueries = new Set(
    (bestaandeGaps || []).map((g) => g.zoekopdracht.toLowerCase())
  );

  const gaps: ContentGap[] = [];

  for (const [query, data] of queryMap.entries()) {
    if (bestaandeQueries.has(query)) continue;

    const stad = detecteerStad(query);

    // Volume schatting: meer misses + meer engines = hoger volume
    const engineFactor = data.engines.size >= 3 ? 2 : data.engines.size >= 2 ? 1 : 0;
    const adjustedCount = data.count + engineFactor;
    const volume =
      adjustedCount >= 5 ? "hoog" : adjustedCount >= 2 ? "middel" : "laag";

    const type = bepaalContentType(query);

    // Prioriteit conform master prompt:
    // Lager = belangrijker. Factoren: engines waar gemist, concurrent count, volume
    const engineScore = data.engines.size * 3; // meer engines = urgenter
    const concurrentScore = Math.min(data.concurrenten.size, 5) * 2; // meer concurrenten = urgenter
    const volumeScore = data.count; // meer misses = urgenter
    const rawPriority = 10 - engineScore - concurrentScore - volumeScore;
    const prioriteit = Math.max(1, Math.min(10, rawPriority));

    gaps.push({
      zoekopdracht: query,
      stad,
      concurrent_urls: Array.from(data.concurrenten).slice(0, 5),
      concurrent_titels: [], // Wordt via scraping gevuld
      geschat_volume: volume,
      voorgesteld_type: type,
      voorgestelde_keywords: extractKeywords(query),
      prioriteit,
      engines_waar_gemist: Array.from(data.engines),
      aantal_concurrenten_geciteerd: data.concurrenten.size,
    });
  }

  // Sorteer op prioriteit (laagst eerst = belangrijkst)
  gaps.sort((a, b) => a.prioriteit - b.prioriteit);

  // Sla nieuwe gaps op in database
  for (const gap of gaps.slice(0, 20)) {
    await supabaseAdmin.from("geo_content_gaps").insert({
      zoekopdracht: gap.zoekopdracht,
      stad: gap.stad,
      geschat_volume: gap.geschat_volume,
      concurrent_urls: gap.concurrent_urls,
      concurrent_titels: gap.concurrent_titels,
      voorgesteld_type: gap.voorgesteld_type,
      voorgestelde_keywords: gap.voorgestelde_keywords,
      prioriteit: gap.prioriteit,
      status: "open",
    });
  }

  return gaps.slice(0, 20);
}

/**
 * Haal concurrenten overzicht op voor dashboard
 */
export async function getConcurrentenOverzicht(): Promise<Record<string, unknown>[]> {
  const { data } = await supabaseAdmin
    .from("geo_concurrenten")
    .select("*")
    .eq("actief", true)
    .order("totaal_citaties", { ascending: false })
    .limit(20);

  return data || [];
}

/**
 * Haal content gaps op voor dashboard
 */
export async function getContentGaps(status?: string): Promise<Record<string, unknown>[]> {
  let query = supabaseAdmin
    .from("geo_content_gaps")
    .select("*")
    .order("prioriteit", { ascending: true });

  if (status) query = query.eq("status", status);

  const { data } = await query.limit(50);
  return data || [];
}

/**
 * Run volledige concurrentie-analyse en gap detectie
 * Retourneert ook het gestructureerde rapport
 */
export async function runCompetitorAnalysis(): Promise<{
  concurrenten: number;
  gaps: number;
  rapport: ConcurrentieRapport | null;
  errors: string[];
}> {
  const errors: string[] = [];
  let concurrentenCount = 0;
  let gapsCount = 0;
  let rapport: ConcurrentieRapport | null = null;

  try {
    const concurrenten = await analyseerConcurrenten();
    concurrentenCount = concurrenten.length;
    console.log(
      `[GEO Competitor] ${concurrentenCount} concurrenten geïdentificeerd`
    );
  } catch (err) {
    errors.push(`Concurrentie-analyse fout: ${(err as Error).message}`);
  }

  try {
    const gaps = await detecteerContentGaps();
    gapsCount = gaps.length;
    console.log(`[GEO Competitor] ${gapsCount} content gaps gedetecteerd`);
  } catch (err) {
    errors.push(`Content gap detectie fout: ${(err as Error).message}`);
  }

  try {
    rapport = await genereerConcurrentieRapport(30);
    console.log(
      `[GEO Competitor] Rapport gegenereerd: ${rapport.toptalent_citation_rate} citation rate`
    );
  } catch (err) {
    errors.push(`Rapport generatie fout: ${(err as Error).message}`);
  }

  return { concurrenten: concurrentenCount, gaps: gapsCount, rapport, errors };
}

// --- Helpers ---

function extractDomain(url: string): string | null {
  try {
    if (!url.startsWith("http")) url = `https://${url}`;
    const u = new URL(url);
    return u.hostname;
  } catch {
    return null;
  }
}

function detecteerStad(query: string): string | null {
  const q = query.toLowerCase();
  for (const [key, stad] of Object.entries(GEO_STEDEN)) {
    if (q.includes(stad.naam.toLowerCase())) return key;
    // Check voor varianten
    if (key === "den-haag" && (q.includes("den haag") || q.includes("denhaag")))
      return key;
  }
  return null;
}

function bepaalContentType(query: string): string {
  const q = query.toLowerCase();

  // FAQ-achtige queries
  if (
    q.includes("kosten") ||
    q.includes("prijs") ||
    q.includes("tarief") ||
    q.includes("hoe") ||
    q.includes("wat") ||
    q.includes("wanneer") ||
    q.includes("waarom")
  ) {
    return "faq_cluster";
  }

  // Dienst-gerelateerde queries
  if (
    q.includes("uitzend") ||
    q.includes("detacher") ||
    q.includes("recruit") ||
    q.includes("personeel") ||
    q.includes("inhuur")
  ) {
    return "service_guide";
  }

  // Marktinzicht queries
  if (
    q.includes("tekort") ||
    q.includes("trend") ||
    q.includes("markt") ||
    q.includes("cijfers") ||
    q.includes("statistiek")
  ) {
    return "authority_article";
  }

  // Stad-specifieke queries → city page
  if (detecteerStad(q)) {
    return "city_page";
  }

  return "faq_cluster"; // Default: FAQ is meest GEO-vriendelijk
}

function extractKeywords(query: string): string[] {
  const stopwoorden = new Set([
    "de",
    "het",
    "een",
    "van",
    "in",
    "op",
    "voor",
    "met",
    "is",
    "en",
    "of",
    "te",
    "aan",
    "bij",
    "naar",
    "om",
    "dat",
    "die",
    "wat",
    "hoe",
    "waar",
    "wie",
    "wanneer",
    "welk",
    "welke",
    "kan",
    "kun",
    "moet",
    "wil",
    "best",
    "beste",
    "goed",
    "goede",
  ]);

  return query
    .toLowerCase()
    .split(/\s+/)
    .filter((w) => w.length > 2 && !stopwoorden.has(w))
    .slice(0, 8);
}

/**
 * Genereer aanbevelingen op basis van analyse resultaten
 */
function genereerAanbevelingen(
  citationRate: number,
  concurrenten: ConcurrentScore[],
  openGaps: number
): string[] {
  const aanbevelingen: string[] = [];

  // Citation rate aanbevelingen
  if (citationRate < 10) {
    aanbevelingen.push(
      "URGENT: Citation rate onder 10%. Focus op FAQ content met statistieken en bronvermeldingen."
    );
  } else if (citationRate < 25) {
    aanbevelingen.push(
      "Citation rate onder 25%. Voeg meer citeerbare elementen toe: statistieken, bronnen, gestructureerde FAQ's."
    );
  } else if (citationRate >= 40) {
    aanbevelingen.push(
      "Sterke citation rate (>40%). Focus op behouden en uitbreiden naar nieuwe topics."
    );
  }

  // Concurrent-specifieke aanbevelingen
  const topConcurrent = concurrenten[0];
  if (topConcurrent && topConcurrent.citatie_percentage > citationRate) {
    aanbevelingen.push(
      `${topConcurrent.naam} heeft hogere citation rate. Analyseer hun content structuur voor verbeterpunten.`
    );
  }

  // Content gap aanbevelingen
  if (openGaps > 10) {
    aanbevelingen.push(
      `${openGaps} open content gaps. Prioriteer hoog-volume gaps en maak FAQ clusters.`
    );
  } else if (openGaps > 0) {
    aanbevelingen.push(
      `${openGaps} content gaps gevonden. Plan content generatie voor de hoogste prioriteiten.`
    );
  }

  // Multi-engine aanbevelingen
  const multiEngineConcurrenten = concurrenten.filter(
    (c) => c.sterke_punten.some((s) => s.includes("engines"))
  );
  if (multiEngineConcurrenten.length > 0) {
    aanbevelingen.push(
      "Sommige concurrenten worden door meerdere AI engines geciteerd. Optimaliseer content voor cross-engine zichtbaarheid."
    );
  }

  // Altijd minstens 1 aanbeveling
  if (aanbevelingen.length === 0) {
    aanbevelingen.push(
      "Monitoring data nog beperkt. Voer meer citation checks uit voor betrouwbare analyse."
    );
  }

  return aanbevelingen;
}
