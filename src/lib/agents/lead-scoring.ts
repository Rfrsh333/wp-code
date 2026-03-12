import { chatCompletion, type ChatMessage } from "@/lib/openai";

interface LeadProfile {
  bedrijfsnaam: string;
  branche: string | null;
  stad: string | null;
  website: string | null;
  telefoon: string | null;
  email: string | null;
  adres: string | null;
}

export interface LeadScoreResult {
  score: number;
  reasoning: string;
  pain_points: string[];
  personalisatie_tip: string;
}

const SYSTEM_PROMPT = `Je bent een sales intelligence specialist voor TopTalent Jobs, een horeca uitzendbureau in Utrecht en omgeving.

Je taak is om potentiële klanten (leads) te scoren op basis van hoe waarschijnlijk het is dat ze horeca personeel nodig hebben via een uitzendbureau.

Over TopTalent Jobs:
- Specialist in horeca personeel: bediening, bar, keuken, afwas, evenementen
- Actief in Utrecht, Amsterdam en omgeving
- Levert flexibel personeel per dienst of per week

Scoringscriteria (1-100):
- Branche fit (30 punten): restaurants en cafes scoren hoog, hotels en catering ook goed
- Locatie (20 punten): Utrecht en directe omgeving scoren maximaal, rest van Nederland lager
- Bedrijfsgrootte indicatoren (15 punten): meerdere locaties, groot team = hogere score
- Contact bereikbaarheid (15 punten): email + telefoon = maximaal, alleen telefoon = lager
- Website kwaliteit (10 punten): professionele website = actief bedrijf
- Engagement potentieel (10 punten): gebaseerd op branche en seizoen

Antwoord ALTIJD in exact dit JSON format:
{
  "score": <nummer 1-100>,
  "reasoning": "<2-3 zinnen waarom deze score>",
  "pain_points": ["<mogelijke uitdaging 1>", "<mogelijke uitdaging 2>"],
  "personalisatie_tip": "<tip voor gepersonaliseerde benadering>"
}`;

export async function scoreLead(profiel: LeadProfile): Promise<LeadScoreResult> {
  const userPrompt = `Beoordeel deze potentiële klant:

Bedrijfsnaam: ${profiel.bedrijfsnaam}
Branche: ${profiel.branche || "onbekend"}
Stad: ${profiel.stad || "onbekend"}
Website: ${profiel.website || "geen"}
Email: ${profiel.email || "geen"}
Telefoon: ${profiel.telefoon || "geen"}
Adres: ${profiel.adres || "onbekend"}`;

  const messages: ChatMessage[] = [
    { role: "system", content: SYSTEM_PROMPT },
    { role: "user", content: userPrompt },
  ];

  const response = await chatCompletion(messages, { temperature: 0.3 });

  try {
    const cleaned = response.replace(/```json\n?|\n?```/g, "").trim();
    return JSON.parse(cleaned) as LeadScoreResult;
  } catch {
    return {
      score: 50,
      reasoning: response.slice(0, 300),
      pain_points: [],
      personalisatie_tip: "Handmatige beoordeling aanbevolen",
    };
  }
}

export async function scoreLeadsBatch(leads: LeadProfile[]): Promise<LeadScoreResult[]> {
  const results: LeadScoreResult[] = [];
  // Process in chunks of 5 to avoid rate limits
  for (let i = 0; i < leads.length; i += 5) {
    const chunk = leads.slice(i, i + 5);
    const chunkResults = await Promise.all(chunk.map(scoreLead));
    results.push(...chunkResults);
  }
  return results;
}
