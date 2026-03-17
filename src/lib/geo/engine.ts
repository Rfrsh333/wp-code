import "server-only";

/**
 * GEO Engine — Content generatie via Anthropic Claude
 * Genereert AI-zoekmachine-geoptimaliseerde content voor TopTalent Jobs
 */

import { supabaseAdmin } from "@/lib/supabase";
import type {
  GeoContentType,
  GeoStad,
  GeoContent,
  GeoGenerationRequest,
  GeoGenerationResult,
} from "./types";
import { GEO_STEDEN } from "./types";
import {
  buildGeoSystemPrompt,
  buildCityPagePrompt,
  buildFaqClusterPrompt,
  buildServiceGuidePrompt,
  buildAuthorityArticlePrompt,
  getGeoContentPlan,
} from "./prompts";

const ANTHROPIC_API_URL = "https://api.anthropic.com/v1/messages";
const MODEL = "claude-sonnet-4-20250514";
const MAX_TOKENS = 8192;

function getAnthropicKey(): string {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) throw new Error("ANTHROPIC_API_KEY is niet geconfigureerd");
  return key.trim();
}

interface AnthropicResponse {
  content: Array<{ type: string; text?: string }>;
  usage: { input_tokens: number; output_tokens: number };
  model: string;
}

/**
 * Roep Anthropic Claude aan met GEO-specifieke system prompt
 */
async function callAnthropic(userPrompt: string): Promise<{ text: string; tokens: number; model: string }> {
  const response = await fetch(ANTHROPIC_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": getAnthropicKey(),
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: MAX_TOKENS,
      system: buildGeoSystemPrompt(),
      messages: [
        {
          role: "user",
          content: userPrompt,
        },
      ],
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Anthropic API fout (${response.status}): ${errorBody.slice(0, 300)}`);
  }

  const data = (await response.json()) as AnthropicResponse;
  const text = data.content
    .filter((c) => c.type === "text" && c.text)
    .map((c) => c.text!)
    .join("");

  const tokens = (data.usage?.input_tokens || 0) + (data.usage?.output_tokens || 0);

  return { text, tokens, model: data.model || MODEL };
}

/**
 * Parse JSON uit Anthropic response (handelt markdown code blocks af)
 */
function parseJsonResponse(text: string): any {
  // Strip eventuele markdown code blocks
  let cleaned = text.trim();
  if (cleaned.startsWith("```json")) {
    cleaned = cleaned.slice(7);
  } else if (cleaned.startsWith("```")) {
    cleaned = cleaned.slice(3);
  }
  if (cleaned.endsWith("```")) {
    cleaned = cleaned.slice(0, -3);
  }
  cleaned = cleaned.trim();

  try {
    return JSON.parse(cleaned);
  } catch (e) {
    throw new Error(`Kon JSON niet parsen uit Anthropic response: ${(e as Error).message}\n\nResponse: ${cleaned.slice(0, 500)}`);
  }
}

/**
 * Genereer een slug op basis van content type en stad
 */
function generateSlug(contentType: GeoContentType, stad: GeoStad, focus: string): string {
  const base = focus
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 80);
  return `${base}-${stad}`;
}

/**
 * Genereer één stuk GEO content
 */
export async function generateGeoContent(
  request: GeoGenerationRequest
): Promise<GeoGenerationResult> {
  const stadInfo = GEO_STEDEN[request.stad];
  if (!stadInfo) throw new Error(`Onbekende stad: ${request.stad}`);

  const keywords = request.focus_keywords || [];
  const startTime = Date.now();

  // Bouw de juiste prompt op basis van content type
  let prompt: string;
  switch (request.content_type) {
    case "city_page":
      prompt = buildCityPagePrompt(request.stad, stadInfo.naam, stadInfo.regio, keywords);
      break;
    case "faq_cluster":
      prompt = buildFaqClusterPrompt(
        request.stad,
        stadInfo.naam,
        request.extra_context || "horeca uitzendwerk",
        keywords
      );
      break;
    case "service_guide":
      prompt = buildServiceGuidePrompt(
        request.stad,
        stadInfo.naam,
        request.extra_context || "Uitzenden",
        keywords
      );
      break;
    case "authority_article":
      prompt = buildAuthorityArticlePrompt(
        request.stad,
        stadInfo.naam,
        request.extra_context || "Personeelstekort horeca",
        keywords
      );
      break;
    default:
      throw new Error(`Onbekend content type: ${request.content_type}`);
  }

  // Roep Anthropic aan
  const { text, tokens, model } = await callAnthropic(prompt);
  const parsed = parseJsonResponse(text);
  const duurMs = Date.now() - startTime;

  // Bouw slug
  const slug = parsed.slug || generateSlug(request.content_type, request.stad, parsed.title || request.content_type);

  return {
    content: {
      content_type: request.content_type,
      stad: request.stad,
      slug,
      taal: "nl",
      title: parsed.title || `GEO content: ${request.content_type} ${stadInfo.naam}`,
      meta_description: parsed.meta_description || null,
      seo_title: parsed.seo_title || parsed.title || null,
      canonical_url: `https://toptalentjobs.nl/geo/${slug}`,
      body_markdown: parsed.body_markdown || "",
      excerpt: parsed.excerpt || null,
      structured_data: parsed.structured_data || [],
      faq_items: parsed.faq_items || [],
      bronnen: parsed.bronnen || [],
      statistieken: parsed.statistieken || [],
      review_notities: null,
      gegenereerd_door: "geo-agent",
      primary_keywords: parsed.primary_keywords || keywords,
      secondary_keywords: parsed.secondary_keywords || [],
    },
    tokens_gebruikt: tokens,
    model,
    duur_ms: duurMs,
  };
}

/**
 * Sla gegenereerde content op in Supabase
 */
export async function saveGeoContent(
  result: GeoGenerationResult,
  autoPublish = false
): Promise<GeoContent> {
  const status = autoPublish ? "gepubliceerd" : "review";

  // Check of slug al bestaat
  const { data: existing } = await supabaseAdmin
    .from("geo_content")
    .select("id, versie")
    .eq("slug", result.content.slug)
    .single();

  let contentId: string;

  if (existing) {
    // Update bestaande content (nieuwe versie)
    const { data, error } = await supabaseAdmin
      .from("geo_content")
      .update({
        ...result.content,
        status,
        versie: existing.versie + 1,
        vorige_versie_id: existing.id,
        updated_at: new Date().toISOString(),
        gepubliceerd_op: autoPublish ? new Date().toISOString() : null,
      })
      .eq("id", existing.id)
      .select()
      .single();

    if (error) throw new Error(`Fout bij updaten geo_content: ${error.message}`);
    contentId = data.id;
  } else {
    // Nieuwe content aanmaken
    const { data, error } = await supabaseAdmin
      .from("geo_content")
      .insert({
        ...result.content,
        status,
        gepubliceerd_op: autoPublish ? new Date().toISOString() : null,
      })
      .select()
      .single();

    if (error) throw new Error(`Fout bij aanmaken geo_content: ${error.message}`);
    contentId = data.id;
  }

  // Log de generatie
  await supabaseAdmin.from("geo_generation_log").insert({
    content_id: contentId,
    actie: existing ? "bijgewerkt" : "gegenereerd",
    details: {
      content_type: result.content.content_type,
      stad: result.content.stad,
      auto_publish: autoPublish,
    },
    tokens_gebruikt: result.tokens_gebruikt,
    model: result.model,
    duur_ms: result.duur_ms,
  });

  // Haal de volledige content op
  const { data: saved } = await supabaseAdmin
    .from("geo_content")
    .select("*")
    .eq("id", contentId)
    .single();

  return saved as GeoContent;
}

/**
 * Haal alle content op (voor admin dashboard)
 */
export async function getGeoContentList(filters?: {
  status?: string;
  stad?: string;
  content_type?: string;
}): Promise<GeoContent[]> {
  let query = supabaseAdmin
    .from("geo_content")
    .select("*")
    .order("updated_at", { ascending: false });

  if (filters?.status) query = query.eq("status", filters.status);
  if (filters?.stad) query = query.eq("stad", filters.stad);
  if (filters?.content_type) query = query.eq("content_type", filters.content_type);

  const { data, error } = await query.limit(100);
  if (error) throw new Error(`Fout bij ophalen geo_content: ${error.message}`);
  return (data || []) as GeoContent[];
}

/**
 * Update content status (review → gepubliceerd, etc.)
 */
export async function updateGeoContentStatus(
  id: string,
  status: string,
  notities?: string
): Promise<GeoContent> {
  const updateData: any = {
    status,
    updated_at: new Date().toISOString(),
  };

  if (status === "gepubliceerd") {
    updateData.gepubliceerd_op = new Date().toISOString();
  }
  if (notities !== undefined) {
    updateData.review_notities = notities;
  }

  const { data, error } = await supabaseAdmin
    .from("geo_content")
    .update(updateData)
    .eq("id", id)
    .select()
    .single();

  if (error) throw new Error(`Fout bij updaten status: ${error.message}`);

  // Log status change
  await supabaseAdmin.from("geo_generation_log").insert({
    content_id: id,
    actie: status === "gepubliceerd" ? "gepubliceerd" : "status_gewijzigd",
    details: { new_status: status, notities },
  });

  return data as GeoContent;
}

/**
 * Haal generatie statistieken op
 */
export async function getGeoStats(): Promise<{
  totaal: number;
  per_status: Record<string, number>;
  per_stad: Record<string, number>;
  per_type: Record<string, number>;
  tokens_totaal: number;
  laatste_generatie: string | null;
}> {
  const { data: content } = await supabaseAdmin
    .from("geo_content")
    .select("status, stad, content_type");

  const { data: logs } = await supabaseAdmin
    .from("geo_generation_log")
    .select("tokens_gebruikt, created_at")
    .order("created_at", { ascending: false })
    .limit(1);

  const items = content || [];

  const per_status: Record<string, number> = {};
  const per_stad: Record<string, number> = {};
  const per_type: Record<string, number> = {};

  for (const item of items) {
    per_status[item.status] = (per_status[item.status] || 0) + 1;
    per_stad[item.stad] = (per_stad[item.stad] || 0) + 1;
    per_type[item.content_type] = (per_type[item.content_type] || 0) + 1;
  }

  // Totaal tokens
  const { data: tokenData } = await supabaseAdmin
    .from("geo_generation_log")
    .select("tokens_gebruikt");

  const tokens_totaal = (tokenData || []).reduce((sum, l) => sum + (l.tokens_gebruikt || 0), 0);

  return {
    totaal: items.length,
    per_status,
    per_stad,
    per_type,
    tokens_totaal,
    laatste_generatie: logs?.[0]?.created_at || null,
  };
}

/**
 * Run de volledige GEO content plan (voor cron)
 * Genereert content voor items die nog niet bestaan
 */
export async function runGeoContentPlan(options?: {
  maxItems?: number;
  autoPublish?: boolean;
  stad?: GeoStad;
}): Promise<{ generated: number; skipped: number; errors: string[] }> {
  const plan = getGeoContentPlan();
  const maxItems = options?.maxItems || 3; // Max 3 per keer (API kosten)
  const autoPublish = options?.autoPublish || false;

  // Filter op stad als opgegeven
  const filteredPlan = options?.stad
    ? plan.filter((p) => p.stad === options.stad)
    : plan;

  // Check welke slugs al bestaan
  const { data: existing } = await supabaseAdmin
    .from("geo_content")
    .select("slug");

  const existingSlugs = new Set((existing || []).map((e) => e.slug));

  const todoItems = filteredPlan.filter((p) => !existingSlugs.has(p.slug_prefix));

  let generated = 0;
  let skipped = 0;
  const errors: string[] = [];

  for (const item of todoItems.slice(0, maxItems)) {
    try {
      console.log(`[GEO] Genereren: ${item.content_type} voor ${item.stad} — ${item.focus}`);

      const result = await generateGeoContent({
        content_type: item.content_type,
        stad: item.stad,
        focus_keywords: item.keywords,
        extra_context: item.focus,
      });

      // Overschrijf slug met plan slug
      result.content.slug = item.slug_prefix;

      await saveGeoContent(result, autoPublish);
      generated++;

      console.log(`[GEO] ✅ Gegenereerd: ${item.slug_prefix} (${result.tokens_gebruikt} tokens, ${result.duur_ms}ms)`);

      // Kleine pauze tussen API calls
      if (generated < maxItems) {
        await new Promise((r) => setTimeout(r, 2000));
      }
    } catch (err) {
      const msg = `Fout bij ${item.slug_prefix}: ${(err as Error).message}`;
      console.error(`[GEO] ❌ ${msg}`);
      errors.push(msg);
    }
  }

  skipped = todoItems.length - generated - errors.length;

  return { generated, skipped: Math.max(0, skipped), errors };
}

/**
 * Haal gepubliceerde GEO content op voor publieke pagina's
 */
export async function getPublishedGeoContent(slug: string): Promise<GeoContent | null> {
  const { data } = await supabaseAdmin
    .from("geo_content")
    .select("*")
    .eq("slug", slug)
    .eq("status", "gepubliceerd")
    .single();

  return (data as GeoContent) || null;
}

/**
 * Haal alle gepubliceerde GEO content op per stad
 */
export async function getPublishedGeoContentByStad(stad: string): Promise<GeoContent[]> {
  const { data } = await supabaseAdmin
    .from("geo_content")
    .select("*")
    .eq("stad", stad)
    .eq("status", "gepubliceerd")
    .order("content_type")
    .order("updated_at", { ascending: false });

  return (data || []) as GeoContent[];
}
