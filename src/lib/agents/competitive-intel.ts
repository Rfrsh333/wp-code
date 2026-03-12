import { chatCompletion, isOpenAIConfigured, type ChatMessage } from "@/lib/openai";

interface Concurrent {
  id: string;
  naam: string;
  website: string | null;
  type: string;
  regios: string[];
  branches: string[];
  sterke_punten: string[];
  zwakke_punten: string[];
  prijsindicatie: string | null;
  usps: string | null;
  actief?: boolean;
}

interface LeadContext {
  bedrijfsnaam: string;
  branche: string | null;
  stad: string | null;
  grootte?: string | null;
  pain_points?: string[] | null;
  concurrent_info?: { concurrenten?: string[]; notities?: string } | null;
}

export interface BattleCard {
  elevator_pitch: string;
  differentiators: string[];
  objection_handling: { bezwaar: string; antwoord: string }[];
  prijsstrategie: string;
  win_themes: string[];
  vermijd: string[];
}

export interface CompetitiveAnalysis {
  waarschijnlijke_concurrenten: string[];
  onze_positie: string;
  win_kans: number;
  strategie: string;
  key_differentiators: string[];
  prijs_positie: string;
  aanbevolen_aanpak: string;
}

const TOPTALENT_PROFILE = `TopTalent Jobs profiel:
- Specialist in horeca personeel (bediening, bar, keuken, afwas, evenementen)
- Actief in Utrecht, Amsterdam en omgeving
- Flexibel personeel per dienst of per week
- Snel schakelen (binnen 24 uur)
- Eigen wervingsteam, gescreend personeel
- Persoonlijke aanpak, vaste contactpersoon
- Concurrerende tarieven
- Moderne app voor medewerkers (uren, planning)
- Focus op kwaliteit boven kwantiteit`;

export async function generateBattleCard(concurrent: Concurrent): Promise<BattleCard> {
  if (!isOpenAIConfigured()) {
    return fallbackBattleCard(concurrent);
  }

  const messages: ChatMessage[] = [
    {
      role: "system",
      content: `Je bent een sales strategie expert voor TopTalent Jobs, een horeca uitzendbureau.

${TOPTALENT_PROFILE}

Genereer een battle card waarmee onze sales reps effectief kunnen concurreren tegen de opgegeven concurrent.
De battle card moet praktisch en direct bruikbaar zijn in verkoopgesprekken.

Antwoord ALLEEN met valid JSON in dit format:
{
  "elevator_pitch": "korte pitch waarom TopTalent beter is dan deze concurrent (max 2 zinnen)",
  "differentiators": ["3-5 concrete punten waarop wij beter zijn"],
  "objection_handling": [{"bezwaar": "veelvoorkomend bezwaar", "antwoord": "effectief antwoord"}],
  "prijsstrategie": "hoe om te gaan met prijsvergelijking",
  "win_themes": ["2-3 thema's die resoneren bij prospects die deze concurrent overwegen"],
  "vermijd": ["1-2 dingen die je NIET moet zeggen/doen tegen deze concurrent"]
}`
    },
    {
      role: "user",
      content: `Concurrent: ${concurrent.naam}
Type: ${concurrent.type}
Website: ${concurrent.website || "onbekend"}
Regio's: ${concurrent.regios?.join(", ") || "onbekend"}
Branches: ${concurrent.branches?.join(", ") || "onbekend"}
Sterke punten: ${concurrent.sterke_punten?.join(", ") || "onbekend"}
Zwakke punten: ${concurrent.zwakke_punten?.join(", ") || "onbekend"}
Prijsindicatie: ${concurrent.prijsindicatie || "onbekend"}
USPs: ${concurrent.usps || "onbekend"}`
    }
  ];

  try {
    const response = await chatCompletion(messages, { temperature: 0.7, maxTokens: 800 });
    const cleaned = response.replace(/```json\n?|\n?```/g, "").trim();
    return JSON.parse(cleaned);
  } catch {
    return fallbackBattleCard(concurrent);
  }
}

export async function analyzeCompetitiveLandscape(
  lead: LeadContext,
  concurrenten: Concurrent[]
): Promise<CompetitiveAnalysis> {
  if (!isOpenAIConfigured()) {
    return fallbackAnalysis(lead, concurrenten);
  }

  const relevantConcurrenten = concurrenten.filter((c) => {
    const regioMatch = !lead.stad || c.regios?.some((r) =>
      lead.stad!.toLowerCase().includes(r.toLowerCase()) || r.toLowerCase().includes(lead.stad!.toLowerCase())
    );
    const brancheMatch = !lead.branche || c.branches?.some((b) =>
      lead.branche!.toLowerCase().includes(b.toLowerCase())
    );
    return regioMatch || brancheMatch;
  });

  const messages: ChatMessage[] = [
    {
      role: "system",
      content: `Je bent een competitive intelligence analist voor TopTalent Jobs.

${TOPTALENT_PROFILE}

Analyseer welke concurrenten waarschijnlijk ook deze prospect benaderen en geef strategisch advies.

Antwoord ALLEEN met valid JSON:
{
  "waarschijnlijke_concurrenten": ["namen van concurrenten die waarschijnlijk ook pitchen"],
  "onze_positie": "korte analyse van onze positie vs concurrentie voor deze specifieke lead",
  "win_kans": 65,
  "strategie": "aanbevolen verkoopstrategie (2-3 zinnen)",
  "key_differentiators": ["2-3 punten waarop wij ons onderscheiden voor deze lead"],
  "prijs_positie": "hoe onze prijs zich verhoudt en hoe dit te positioneren",
  "aanbevolen_aanpak": "concrete eerste stap"
}`
    },
    {
      role: "user",
      content: `Lead: ${lead.bedrijfsnaam}
Branche: ${lead.branche || "onbekend"}
Stad: ${lead.stad || "onbekend"}
Grootte: ${lead.grootte || "onbekend"}
Pain points: ${lead.pain_points?.join(", ") || "onbekend"}
Bekende concurrenten bij deze lead: ${lead.concurrent_info?.concurrenten?.join(", ") || "geen"}
Notities concurrentie: ${lead.concurrent_info?.notities || "geen"}

Bekende concurrenten in de markt:
${relevantConcurrenten.map((c) =>
  `- ${c.naam} (${c.type}): regio's ${c.regios?.join(",")||"?"}, sterke punten: ${c.sterke_punten?.join(",")||"?"}, prijs: ${c.prijsindicatie||"?"}`
).join("\n")}`
    }
  ];

  try {
    const response = await chatCompletion(messages, { temperature: 0.6, maxTokens: 600 });
    const cleaned = response.replace(/```json\n?|\n?```/g, "").trim();
    return JSON.parse(cleaned);
  } catch {
    return fallbackAnalysis(lead, concurrenten);
  }
}

export async function generateWinLossLearnings(
  winLossRecords: { resultaat: string; reden: string; reden_detail: string; branche: string; concurrent_naam?: string }[]
): Promise<{ trends: string[]; aanbevelingen: string[]; sterke_punten: string[]; verbeterpunten: string[] }> {
  if (!isOpenAIConfigured() || winLossRecords.length < 3) {
    return {
      trends: ["Te weinig data voor trendanalyse"],
      aanbevelingen: ["Registreer meer win/loss data voor inzichten"],
      sterke_punten: [],
      verbeterpunten: [],
    };
  }

  const messages: ChatMessage[] = [
    {
      role: "system",
      content: `Je analyseert win/loss data voor TopTalent Jobs. Identificeer patronen en geef actionable aanbevelingen.

Antwoord ALLEEN met valid JSON:
{
  "trends": ["3-5 trends die je ziet in de data"],
  "aanbevelingen": ["3-5 concrete aanbevelingen om win rate te verhogen"],
  "sterke_punten": ["2-3 bewezen sterke punten"],
  "verbeterpunten": ["2-3 verbeterpunten"]
}`
    },
    {
      role: "user",
      content: `Win/Loss records (${winLossRecords.length} totaal):
${winLossRecords.map((r) =>
  `- ${r.resultaat.toUpperCase()}: reden=${r.reden}, detail="${r.reden_detail || "-"}", branche=${r.branche}, concurrent=${r.concurrent_naam || "-"}`
).join("\n")}`
    }
  ];

  try {
    const response = await chatCompletion(messages, { temperature: 0.5, maxTokens: 500 });
    const cleaned = response.replace(/```json\n?|\n?```/g, "").trim();
    return JSON.parse(cleaned);
  } catch {
    return {
      trends: ["Analyse niet beschikbaar"],
      aanbevelingen: [],
      sterke_punten: [],
      verbeterpunten: [],
    };
  }
}

function fallbackBattleCard(concurrent: Concurrent): BattleCard {
  const differentiators = ["Specialist in horeca (niet generalistisch)", "Flexibel per dienst inzetbaar", "Binnen 24 uur personeel"];
  if (concurrent.type === "payroller") differentiators.push("Wij nemen het hele proces uit handen, niet alleen payroll");
  if (concurrent.type === "zzp_platform") differentiators.push("Gescreend personeel met kwaliteitsgarantie");

  return {
    elevator_pitch: `Anders dan ${concurrent.naam} is TopTalent 100% gespecialiseerd in horeca. Wij leveren gescreend personeel binnen 24 uur met een persoonlijke aanpak.`,
    differentiators,
    objection_handling: [
      { bezwaar: `Maar ${concurrent.naam} is goedkoper`, antwoord: "Goedkoop personeel kost uiteindelijk meer door no-shows en slechte kwaliteit. Wij garanderen betrouwbaar, ervaren personeel." },
      { bezwaar: "We werken al samen met hen", antwoord: "Veel klanten werken met meerdere bureaus. Probeer ons als backup en vergelijk de kwaliteit." },
    ],
    prijsstrategie: concurrent.prijsindicatie === "goedkoop"
      ? "Focus op kwaliteit en betrouwbaarheid, niet op prijs. Bereken de werkelijke kosten inclusief no-shows."
      : "Onze prijs-kwaliteit verhouding is sterk. Benadruk de extra service die inbegrepen is.",
    win_themes: ["Horecaspecialist vs generalist", "Snelheid en betrouwbaarheid", "Persoonlijke aanpak"],
    vermijd: [`Spreek niet negatief over ${concurrent.naam}`, "Ga niet mee in een prijzenoorlog"],
  };
}

function fallbackAnalysis(lead: LeadContext, concurrenten: Concurrent[]): CompetitiveAnalysis {
  const relevantNames = concurrenten
    .filter((c) => c.actief !== false)
    .slice(0, 3)
    .map((c) => c.naam);

  return {
    waarschijnlijke_concurrenten: relevantNames,
    onze_positie: `TopTalent is horecaspecialist in de regio ${lead.stad || "Utrecht"}. Wij onderscheiden ons door snelheid en persoonlijke aanpak.`,
    win_kans: 50,
    strategie: "Focus op onze horecaspecialisatie en snelle levering. Bied een proefperiode aan om kwaliteit te bewijzen.",
    key_differentiators: ["100% horeca focus", "Binnen 24 uur leveren", "Persoonlijke vaste contactpersoon"],
    prijs_positie: "Marktconform met nadruk op kwaliteitsgarantie",
    aanbevolen_aanpak: "Begin met een kennismakingsgesprek en bied een gratis proefplaatsing aan.",
  };
}
