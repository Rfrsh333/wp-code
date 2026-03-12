import { chatCompletion, isOpenAIConfigured, type ChatMessage } from "@/lib/openai";

interface LeadData {
  id: string;
  bedrijfsnaam: string;
  branche: string | null;
  stad: string | null;
  pipeline_stage: string;
  ai_score: number | null;
  engagement_score: number | null;
  emails_verzonden_count: number;
  laatste_contact_datum: string | null;
  laatste_contact_type: string | null;
  created_at: string;
  tags: string[] | null;
  enrichment_data: { grootte_indicatie?: string; heeft_vacatures?: boolean } | null;
  contactmomenten_count: number;
  positieve_contacten: number;
  dagen_in_pipeline: number;
  dagen_sinds_contact: number | null;
}

export interface PredictionResult {
  conversion_pct: number;
  deal_value: number;
  close_days: number;
  churn_risk: "laag" | "midden" | "hoog" | "kritiek";
  best_channel: string;
  best_time: string;
  reasoning: string;
  signals: { type: "positief" | "negatief" | "neutraal"; text: string }[];
  recommended_actions: string[];
}

export interface PipelineForecast {
  verwachte_omzet_30d: number;
  verwachte_omzet_90d: number;
  verwachte_conversies_30d: number;
  pipeline_gezondheid: "uitstekend" | "goed" | "matig" | "slecht";
  bottlenecks: string[];
  kansen: string[];
  per_stage: { stage: string; count: number; avg_conversion: number; avg_value: number }[];
}

// Branche-specifieke contract waarden
const BRANCHE_VALUES: Record<string, number> = {
  restaurant: 3500,
  cafe: 2500,
  bar: 2000,
  hotel: 5000,
  catering: 4000,
  evenementen: 3000,
  fastfood: 2000,
  bezorging: 1500,
  default: 3000,
};

// Stage conversie benchmarks (historisch gemiddelde)
const STAGE_CONVERSION: Record<string, number> = {
  nieuw: 8,
  benaderd: 15,
  interesse: 35,
  offerte: 60,
  klant: 100,
  afgewezen: 0,
};

// Rule-based scoring factors
function calculateRuleBasedPrediction(lead: LeadData): PredictionResult {
  const signals: PredictionResult["signals"] = [];
  let conversionScore = STAGE_CONVERSION[lead.pipeline_stage] || 10;

  // AI Score factor
  if (lead.ai_score) {
    if (lead.ai_score >= 80) {
      conversionScore += 15;
      signals.push({ type: "positief", text: `Hoge AI score (${lead.ai_score})` });
    } else if (lead.ai_score >= 60) {
      conversionScore += 5;
    } else if (lead.ai_score < 40) {
      conversionScore -= 10;
      signals.push({ type: "negatief", text: `Lage AI score (${lead.ai_score})` });
    }
  }

  // Engagement factor
  if (lead.engagement_score) {
    if (lead.engagement_score >= 50) {
      conversionScore += 20;
      signals.push({ type: "positief", text: `Hoge engagement (${lead.engagement_score})` });
    } else if (lead.engagement_score >= 20) {
      conversionScore += 8;
    } else if (lead.engagement_score < 0) {
      conversionScore -= 15;
      signals.push({ type: "negatief", text: "Negatieve engagement" });
    }
  }

  // Contact responsiviteit
  if (lead.positieve_contacten > 0) {
    const responsRate = lead.positieve_contacten / Math.max(lead.contactmomenten_count, 1);
    if (responsRate >= 0.5) {
      conversionScore += 12;
      signals.push({ type: "positief", text: `Goede responsrate (${Math.round(responsRate * 100)}%)` });
    }
  }

  // Recency factor
  if (lead.dagen_sinds_contact !== null) {
    if (lead.dagen_sinds_contact <= 3) {
      conversionScore += 10;
      signals.push({ type: "positief", text: "Recent contact (< 3 dagen)" });
    } else if (lead.dagen_sinds_contact > 14) {
      conversionScore -= 10;
      signals.push({ type: "negatief", text: `Lang geen contact (${lead.dagen_sinds_contact} dagen)` });
    } else if (lead.dagen_sinds_contact > 30) {
      conversionScore -= 20;
      signals.push({ type: "negatief", text: "Meer dan 30 dagen geen contact" });
    }
  }

  // Pipeline velocity
  if (lead.dagen_in_pipeline > 60 && lead.pipeline_stage !== "klant") {
    conversionScore -= 15;
    signals.push({ type: "negatief", text: `Lang in pipeline (${lead.dagen_in_pipeline} dagen)` });
  } else if (lead.dagen_in_pipeline < 14 && lead.pipeline_stage === "interesse") {
    conversionScore += 10;
    signals.push({ type: "positief", text: "Snelle progressie naar interesse" });
  }

  // Enrichment signals
  if (lead.enrichment_data?.heeft_vacatures) {
    conversionScore += 10;
    signals.push({ type: "positief", text: "Heeft actieve vacatures" });
  }
  if (lead.enrichment_data?.grootte_indicatie === "groot" || lead.enrichment_data?.grootte_indicatie === "keten") {
    conversionScore += 5;
    signals.push({ type: "positief", text: "Groter bedrijf (meer potentieel)" });
  }

  // Email engagement
  if (lead.emails_verzonden_count > 3 && lead.engagement_score !== null && lead.engagement_score < 5) {
    conversionScore -= 10;
    signals.push({ type: "negatief", text: "Meerdere emails zonder engagement" });
  }

  // Clamp
  const conversion_pct = Math.max(1, Math.min(95, conversionScore));

  // Deal value
  const brancheKey = (lead.branche || "").toLowerCase();
  const baseValue = BRANCHE_VALUES[brancheKey] || BRANCHE_VALUES.default;
  const sizeMultiplier = lead.enrichment_data?.grootte_indicatie === "groot" ? 1.8
    : lead.enrichment_data?.grootte_indicatie === "keten" ? 2.5
    : lead.enrichment_data?.grootte_indicatie === "klein" ? 0.7
    : 1.0;
  const deal_value = Math.round(baseValue * sizeMultiplier);

  // Close days estimate
  const stageToClose: Record<string, number> = {
    nieuw: 45, benaderd: 35, interesse: 21, offerte: 10, klant: 0, afgewezen: 999,
  };
  const baseDays = stageToClose[lead.pipeline_stage] || 30;
  const velocityFactor = lead.dagen_in_pipeline > 30 ? 1.5 : lead.dagen_in_pipeline < 7 ? 0.7 : 1.0;
  const close_days = Math.round(baseDays * velocityFactor);

  // Churn risk
  let churn_risk: PredictionResult["churn_risk"] = "laag";
  if (lead.dagen_sinds_contact !== null && lead.dagen_sinds_contact > 30) churn_risk = "kritiek";
  else if (lead.dagen_sinds_contact !== null && lead.dagen_sinds_contact > 14) churn_risk = "hoog";
  else if (lead.engagement_score !== null && lead.engagement_score < 0) churn_risk = "hoog";
  else if (lead.dagen_in_pipeline > 45) churn_risk = "midden";
  else if (lead.emails_verzonden_count > 2 && lead.positieve_contacten === 0) churn_risk = "midden";

  // Best channel
  const bestChannels: Record<string, string> = {
    restaurant: "whatsapp", cafe: "whatsapp", bar: "whatsapp",
    hotel: "email", catering: "email", evenementen: "telefoon",
  };
  const best_channel = lead.engagement_score && lead.engagement_score >= 30
    ? "telefoon"
    : bestChannels[brancheKey] || "email";

  // Best time
  const bestTimes: Record<string, string> = {
    restaurant: "14:00-16:00 (voor de service)",
    cafe: "10:00-11:30 (rustig moment)",
    hotel: "10:00-12:00 (na checkout rush)",
    catering: "09:00-11:00 (kantooruren)",
    evenementen: "09:00-12:00",
  };
  const best_time = bestTimes[brancheKey] || "10:00-12:00";

  // Recommended actions
  const recommended_actions: string[] = [];
  if (churn_risk === "kritiek" || churn_risk === "hoog") {
    recommended_actions.push("Neem vandaag nog contact op om de lead te behouden");
  }
  if (lead.pipeline_stage === "interesse" && conversion_pct >= 40) {
    recommended_actions.push("Stuur een offerte — hoge kans op conversie");
  }
  if (lead.enrichment_data?.heeft_vacatures) {
    recommended_actions.push("Refereer aan hun vacatures als opening");
  }
  if (lead.engagement_score && lead.engagement_score >= 50) {
    recommended_actions.push("HOT lead — bel direct voor persoonlijk gesprek");
  }
  if (lead.emails_verzonden_count === 0) {
    recommended_actions.push("Stuur eerste introductie email");
  }
  if (recommended_actions.length === 0) {
    recommended_actions.push("Volg standaard sequence op");
  }

  return {
    conversion_pct,
    deal_value,
    close_days,
    churn_risk,
    best_channel,
    best_time,
    reasoning: `Conversie kans ${conversion_pct}% op basis van stage (${lead.pipeline_stage}), engagement en contacthistorie.`,
    signals,
    recommended_actions,
  };
}

export async function predictLead(lead: LeadData): Promise<PredictionResult> {
  // Start met rule-based
  const ruleBased = calculateRuleBasedPrediction(lead);

  // Enrich met AI als beschikbaar
  if (!isOpenAIConfigured()) return ruleBased;

  try {
    const messages: ChatMessage[] = [
      {
        role: "system",
        content: `Je bent een sales predictive AI voor TopTalent Jobs (horeca uitzendbureau).
Je krijgt lead data en een rule-based voorspelling. Verfijn deze met je expertise.

Antwoord ALLEEN met valid JSON:
{
  "conversion_pct": 65,
  "deal_value_adjusted": false,
  "churn_risk": "laag|midden|hoog|kritiek",
  "extra_signals": [{"type": "positief|negatief|neutraal", "text": "inzicht"}],
  "extra_actions": ["actie"],
  "reasoning": "korte uitleg van je aanpassing (1-2 zinnen)"
}`
      },
      {
        role: "user",
        content: `Lead: ${lead.bedrijfsnaam} (${lead.branche || "onbekend"}, ${lead.stad || "onbekend"})
Stage: ${lead.pipeline_stage}
AI Score: ${lead.ai_score || "n/a"}
Engagement: ${lead.engagement_score || 0}
Contact momenten: ${lead.contactmomenten_count} (${lead.positieve_contacten} positief)
Dagen in pipeline: ${lead.dagen_in_pipeline}
Dagen sinds contact: ${lead.dagen_sinds_contact ?? "nooit"}
Emails verzonden: ${lead.emails_verzonden_count}
Heeft vacatures: ${lead.enrichment_data?.heeft_vacatures ?? "onbekend"}
Grootte: ${lead.enrichment_data?.grootte_indicatie ?? "onbekend"}
Tags: ${lead.tags?.join(", ") || "geen"}

Rule-based voorspelling:
- Conversie: ${ruleBased.conversion_pct}%
- Deal waarde: €${ruleBased.deal_value}
- Close in: ${ruleBased.close_days} dagen
- Churn risk: ${ruleBased.churn_risk}
- Signalen: ${ruleBased.signals.map((s) => `${s.type}: ${s.text}`).join("; ")}`
      }
    ];

    const response = await chatCompletion(messages, { temperature: 0.3, maxTokens: 400 });
    const cleaned = response.replace(/```json\n?|\n?```/g, "").trim();
    const aiResult = JSON.parse(cleaned);

    // Merge AI adjustments
    return {
      ...ruleBased,
      conversion_pct: Math.max(1, Math.min(95, aiResult.conversion_pct ?? ruleBased.conversion_pct)),
      churn_risk: aiResult.churn_risk || ruleBased.churn_risk,
      signals: [
        ...ruleBased.signals,
        ...(aiResult.extra_signals || []),
      ],
      recommended_actions: [
        ...ruleBased.recommended_actions,
        ...(aiResult.extra_actions || []),
      ],
      reasoning: aiResult.reasoning || ruleBased.reasoning,
    };
  } catch {
    return ruleBased;
  }
}

export async function forecastPipeline(leads: LeadData[]): Promise<PipelineForecast> {
  const activeLeads = leads.filter((l) => l.pipeline_stage !== "klant" && l.pipeline_stage !== "afgewezen");

  // Per stage aggregatie
  const stages = ["nieuw", "benaderd", "interesse", "offerte"];
  const perStage = stages.map((stage) => {
    const stageLeads = activeLeads.filter((l) => l.pipeline_stage === stage);
    const avgConversion = stageLeads.length > 0
      ? Math.round(stageLeads.reduce((sum, l) => {
          const pred = calculateRuleBasedPrediction(l);
          return sum + pred.conversion_pct;
        }, 0) / stageLeads.length)
      : STAGE_CONVERSION[stage] || 0;

    const brancheKey = (stageLeads[0]?.branche || "").toLowerCase();
    const avgValue = BRANCHE_VALUES[brancheKey] || BRANCHE_VALUES.default;

    return { stage, count: stageLeads.length, avg_conversion: avgConversion, avg_value: avgValue };
  });

  // Verwachte omzet
  let omzet30d = 0;
  let omzet90d = 0;
  let conversies30d = 0;

  for (const lead of activeLeads) {
    const pred = calculateRuleBasedPrediction(lead);
    const weightedValue = pred.deal_value * (pred.conversion_pct / 100);

    if (pred.close_days <= 30) {
      omzet30d += weightedValue;
      if (pred.conversion_pct >= 50) conversies30d++;
    }
    if (pred.close_days <= 90) {
      omzet90d += weightedValue;
    }
  }

  // Bottlenecks
  const bottlenecks: string[] = [];
  const kansen: string[] = [];

  const nieuwCount = perStage.find((s) => s.stage === "nieuw")?.count || 0;
  const interesseCount = perStage.find((s) => s.stage === "interesse")?.count || 0;
  const offerteCount = perStage.find((s) => s.stage === "offerte")?.count || 0;

  if (nieuwCount > 20 && interesseCount < 5) {
    bottlenecks.push("Veel nieuwe leads maar weinig interesse — verbeter eerste benadering");
  }
  if (interesseCount > 10 && offerteCount < 3) {
    bottlenecks.push("Leads stagneren in interesse fase — stuur meer offertes");
  }

  const highChurn = activeLeads.filter((l) => {
    const pred = calculateRuleBasedPrediction(l);
    return pred.churn_risk === "kritiek" || pred.churn_risk === "hoog";
  });
  if (highChurn.length > 5) {
    bottlenecks.push(`${highChurn.length} leads met hoog churn risico — urgente opvolging nodig`);
  }

  const hotLeads = activeLeads.filter((l) => (l.engagement_score || 0) >= 50);
  if (hotLeads.length > 0) {
    kansen.push(`${hotLeads.length} HOT leads met hoge engagement — prioriteit bellen`);
  }

  const vacatureLeads = activeLeads.filter((l) => l.enrichment_data?.heeft_vacatures);
  if (vacatureLeads.length > 0) {
    kansen.push(`${vacatureLeads.length} leads met actieve vacatures — directe behoefte`);
  }

  if (offerteCount > 0) {
    kansen.push(`${offerteCount} leads in offerte fase — dicht bij conversie`);
  }

  // Pipeline gezondheid
  let gezondheid: PipelineForecast["pipeline_gezondheid"] = "goed";
  if (activeLeads.length < 10) gezondheid = "slecht";
  else if (bottlenecks.length >= 3) gezondheid = "slecht";
  else if (bottlenecks.length >= 2) gezondheid = "matig";
  else if (kansen.length >= 2 && bottlenecks.length === 0) gezondheid = "uitstekend";

  return {
    verwachte_omzet_30d: Math.round(omzet30d),
    verwachte_omzet_90d: Math.round(omzet90d),
    verwachte_conversies_30d: conversies30d,
    pipeline_gezondheid: gezondheid,
    bottlenecks,
    kansen,
    per_stage: perStage,
  };
}

export async function predictBatch(leads: LeadData[]): Promise<Map<string, PredictionResult>> {
  const results = new Map<string, PredictionResult>();
  for (const lead of leads) {
    results.set(lead.id, calculateRuleBasedPrediction(lead));
  }
  return results;
}
