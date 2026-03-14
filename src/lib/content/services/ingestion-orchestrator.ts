import "server-only";

import { supabaseAdmin } from "@/lib/supabase";
import { listActiveSources } from "@/lib/content/repository";
import { ingestSourceFeed } from "@/lib/content/services/source-ingestion-service";
import { extractRawArticle } from "@/lib/content/services/article-extraction-service";
import { getErrorMessage } from "@/lib/content/errors";
import type { FetchFrequency, SourceRecord } from "@/lib/content/types";

const FETCH_INTERVAL_MS: Record<FetchFrequency, number> = {
  hourly: 60 * 60 * 1000,
  every_6_hours: 6 * 60 * 60 * 1000,
  daily: 24 * 60 * 60 * 1000,
  weekly: 7 * 24 * 60 * 60 * 1000,
};

const INTER_SOURCE_DELAY_MS = 1_500;

function isDueForFetch(source: SourceRecord): boolean {
  if (!source.lastFetchedAt) return true;
  const interval = FETCH_INTERVAL_MS[source.fetchFrequency] ?? FETCH_INTERVAL_MS.daily;
  const elapsed = Date.now() - new Date(source.lastFetchedAt).getTime();
  return elapsed >= interval;
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

export async function runFeedIngestionPass() {
  const sources = await listActiveSources();
  const rssSources = sources.filter((source) => source.rssUrl);

  // Filter out dead sources and sources not yet due
  const eligible = rssSources.filter((source) => {
    if (source.healthStatus === "dead") {
      console.log(`[ingestion] Skipping dead source: ${source.name}`);
      return false;
    }
    if (!isDueForFetch(source)) {
      return false;
    }
    return true;
  });

  console.log(`[ingestion] ${sources.length} active sources, ${rssSources.length} with RSS, ${eligible.length} due for fetch`);

  const results: Array<{
    sourceId: string;
    sourceName: string;
    discoveredItems: number;
    fetchTimeMs?: number;
    status: "success" | "failed" | "skipped";
    error?: string;
  }> = [];

  for (let i = 0; i < eligible.length; i++) {
    const source = eligible[i];

    try {
      const result = await ingestSourceFeed(source);
      results.push({
        sourceId: source.id,
        sourceName: source.name,
        discoveredItems: result.discoveredItems,
        fetchTimeMs: result.fetchTimeMs,
        status: "success",
      });
    } catch (error) {
      results.push({
        sourceId: source.id,
        sourceName: source.name,
        discoveredItems: 0,
        status: "failed",
        error: getErrorMessage(error),
      });
    }

    // Rate limit: wait between sources to avoid hammering servers
    if (i < eligible.length - 1) {
      await sleep(INTER_SOURCE_DELAY_MS);
    }
  }

  const skippedDead = rssSources.filter((s) => s.healthStatus === "dead").length;
  const skippedNotDue = rssSources.length - eligible.length - skippedDead;

  return {
    processedSources: eligible.length,
    successes: results.filter((r) => r.status === "success").length,
    failures: results.filter((r) => r.status === "failed").length,
    skippedDead,
    skippedNotDue,
    results,
  };
}

const RELEVANCE_KEYWORDS = [
  // Horeca & hospitality
  "horeca", "hotel", "restaurant", "cafe", "catering", "hospitality",
  "keuken", "kok", "bediening", "housekeeping", "front office", "terras",
  "barista", "gastheer", "gastvrouw", "sommelier", "afwasser",
  // Personeel & staffing
  "personeel", "uitzend", "staffing", "medewerker", "werknemer", "vacature",
  "uitzendbur", "flexwerk", "detachering", "payroll", "onboarding",
  "recruitment", "werving", "selectie", "personeelstekort", "krapte",
  "tijdelijk personeel", "inleen", "uitzendkracht", "flex",
  // Loondienst & arbeidsvoorwaarden
  "cao", "minimumloon", "loon", "salaris", "contract", "arbeidsmarkt",
  "werkgever", "arbeidsovereenkomst", "arbeidsrecht", "ontslagrecht",
  "pensioen", "toeslagen", "overwerk", "werktijd", "loondoorbetaling",
  // ZZP & schijnzelfstandigheid
  "zzp", "schijnzelfstandig", "handhaving", "zelfstandig", "freelance",
  "opdrachtgever", "modelovereenkomst", "wet dba", "belastingdienst",
  // Vergunningen & compliance
  "vergunning", "exploitatie", "subsidie", "regelgeving", "compliance",
  "inspectie", "boete", "nvwa", "voedselveiligheid", "haccp",
  "arbeidsinspectie", "wet", "wetgeving", "regeling",
  // Ondernemen
  "ondernemer", "mkb", "bedrijf", "onderneming", "faillissement",
  "omzet", "winst", "kosten", "investering", "groei",
  // Arbeidsmigratie
  "arbeidsmigratie", "arbeidsmigranten", "expat", "kennismigrant",
  "werkvergunning", "tewerkstellingsvergunning",
];

function isLikelyRelevant(title: string | null, excerpt: string | null): boolean {
  const text = `${title ?? ""} ${excerpt ?? ""}`.toLowerCase();
  return RELEVANCE_KEYWORDS.some((keyword) => text.includes(keyword));
}

export async function runPendingExtractionPass(limit = 10) {
  const { data: pendingArticles, error } = await supabaseAdmin
    .from("raw_articles")
    .select("id, title, excerpt")
    .eq("fetch_status", "pending")
    .order("published_at", { ascending: false })
    .limit(limit * 5);

  if (error) {
    if (error.code === "42P01") {
      return {
        attempted: 0,
        extracted: 0,
        failed: 0,
        results: [],
      };
    }

    throw error;
  }

  const allPending = pendingArticles ?? [];
  const relevant = allPending.filter((a) =>
    isLikelyRelevant(a.title as string | null, a.excerpt as string | null),
  );
  const irrelevant = allPending.filter((a) =>
    !isLikelyRelevant(a.title as string | null, a.excerpt as string | null),
  );

  // Mark irrelevant articles as rejected so they're skipped next time
  if (irrelevant.length > 0) {
    const irrelevantIds = irrelevant.map((a) => String(a.id));
    await supabaseAdmin
      .from("raw_articles")
      .update({ fetch_status: "rejected" })
      .in("id", irrelevantIds);
  }

  const articleIds = relevant.slice(0, limit).map((article) => String(article.id));
  const results: Array<{ rawArticleId: string; status: "success" | "failed"; error?: string }> = [];

  for (const rawArticleId of articleIds) {
    try {
      await extractRawArticle(rawArticleId);
      results.push({ rawArticleId, status: "success" });
    } catch (error) {
      results.push({
        rawArticleId,
        status: "failed",
        error: getErrorMessage(error),
      });
    }
  }

  return {
    attempted: articleIds.length,
    extracted: results.filter((result) => result.status === "success").length,
    failed: results.filter((result) => result.status === "failed").length,
    skippedIrrelevant: irrelevant.length,
    results,
  };
}
