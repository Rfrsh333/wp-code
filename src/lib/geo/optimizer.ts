import "server-only";

/**
 * GEO Auto-Optimizer — Verbetert bestaande content automatisch
 *
 * Analyseert citatie-performance en past content aan:
 * - Meer FAQ's toevoegen als citatie-percentage laag is
 * - Statistieken updaten als ze verouderd zijn
 * - Structuur verbeteren op basis van wat concurrenten beter doen
 * - Keywords aanpassen op basis van wat AI engines prefereren
 */

import { supabaseAdmin } from "@/lib/supabase";
import type { GeoContent } from "./types";
import { buildGeoSystemPrompt } from "./prompts";

const ANTHROPIC_API_URL = "https://api.anthropic.com/v1/messages";
const MODEL = "claude-sonnet-4-20250514";

function getAnthropicKey(): string {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) throw new Error("ANTHROPIC_API_KEY is niet geconfigureerd");
  return key.trim();
}

interface OptimisatieSuggestie {
  actie: string;
  veld: string;
  beschrijving: string;
  prioriteit: "hoog" | "middel" | "laag";
  nieuwe_waarde?: string;
}

interface ContentAnalyse {
  score: number; // 0-100
  sterke_punten: string[];
  verbeterpunten: string[];
  suggesties: OptimisatieSuggestie[];
}

/**
 * Analyseer content en genereer optimalisatie-suggesties
 */
export async function analyseContent(content: GeoContent): Promise<ContentAnalyse> {
  // Haal citatie-data op
  const { data: citations } = await supabaseAdmin
    .from("geo_citations")
    .select("geciteerd, engine, citatie_positie, concurrenten_urls")
    .eq("geo_content_id", content.id)
    .order("created_at", { ascending: false })
    .limit(20);

  const totaalChecks = citations?.length || 0;
  const totaalCitaties = citations?.filter((c) => c.geciteerd).length || 0;
  const citatiePct = totaalChecks > 0 ? (totaalCitaties / totaalChecks) * 100 : 0;

  // Analyseer huidige content kwaliteit
  const suggesties: OptimisatieSuggestie[] = [];
  const sterkePunten: string[] = [];
  const verbeterPunten: string[] = [];

  // Check 1: FAQ items
  const faqCount = content.faq_items?.length || 0;
  if (faqCount < 5) {
    suggesties.push({
      actie: "faq_toevoegen",
      veld: "faq_items",
      beschrijving: `Slechts ${faqCount} FAQ items. AI engines prefereren 8-12 FAQ's.`,
      prioriteit: "hoog",
    });
    verbeterPunten.push("Te weinig FAQ items");
  } else if (faqCount >= 8) {
    sterkePunten.push(`${faqCount} FAQ items (goed voor AI engines)`);
  }

  // Check 2: Statistieken
  const statsCount = content.statistieken?.length || 0;
  if (statsCount < 3) {
    suggesties.push({
      actie: "stats_toevoegen",
      veld: "statistieken",
      beschrijving: `Slechts ${statsCount} statistieken. Voeg meer concrete cijfers toe.`,
      prioriteit: "hoog",
    });
    verbeterPunten.push("Te weinig statistieken");
  } else {
    sterkePunten.push(`${statsCount} statistieken aanwezig`);
  }

  // Check 3: Bronnen
  const bronCount = content.bronnen?.length || 0;
  if (bronCount < 2) {
    suggesties.push({
      actie: "bronnen_toevoegen",
      veld: "bronnen",
      beschrijving: "Voeg meer betrouwbare bronnen toe (CBS, KHN, UWV).",
      prioriteit: "middel",
    });
    verbeterPunten.push("Te weinig bronvermeldingen");
  } else {
    sterkePunten.push(`${bronCount} bronnen vermeld`);
  }

  // Check 4: Content lengte
  const woordCount = content.body_markdown?.split(/\s+/).length || 0;
  if (woordCount < 800) {
    suggesties.push({
      actie: "content_uitbreiden",
      veld: "body_markdown",
      beschrijving: `Content is ${woordCount} woorden. Minimaal 1200 woorden voor goede AI-citatie kans.`,
      prioriteit: "hoog",
    });
    verbeterPunten.push("Content te kort");
  } else if (woordCount >= 1500) {
    sterkePunten.push(`${woordCount} woorden (goede lengte)`);
  }

  // Check 5: Meta description
  if (!content.meta_description || content.meta_description.length < 50) {
    suggesties.push({
      actie: "meta_verbeteren",
      veld: "meta_description",
      beschrijving: "Meta description ontbreekt of is te kort.",
      prioriteit: "middel",
    });
    verbeterPunten.push("Meta description ontbreekt/te kort");
  }

  // Check 6: Direct antwoord in eerste alinea
  const eersteAlinea = content.body_markdown?.split("\n\n")[0] || "";
  if (eersteAlinea.length < 100) {
    suggesties.push({
      actie: "intro_verbeteren",
      veld: "body_markdown",
      beschrijving: "Eerste alinea is te kort. AI engines citeren vaak de eerste 2-3 zinnen.",
      prioriteit: "hoog",
    });
    verbeterPunten.push("Eerste alinea te kort voor citatie");
  } else {
    sterkePunten.push("Stevige introductie aanwezig");
  }

  // Check 7: Citatie performance
  if (totaalChecks > 0) {
    if (citatiePct >= 50) {
      sterkePunten.push(`${citatiePct.toFixed(0)}% citatie-percentage`);
    } else if (citatiePct < 20) {
      suggesties.push({
        actie: "volledige_herstructurering",
        veld: "body_markdown",
        beschrijving: `Laag citatie-percentage (${citatiePct.toFixed(0)}%). Content moet volledig geoptimaliseerd worden.`,
        prioriteit: "hoog",
      });
      verbeterPunten.push(`Laag citatie-percentage: ${citatiePct.toFixed(0)}%`);
    }
  }

  // Bereken overall score
  const maxScore = 100;
  let score = 50; // Start op 50

  // Positieve punten
  if (faqCount >= 8) score += 10;
  else if (faqCount >= 5) score += 5;

  if (statsCount >= 3) score += 10;
  if (bronCount >= 2) score += 5;
  if (woordCount >= 1500) score += 10;
  else if (woordCount >= 800) score += 5;

  if (content.meta_description && content.meta_description.length >= 50) score += 5;
  if (eersteAlinea.length >= 150) score += 5;

  // Citatie performance bonus
  if (citatiePct >= 50) score += 15;
  else if (citatiePct >= 20) score += 5;
  else if (totaalChecks > 0) score -= 10;

  // Negatieve punten
  score -= suggesties.filter((s) => s.prioriteit === "hoog").length * 5;

  return {
    score: Math.max(0, Math.min(maxScore, score)),
    sterke_punten: sterkePunten,
    verbeterpunten: verbeterPunten,
    suggesties,
  };
}

/**
 * Voer automatische optimalisatie uit op content
 */
export async function optimizeContent(
  content: GeoContent,
  suggesties?: OptimisatieSuggestie[]
): Promise<{ updated: boolean; changes: string[] }> {
  if (!suggesties) {
    const analyse = await analyseContent(content);
    suggesties = analyse.suggesties.filter((s) => s.prioriteit === "hoog");
  }

  if (suggesties.length === 0) {
    return { updated: false, changes: [] };
  }

  const changes: string[] = [];
  const stadNaam = content.stad === "den-haag"
    ? "Den Haag"
    : content.stad.charAt(0).toUpperCase() + content.stad.slice(1);

  // Bouw optimalisatie prompt
  const acties = suggesties.map((s) => `- ${s.actie}: ${s.beschrijving}`).join("\n");

  const prompt = `Je bent een GEO optimalisatie specialist. Verbeter de volgende content op basis van de analyse.

HUIDIGE CONTENT:
Titel: ${content.title}
Stad: ${stadNaam}
Type: ${content.content_type}
Huidige FAQ items: ${content.faq_items?.length || 0}
Huidige statistieken: ${content.statistieken?.length || 0}
Huidige bronnen: ${content.bronnen?.length || 0}

VEREISTE VERBETERINGEN:
${acties}

HUIDIGE BODY (eerste 2000 tekens):
${content.body_markdown?.slice(0, 2000)}

HUIDIGE FAQ ITEMS:
${JSON.stringify(content.faq_items?.slice(0, 5) || [])}

Geef je resultaat als JSON:
{
  "extra_faq_items": [{"question": "...", "answer": "..."}],
  "extra_statistieken": [{"stat": "...", "bron": "...", "jaar": 2025}],
  "extra_bronnen": [{"title": "...", "url": "...", "type": "officieel"}],
  "verbeterde_meta_description": "..." of null,
  "verbeterde_excerpt": "..." of null,
  "extra_body_paragraph": "..." of null,
  "verbeterde_intro": "..." of null
}

Genereer alleen de velden die relevant zijn voor de gevraagde verbeteringen.
Schrijf in het Nederlands. Gebruik concrete cijfers en betrouwbare bronnen.`;

  try {
    const response = await fetch(ANTHROPIC_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": getAnthropicKey(),
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 4096,
        system: buildGeoSystemPrompt(),
        messages: [{ role: "user", content: prompt }],
      }),
    });

    if (!response.ok) {
      throw new Error(`Anthropic API fout: ${response.status}`);
    }

    const data = await response.json();
    const text = data.content
      ?.filter((c: any) => c.type === "text")
      .map((c: any) => c.text)
      .join("") || "";

    // Parse JSON
    let cleaned = text.trim();
    if (cleaned.startsWith("```json")) cleaned = cleaned.slice(7);
    if (cleaned.startsWith("```")) cleaned = cleaned.slice(3);
    if (cleaned.endsWith("```")) cleaned = cleaned.slice(0, -3);
    const optimisaties = JSON.parse(cleaned.trim());

    const tokens = (data.usage?.input_tokens || 0) + (data.usage?.output_tokens || 0);

    // Pas verbeteringen toe
    const updateData: any = { updated_at: new Date().toISOString() };

    // Extra FAQ items
    if (optimisaties.extra_faq_items?.length > 0) {
      updateData.faq_items = [...(content.faq_items || []), ...optimisaties.extra_faq_items];
      changes.push(`${optimisaties.extra_faq_items.length} FAQ items toegevoegd`);
    }

    // Extra statistieken
    if (optimisaties.extra_statistieken?.length > 0) {
      updateData.statistieken = [...(content.statistieken || []), ...optimisaties.extra_statistieken];
      changes.push(`${optimisaties.extra_statistieken.length} statistieken toegevoegd`);
    }

    // Extra bronnen
    if (optimisaties.extra_bronnen?.length > 0) {
      updateData.bronnen = [...(content.bronnen || []), ...optimisaties.extra_bronnen];
      changes.push(`${optimisaties.extra_bronnen.length} bronnen toegevoegd`);
    }

    // Meta description
    if (optimisaties.verbeterde_meta_description) {
      updateData.meta_description = optimisaties.verbeterde_meta_description;
      changes.push("Meta description verbeterd");
    }

    // Excerpt
    if (optimisaties.verbeterde_excerpt) {
      updateData.excerpt = optimisaties.verbeterde_excerpt;
      changes.push("Excerpt verbeterd");
    }

    // Extra body paragraph
    if (optimisaties.extra_body_paragraph) {
      updateData.body_markdown = content.body_markdown + "\n\n" + optimisaties.extra_body_paragraph;
      changes.push("Extra paragraaf toegevoegd");
    }

    // Verbeterde intro
    if (optimisaties.verbeterde_intro && content.body_markdown) {
      const delen = content.body_markdown.split("\n\n");
      delen[0] = optimisaties.verbeterde_intro;
      updateData.body_markdown = delen.join("\n\n");
      changes.push("Introductie verbeterd");
    }

    if (changes.length > 0) {
      // Update content in database
      await supabaseAdmin
        .from("geo_content")
        .update(updateData)
        .eq("id", content.id);

      // Log de optimalisatie
      for (const change of changes) {
        await supabaseAdmin.from("geo_optimalisatie_log").insert({
          geo_content_id: content.id,
          actie: change,
          beschrijving: `Automatische optimalisatie: ${change}`,
          reden: suggesties.map((s) => s.beschrijving).join("; "),
          tokens_gebruikt: Math.round(tokens / changes.length),
        });
      }
    }

    return { updated: changes.length > 0, changes };
  } catch (error) {
    console.error(`[GEO Optimizer] Fout:`, error);
    return { updated: false, changes: [`Fout: ${(error as Error).message}`] };
  }
}

/**
 * Run auto-optimalisatie op alle content die slecht presteert
 */
export async function runAutoOptimization(options?: {
  maxItems?: number;
  minScore?: number;
}): Promise<{ optimized: number; changes: string[]; errors: string[] }> {
  const maxItems = options?.maxItems || 3;
  const minScore = options?.minScore || 60; // Optimaliseer content met score < 60

  const { data: gepubliceerd } = await supabaseAdmin
    .from("geo_content")
    .select("*")
    .eq("status", "gepubliceerd")
    .order("updated_at", { ascending: true })
    .limit(maxItems * 2); // Haal meer op want sommige hoeven geen optimalisatie

  if (!gepubliceerd) return { optimized: 0, changes: [], errors: [] };

  let optimized = 0;
  const allChanges: string[] = [];
  const errors: string[] = [];

  for (const item of gepubliceerd) {
    if (optimized >= maxItems) break;

    try {
      const analyse = await analyseContent(item as GeoContent);

      if (analyse.score < minScore && analyse.suggesties.length > 0) {
        console.log(`[GEO Optimizer] Optimaliseren: ${item.title} (score: ${analyse.score})`);

        const result = await optimizeContent(
          item as GeoContent,
          analyse.suggesties.filter((s) => s.prioriteit === "hoog")
        );

        if (result.updated) {
          optimized++;
          allChanges.push(`${item.title}: ${result.changes.join(", ")}`);
        }

        await new Promise((r) => setTimeout(r, 2000));
      }
    } catch (err) {
      errors.push(`${item.title}: ${(err as Error).message}`);
    }
  }

  return { optimized, changes: allChanges, errors };
}
