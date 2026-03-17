import "server-only";

/**
 * GEO Concurrentie-analyse & Content Gap Detectie
 *
 * Analyseert welke concurrenten geciteerd worden door AI engines
 * en detecteert content gaps waar TopTalent nog geen content voor heeft.
 */

import { supabaseAdmin } from "@/lib/supabase";
import type { GeoStad } from "./types";
import { GEO_STEDEN } from "./types";

interface ConcurrentScore {
  naam: string;
  website: string;
  citaties: number;
  queries: string[];
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
}

/**
 * Analyseer concurrenten uit citation data
 * Identificeert wie er wél geciteerd wordt waar TopTalent dat niet wordt
 */
export async function analyseerConcurrenten(): Promise<ConcurrentScore[]> {
  // Haal alle citations op waar TopTalent NIET geciteerd werd
  const { data: missedCitations } = await supabaseAdmin
    .from("geo_citations")
    .select("concurrenten_urls, zoekopdracht")
    .eq("geciteerd", false)
    .order("created_at", { ascending: false })
    .limit(200);

  if (!missedCitations || missedCitations.length === 0) return [];

  // Tel hoe vaak elke concurrent URL voorkomt
  const concurrentMap = new Map<string, { count: number; queries: Set<string> }>();

  for (const citation of missedCitations) {
    const urls = citation.concurrenten_urls || [];
    for (const url of urls) {
      // Normaliseer URL naar domein
      const domain = extractDomain(url);
      if (!domain || domain.includes("toptalent")) continue;

      const existing = concurrentMap.get(domain) || { count: 0, queries: new Set() };
      existing.count++;
      existing.queries.add(citation.zoekopdracht);
      concurrentMap.set(domain, existing);
    }
  }

  // Sorteer op frequentie
  const scores: ConcurrentScore[] = Array.from(concurrentMap.entries())
    .map(([domain, data]) => ({
      naam: domain.replace(/^www\./, "").split(".")[0],
      website: domain,
      citaties: data.count,
      queries: Array.from(data.queries).slice(0, 10),
    }))
    .sort((a, b) => b.citaties - a.citaties)
    .slice(0, 20);

  // Update concurrenten tabel
  for (const score of scores.slice(0, 10)) {
    await supabaseAdmin.from("geo_concurrenten").upsert(
      {
        naam: score.naam,
        website: score.website,
        actief: true,
        laatste_check: new Date().toISOString(),
        totaal_citaties: score.citaties,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "website" }
    );
  }

  return scores;
}

/**
 * Detecteer content gaps — queries waar we geen goede content voor hebben
 */
export async function detecteerContentGaps(): Promise<ContentGap[]> {
  // Haal queries op waar TopTalent niet geciteerd werd
  const { data: missedCitations } = await supabaseAdmin
    .from("geo_citations")
    .select("zoekopdracht, concurrenten_urls, engine")
    .eq("geciteerd", false)
    .order("created_at", { ascending: false })
    .limit(200);

  if (!missedCitations || missedCitations.length === 0) return [];

  // Groepeer per unieke zoekopdracht
  const queryMap = new Map<
    string,
    {
      count: number;
      concurrenten: Set<string>;
      engines: Set<string>;
    }
  >();

  for (const citation of missedCitations) {
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

  const bestaandeQueries = new Set((bestaandeGaps || []).map((g) => g.zoekopdracht.toLowerCase()));

  const gaps: ContentGap[] = [];

  for (const [query, data] of queryMap.entries()) {
    // Skip als we hier al een gap voor hebben
    if (bestaandeQueries.has(query)) continue;

    // Bepaal stad
    const stad = detecteerStad(query);

    // Bepaal volume schatting (meer misses = hoger volume)
    const volume = data.count >= 5 ? "hoog" : data.count >= 2 ? "middel" : "laag";

    // Bepaal voorgesteld content type
    const type = bepaalContentType(query);

    // Bepaal prioriteit (1-10, lager = belangrijker)
    const prioriteit = Math.max(1, 10 - data.count - (data.engines.size * 2));

    gaps.push({
      zoekopdracht: query,
      stad,
      concurrent_urls: Array.from(data.concurrenten).slice(0, 5),
      concurrent_titels: [], // Wordt later gevuld
      geschat_volume: volume,
      voorgesteld_type: type,
      voorgestelde_keywords: extractKeywords(query),
      prioriteit: Math.max(1, Math.min(10, prioriteit)),
    });
  }

  // Sorteer op prioriteit
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
export async function getConcurrentenOverzicht(): Promise<any[]> {
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
export async function getContentGaps(status?: string): Promise<any[]> {
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
 */
export async function runCompetitorAnalysis(): Promise<{
  concurrenten: number;
  gaps: number;
  errors: string[];
}> {
  const errors: string[] = [];
  let concurrentenCount = 0;
  let gapsCount = 0;

  try {
    const concurrenten = await analyseerConcurrenten();
    concurrentenCount = concurrenten.length;
    console.log(`[GEO Competitor] ${concurrentenCount} concurrenten geïdentificeerd`);
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

  return { concurrenten: concurrentenCount, gaps: gapsCount, errors };
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
  if (q.includes("amsterdam")) return "amsterdam";
  if (q.includes("rotterdam")) return "rotterdam";
  if (q.includes("den haag") || q.includes("denhaag")) return "den-haag";
  if (q.includes("utrecht")) return "utrecht";
  return null;
}

function bepaalContentType(query: string): string {
  const q = query.toLowerCase();

  if (q.includes("kosten") || q.includes("prijs") || q.includes("tarief") || q.includes("hoe") || q.includes("wat")) {
    return "faq_cluster";
  }
  if (q.includes("uitzend") || q.includes("detacher") || q.includes("recruit")) {
    return "service_guide";
  }
  if (q.includes("tekort") || q.includes("trend") || q.includes("markt")) {
    return "authority_article";
  }
  return "city_page";
}

function extractKeywords(query: string): string[] {
  const stopwoorden = new Set([
    "de", "het", "een", "van", "in", "op", "voor", "met", "is", "en", "of",
    "te", "aan", "bij", "naar", "om", "dat", "die", "wat", "hoe", "waar",
    "wie", "wanneer", "welk", "welke", "kan", "kun", "moet", "wil",
  ]);

  return query
    .toLowerCase()
    .split(/\s+/)
    .filter((w) => w.length > 2 && !stopwoorden.has(w))
    .slice(0, 8);
}
