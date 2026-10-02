/**
 * Normalisatie van de AI-analyse van publieke FAQ-vragen (tickets).
 *
 * `tickets.ai_priority` heeft een CHECK (high|medium|low) en `ai_category` is
 * VARCHAR(100). Het model geeft soms "High", "hoog" of een te lange categorie
 * terug; de update faalde dan stil en het ticket bleef zonder analyse (en
 * zonder spam-markering). Hier wordt de uitvoer naar geldige waarden gebracht.
 */

export const AI_PRIORITEITEN = ["high", "medium", "low"] as const;
export type AiPrioriteit = (typeof AI_PRIORITEITEN)[number];

/** Standaardwaarde bij onbekende uitvoer: niet negeren, maar ook geen valse "high"-melding. */
export const STANDAARD_AI_PRIORITEIT: AiPrioriteit = "medium";

const SYNONIEMEN: Record<string, AiPrioriteit> = {
  high: "high",
  hoog: "high",
  urgent: "high",
  medium: "medium",
  middel: "medium",
  gemiddeld: "medium",
  normaal: "medium",
  low: "low",
  laag: "low",
};

export function normaliseerAiPrioriteit(waarde: unknown): AiPrioriteit {
  if (typeof waarde !== "string") return STANDAARD_AI_PRIORITEIT;
  return SYNONIEMEN[waarde.trim().toLowerCase()] ?? STANDAARD_AI_PRIORITEIT;
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export interface GenormaliseerdeAnalyse {
  priority: AiPrioriteit;
  category: string | null;
  is_spam: boolean;
  similar_existing_question: string | null;
  reasoning: string | null;
}

/** Maakt van willekeurige model-JSON een analyse die de tabel accepteert. */
export function normaliseerTicketAnalyse(ruw: unknown): GenormaliseerdeAnalyse {
  const r = (ruw && typeof ruw === "object" ? ruw : {}) as Record<string, unknown>;
  const tekst = (v: unknown, max: number) =>
    typeof v === "string" && v.trim() ? v.trim().slice(0, max) : null;
  const similar = tekst(r.similar_existing_question, 64);

  return {
    priority: normaliseerAiPrioriteit(r.priority),
    category: tekst(r.category, 100),
    is_spam: r.is_spam === true || r.is_spam === "true",
    similar_existing_question: similar && UUID_RE.test(similar) ? similar : null,
    reasoning: tekst(r.reasoning, 2000),
  };
}
