import "server-only";

/**
 * GEO Agent Module 3: Auto-Optimizer
 *
 * Analyseer bestaande content en genereer verbeteringen
 * wanneer de kwaliteitsscore onder de drempel valt.
 *
 * Scoring-model conform Master Prompt v1.0 (100 punten, 10 criteria).
 * Optimalisatie-drempel: 60/100.
 */

import { supabaseAdmin } from "@/lib/supabase";
import type { GeoContent } from "./types";
import { buildGeoSystemPrompt } from "./prompts";

const ANTHROPIC_API_URL = "https://api.anthropic.com/v1/messages";
const MODEL = "claude-sonnet-4-20250514";

function getAnthropicKey(): string {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) throw new Error("ANTHROPIC_API_KEY is niet geconfigureerd — agent kan niet starten");
  return key.trim();
}

interface ScoreCriterium {
  naam: string;
  maxPunten: number;
  score: number;
  details: string;
}

interface OptimisatieSuggestie {
  actie: string;
  veld: string;
  beschrijving: string;
  prioriteit: "hoog" | "middel" | "laag";
}

interface ContentAnalyse {
  score: number;
  criteria: ScoreCriterium[];
  sterke_punten: string[];
  verbeterpunten: string[];
  suggesties: OptimisatieSuggestie[];
}

/**
 * Scoring-model (100 punten totaal) — conform Master Prompt
 *
 * Criterium              | Max | Vereiste
 * -----------------------|-----|-------------------------------------------
 * Intro lengte           | 10  | ≥150 woorden = 10, 100-149 = 5, <100 = 0
 * Aantal FAQ's           | 15  | ≥8 = 15, 5-7 = 10, 3-4 = 5, <3 = 0
 * FAQ antwoord-lengte    | 10  | Gem. ≥100 woorden = 10, 60-99 = 5, <60 = 0
 * Statistieken           | 15  | ≥5 met bron = 15, 3-4 = 10, 1-2 = 5, 0 = 0
 * Bronvermeldingen       | 10  | ≥3 betrouwbaar = 10, 1-2 = 5, 0 = 0
 * Brand mentions         | 10  | ≥3 "TopTalent" citeerbaar = 10
 * Structured data hints  | 10  | FAQ-schema + LocalBusiness = 10, één = 5
 * Interne links          | 10  | ≥4 relevante links = 10, 2-3 = 5
 * CTA aanwezigheid       |  5  | Duidelijke CTA = 5
 * Lokale relevantie      |  5  | Specifieke lokale referenties = 5
 */
export async function analyseContent(content: GeoContent): Promise<ContentAnalyse> {
  const criteria: ScoreCriterium[] = [];
  const suggesties: OptimisatieSuggestie[] = [];
  const sterkePunten: string[] = [];
  const verbeterPunten: string[] = [];

  const body = content.body_markdown || "";
  const bodyLower = body.toLowerCase();

  // 1. Intro lengte (10 pt)
  const eersteAlinea = body.split("\n\n")[0] || "";
  const introWoorden = eersteAlinea.split(/\s+/).filter(Boolean).length;
  let introScore = 0;
  if (introWoorden >= 150) introScore = 10;
  else if (introWoorden >= 100) introScore = 5;

  criteria.push({ naam: "Intro lengte", maxPunten: 10, score: introScore, details: `${introWoorden} woorden` });

  if (introScore < 10) {
    suggesties.push({ actie: "intro_verbeteren", veld: "body_markdown", beschrijving: `Intro is ${introWoorden} woorden. Minimaal 150 vereist voor optimale AI-citatie.`, prioriteit: introScore === 0 ? "hoog" : "middel" });
    verbeterPunten.push(`Intro te kort (${introWoorden} woorden)`);
  } else {
    sterkePunten.push("Stevige intro (≥150 woorden)");
  }

  // 2. Aantal FAQ's (15 pt)
  const faqCount = content.faq_items?.length || 0;
  let faqScore = 0;
  if (faqCount >= 8) faqScore = 15;
  else if (faqCount >= 5) faqScore = 10;
  else if (faqCount >= 3) faqScore = 5;

  criteria.push({ naam: "Aantal FAQs", maxPunten: 15, score: faqScore, details: `${faqCount} FAQ's` });

  if (faqScore < 15) {
    suggesties.push({ actie: "faq_toevoegen", veld: "faq_items", beschrijving: `${faqCount} FAQ's aanwezig. Minimaal 8 vereist.`, prioriteit: faqCount < 3 ? "hoog" : "middel" });
    verbeterPunten.push(`Te weinig FAQ's (${faqCount})`);
  } else {
    sterkePunten.push(`${faqCount} FAQ's (uitstekend)`);
  }

  // 3. FAQ antwoord-lengte (10 pt)
  const faqAntwoorden = content.faq_items?.map((f) => f.answer.split(/\s+/).length) || [];
  const gemFaqLengte = faqAntwoorden.length > 0 ? faqAntwoorden.reduce((a, b) => a + b, 0) / faqAntwoorden.length : 0;
  let faqLengteScore = 0;
  if (gemFaqLengte >= 100) faqLengteScore = 10;
  else if (gemFaqLengte >= 60) faqLengteScore = 5;

  criteria.push({ naam: "FAQ antwoord-lengte", maxPunten: 10, score: faqLengteScore, details: `Gem. ${Math.round(gemFaqLengte)} woorden` });

  if (faqLengteScore < 10 && faqCount > 0) {
    suggesties.push({ actie: "faq_antwoorden_verlengen", veld: "faq_items", beschrijving: `Gemiddelde FAQ-antwoord is ${Math.round(gemFaqLengte)} woorden. Minimaal 100 aanbevolen.`, prioriteit: "middel" });
    verbeterPunten.push(`FAQ antwoorden te kort (gem. ${Math.round(gemFaqLengte)} woorden)`);
  } else if (faqCount > 0) {
    sterkePunten.push(`FAQ antwoorden goed (gem. ${Math.round(gemFaqLengte)} woorden)`);
  }

  // 4. Statistieken (15 pt)
  const statsCount = content.statistieken?.length || 0;
  let statsScore = 0;
  if (statsCount >= 5) statsScore = 15;
  else if (statsCount >= 3) statsScore = 10;
  else if (statsCount >= 1) statsScore = 5;

  criteria.push({ naam: "Statistieken", maxPunten: 15, score: statsScore, details: `${statsCount} statistieken` });

  if (statsScore < 15) {
    suggesties.push({ actie: "stats_toevoegen", veld: "statistieken", beschrijving: `${statsCount} statistieken. Minimaal 5 met bronvermelding vereist.`, prioriteit: statsCount < 3 ? "hoog" : "middel" });
    verbeterPunten.push(`Te weinig statistieken (${statsCount})`);
  } else {
    sterkePunten.push(`${statsCount} statistieken met bron`);
  }

  // 5. Bronvermeldingen (10 pt)
  const bronCount = content.bronnen?.length || 0;
  let bronScore = 0;
  if (bronCount >= 3) bronScore = 10;
  else if (bronCount >= 1) bronScore = 5;

  criteria.push({ naam: "Bronvermeldingen", maxPunten: 10, score: bronScore, details: `${bronCount} bronnen` });

  if (bronScore < 10) {
    suggesties.push({ actie: "bronnen_toevoegen", veld: "bronnen", beschrijving: `${bronCount} bronnen. Minimaal 3 betrouwbare bronnen vereist (CBS, KHN, UWV).`, prioriteit: "middel" });
    verbeterPunten.push(`Te weinig bronnen (${bronCount})`);
  } else {
    sterkePunten.push(`${bronCount} betrouwbare bronnen`);
  }

  // 6. Brand mentions (10 pt)
  const brandRegex = /toptalent\s*jobs|volgens\s+toptalent|toptalent,?\s+specialist/gi;
  const brandMatches = bodyLower.match(brandRegex) || [];
  const brandCount = brandMatches.length;
  let brandScore = 0;
  if (brandCount >= 3) brandScore = 10;
  else if (brandCount >= 1) brandScore = 5;

  criteria.push({ naam: "Brand mentions", maxPunten: 10, score: brandScore, details: `${brandCount} citeerbare mentions` });

  if (brandScore < 10) {
    suggesties.push({ actie: "brand_mentions_toevoegen", veld: "body_markdown", beschrijving: `${brandCount} brand mentions. Minimaal 3 "TopTalent" mentions in citeerbare context vereist.`, prioriteit: "hoog" });
    verbeterPunten.push(`Te weinig brand mentions (${brandCount})`);
  } else {
    sterkePunten.push(`${brandCount} citeerbare brand mentions`);
  }

  // 7. Structured data hints (10 pt)
  const sd = content.structured_data || [];
  const hasFaq = sd.some((s: any) => s?.["@type"] === "FAQPage");
  const hasLocal = sd.some((s: any) => s?.["@type"] === "LocalBusiness" || s?.["@type"] === "EmploymentAgency");
  let sdScore = 0;
  if (hasFaq && hasLocal) sdScore = 10;
  else if (hasFaq || hasLocal) sdScore = 5;

  criteria.push({ naam: "Structured data", maxPunten: 10, score: sdScore, details: `FAQ: ${hasFaq ? "ja" : "nee"}, LocalBusiness: ${hasLocal ? "ja" : "nee"}` });

  if (sdScore < 10) {
    suggesties.push({ actie: "structured_data_toevoegen", veld: "structured_data", beschrijving: `Ontbrekend: ${!hasFaq ? "FAQPage schema" : ""} ${!hasLocal ? "LocalBusiness schema" : ""}`.trim(), prioriteit: "middel" });
    verbeterPunten.push("Onvolledige structured data");
  } else {
    sterkePunten.push("Volledige structured data");
  }

  // 8. Interne links (10 pt)
  const linkRegex = /\[.*?\]\(.*?toptalentjobs\.nl.*?\)|href=["'].*?toptalentjobs\.nl.*?["']/gi;
  const internalLinks = body.match(linkRegex) || [];
  const linkCount = internalLinks.length;
  let linkScore = 0;
  if (linkCount >= 4) linkScore = 10;
  else if (linkCount >= 2) linkScore = 5;

  criteria.push({ naam: "Interne links", maxPunten: 10, score: linkScore, details: `${linkCount} interne links` });

  if (linkScore < 10) {
    suggesties.push({ actie: "links_toevoegen", veld: "body_markdown", beschrijving: `${linkCount} interne links. Minimaal 4 relevante interne links vereist.`, prioriteit: "laag" });
    verbeterPunten.push(`Te weinig interne links (${linkCount})`);
  } else {
    sterkePunten.push(`${linkCount} interne links`);
  }

  // 9. CTA aanwezigheid (5 pt)
  const ctaPatterns = /neem contact|aanvragen|inschrijven|bel ons|offerte|meld je aan|bekijk vacatures/gi;
  const hasCta = ctaPatterns.test(bodyLower);
  const ctaScore = hasCta ? 5 : 0;

  criteria.push({ naam: "CTA aanwezigheid", maxPunten: 5, score: ctaScore, details: hasCta ? "CTA aanwezig" : "Geen CTA" });

  if (!hasCta) {
    suggesties.push({ actie: "cta_toevoegen", veld: "body_markdown", beschrijving: "Geen duidelijke CTA gevonden. Voeg een call-to-action toe.", prioriteit: "middel" });
    verbeterPunten.push("Geen CTA");
  } else {
    sterkePunten.push("CTA aanwezig");
  }

  // 10. Lokale relevantie (5 pt)
  const stadNaam = content.stad === "den-haag" ? "den haag" : content.stad;
  const hasLokaal = bodyLower.includes(stadNaam) && (
    bodyLower.includes("buurt") || bodyLower.includes("wijk") || bodyLower.includes("centrum") ||
    bodyLower.includes("haven") || bodyLower.includes("gracht") || bodyLower.includes("plein") ||
    bodyLower.includes("station") || bodyLower.includes("festival") || bodyLower.includes("evenement")
  );
  const lokaalScore = hasLokaal ? 5 : 0;

  criteria.push({ naam: "Lokale relevantie", maxPunten: 5, score: lokaalScore, details: hasLokaal ? "Lokale referenties aanwezig" : "Geen specifieke lokale referenties" });

  if (!hasLokaal) {
    suggesties.push({ actie: "lokale_details_toevoegen", veld: "body_markdown", beschrijving: "Geen specifieke lokale referenties (buurten, gebieden, evenementen). Voeg lokale context toe.", prioriteit: "laag" });
    verbeterPunten.push("Geen lokale referenties");
  } else {
    sterkePunten.push("Lokale relevantie aanwezig");
  }

  // Totaal score
  const totaalScore = criteria.reduce((sum, c) => sum + c.score, 0);

  return {
    score: totaalScore,
    criteria,
    sterke_punten: sterkePunten,
    verbeterpunten: verbeterPunten,
    suggesties: suggesties.sort((a, b) => {
      const prio = { hoog: 0, middel: 1, laag: 2 };
      return prio[a.prioriteit] - prio[b.prioriteit];
    }),
  };
}

/**
 * Voer automatische optimalisatie uit op content
 * Bij score < 60: identificeer zwakste criteria en genereer verbeteringen
 */
export async function optimizeContent(
  content: GeoContent,
  suggesties?: OptimisatieSuggestie[]
): Promise<{ updated: boolean; changes: string[]; newScore?: number }> {
  if (!suggesties) {
    const analyse = await analyseContent(content);
    suggesties = analyse.suggesties.filter((s) => s.prioriteit === "hoog" || s.prioriteit === "middel");
  }

  if (suggesties.length === 0) {
    return { updated: false, changes: [] };
  }

  const stadNaam = content.stad === "den-haag"
    ? "Den Haag"
    : content.stad.charAt(0).toUpperCase() + content.stad.slice(1);

  const acties = suggesties.map((s) => `- ${s.actie}: ${s.beschrijving}`).join("\n");

  const prompt = `Je bent de GEO Auto-Optimizer voor TopTalent Jobs. Verbeter de volgende content.

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

REGELS:
- Lever verbeteringen als toevoegingen/vervangingen, NIET als complete herschrijving
- Schrijf in het Nederlands, professioneel maar toegankelijk
- Gebruik "Volgens TopTalent Jobs..." of "TopTalent Jobs, specialist in horeca uitzendwerk, ..." in nieuwe passages
- Statistieken altijd met bronvermelding (CBS, KHN, UWV)
- Markeer schattingen expliciet als "schatting"
- FAQ antwoorden: 80-200 woorden per antwoord

Geef je resultaat als JSON:
{
  "extra_faq_items": [{"question": "...", "answer": "..."}],
  "extra_statistieken": [{"stat": "...", "bron": "...", "jaar": 2025}],
  "extra_bronnen": [{"title": "...", "url": "...", "type": "officieel"}],
  "verbeterde_meta_description": "..." of null,
  "verbeterde_excerpt": "..." of null,
  "extra_body_paragraph": "..." of null,
  "verbeterde_intro": "..." of null
}`;

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

    if (!response.ok) throw new Error(`Anthropic API fout: ${response.status}`);

    const data = await response.json();
    const text = data.content?.filter((c: any) => c.type === "text").map((c: any) => c.text).join("") || "";
    const tokens = (data.usage?.input_tokens || 0) + (data.usage?.output_tokens || 0);

    // Parse JSON
    let cleaned = text.trim();
    if (cleaned.startsWith("```json")) cleaned = cleaned.slice(7);
    if (cleaned.startsWith("```")) cleaned = cleaned.slice(3);
    if (cleaned.endsWith("```")) cleaned = cleaned.slice(0, -3);
    const optimisaties = JSON.parse(cleaned.trim());

    const changes: string[] = [];
    const updateData: any = { updated_at: new Date().toISOString() };

    if (optimisaties.extra_faq_items?.length > 0) {
      updateData.faq_items = [...(content.faq_items || []), ...optimisaties.extra_faq_items];
      changes.push(`${optimisaties.extra_faq_items.length} FAQ items toegevoegd`);
    }

    if (optimisaties.extra_statistieken?.length > 0) {
      updateData.statistieken = [...(content.statistieken || []), ...optimisaties.extra_statistieken];
      changes.push(`${optimisaties.extra_statistieken.length} statistieken toegevoegd`);
    }

    if (optimisaties.extra_bronnen?.length > 0) {
      updateData.bronnen = [...(content.bronnen || []), ...optimisaties.extra_bronnen];
      changes.push(`${optimisaties.extra_bronnen.length} bronnen toegevoegd`);
    }

    if (optimisaties.verbeterde_meta_description) {
      updateData.meta_description = optimisaties.verbeterde_meta_description;
      changes.push("Meta description verbeterd");
    }

    if (optimisaties.verbeterde_excerpt) {
      updateData.excerpt = optimisaties.verbeterde_excerpt;
      changes.push("Excerpt verbeterd");
    }

    if (optimisaties.extra_body_paragraph) {
      updateData.body_markdown = content.body_markdown + "\n\n" + optimisaties.extra_body_paragraph;
      changes.push("Extra paragraaf toegevoegd");
    }

    if (optimisaties.verbeterde_intro && content.body_markdown) {
      const delen = content.body_markdown.split("\n\n");
      delen[0] = optimisaties.verbeterde_intro;
      updateData.body_markdown = delen.join("\n\n");
      changes.push("Introductie verbeterd");
    }

    if (changes.length > 0) {
      await supabaseAdmin.from("geo_content").update(updateData).eq("id", content.id);

      for (const change of changes) {
        await supabaseAdmin.from("geo_optimalisatie_log").insert({
          geo_content_id: content.id,
          actie: change,
          beschrijving: `Automatische optimalisatie: ${change}`,
          reden: suggesties.map((s) => s.beschrijving).join("; "),
          tokens_gebruikt: Math.round(tokens / changes.length),
        });
      }

      // Herbereken score na verbeteringen
      const updatedContent = { ...content, ...updateData };
      const newAnalyse = await analyseContent(updatedContent as GeoContent);

      return { updated: true, changes, newScore: newAnalyse.score };
    }

    return { updated: false, changes: [] };
  } catch (error) {
    console.error(`[GEO Optimizer] Fout:`, error);
    return { updated: false, changes: [`Fout: ${(error as Error).message}`] };
  }
}

/**
 * Run auto-optimalisatie op content met score < 60
 */
export async function runAutoOptimization(options?: {
  maxItems?: number;
  minScore?: number;
}): Promise<{ optimized: number; changes: string[]; errors: string[] }> {
  const maxItems = options?.maxItems || 3;
  const minScore = options?.minScore || 60;

  const { data: gepubliceerd } = await supabaseAdmin
    .from("geo_content")
    .select("*")
    .eq("status", "gepubliceerd")
    .order("updated_at", { ascending: true })
    .limit(maxItems * 2);

  if (!gepubliceerd) return { optimized: 0, changes: [], errors: [] };

  let optimized = 0;
  const allChanges: string[] = [];
  const errors: string[] = [];

  for (const item of gepubliceerd) {
    if (optimized >= maxItems) break;

    try {
      const analyse = await analyseContent(item as GeoContent);

      if (analyse.score < minScore && analyse.suggesties.length > 0) {
        console.log(`[GEO Optimizer] Score ${analyse.score}/100 — optimaliseren: ${item.title}`);

        const result = await optimizeContent(
          item as GeoContent,
          analyse.suggesties.filter((s) => s.prioriteit === "hoog" || s.prioriteit === "middel")
        );

        if (result.updated) {
          optimized++;
          allChanges.push(`${item.title} (${analyse.score}→${result.newScore || "?"}): ${result.changes.join(", ")}`);
          console.log(`[GEO Optimizer] ✅ ${item.title}: score ${analyse.score} → ${result.newScore || "herberekend"}`);
        }

        await new Promise((r) => setTimeout(r, 2000));
      } else {
        console.log(`[GEO Optimizer] Score ${analyse.score}/100 — OK: ${item.title}`);
      }
    } catch (err) {
      errors.push(`${item.title}: ${(err as Error).message}`);
    }
  }

  return { optimized, changes: allChanges, errors };
}
