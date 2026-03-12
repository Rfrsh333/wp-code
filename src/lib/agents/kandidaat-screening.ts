import { chatCompletion, type ChatMessage } from "@/lib/openai";

interface KandidaatProfiel {
  voornaam: string;
  achternaam: string;
  stad: string;
  geboortedatum: string;
  horeca_ervaring: string | null;
  gewenste_functies: string[] | null;
  talen: string[] | null;
  eigen_vervoer: boolean | null;
  beschikbaarheid: string | Record<string, string[]> | null;
  beschikbaar_vanaf: string | null;
  max_uren_per_week: number | null;
  uitbetalingswijze: string;
  motivatie: string;
}

export interface ScreeningResult {
  score: number;
  samenvatting: string;
  sterke_punten: string[];
  aandachtspunten: string[];
  aanbeveling: string;
}

const SYSTEM_PROMPT = `Je bent een HR-screening specialist voor TopTalent Jobs, een horeca uitzendbureau.

Je taak is om nieuwe kandidaten te evalueren op basis van hun profiel. Geef een eerlijke maar constructieve beoordeling.

Evaluatiecriteria:
1. Ervaring in de horeca (zeer belangrijk)
2. Beschikbaarheid (flexibiliteit is een plus)
3. Taalvaardigheid (Nederlands is vereist, Engels is een plus)
4. Motivatie en presentatie
5. Locatie (Utrecht en omgeving is ideaal)
6. Eigen vervoer (handig maar niet vereist)

Score schaal (1-10):
- 1-3: Niet geschikt (geen ervaring, beperkte beschikbaarheid)
- 4-5: Twijfelgeval (weinig ervaring maar potentieel)
- 6-7: Geschikt (goede basis, kan ingezet worden)
- 8-9: Zeer geschikt (veel ervaring, flexibel)
- 10: Uitstekend (perfect profiel)

Antwoord ALTIJD in exact dit JSON format:
{
  "score": <nummer 1-10>,
  "samenvatting": "<1-2 zinnen over de kandidaat>",
  "sterke_punten": ["<punt 1>", "<punt 2>"],
  "aandachtspunten": ["<punt 1>", "<punt 2>"],
  "aanbeveling": "<actie aanbeveling voor admin>"
}`;

/**
 * Screen een nieuwe kandidaat via GPT
 */
export async function screenKandidaat(profiel: KandidaatProfiel): Promise<ScreeningResult> {
  const leeftijd = profiel.geboortedatum
    ? Math.floor((Date.now() - new Date(profiel.geboortedatum).getTime()) / (365.25 * 24 * 60 * 60 * 1000))
    : "onbekend";

  const beschikbaarheidTekst =
    typeof profiel.beschikbaarheid === "object" && profiel.beschikbaarheid !== null
      ? Object.entries(profiel.beschikbaarheid)
          .map(([dag, slots]) => `${dag}: ${Array.isArray(slots) ? slots.join(", ") : slots}`)
          .join("; ")
      : profiel.beschikbaarheid || "niet opgegeven";

  const userPrompt = `Beoordeel deze kandidaat:

Naam: ${profiel.voornaam} ${profiel.achternaam}
Leeftijd: ${leeftijd}
Woonplaats: ${profiel.stad}
Horeca ervaring: ${profiel.horeca_ervaring || "niet opgegeven"}
Gewenste functies: ${profiel.gewenste_functies?.join(", ") || "niet opgegeven"}
Talen: ${profiel.talen?.join(", ") || "niet opgegeven"}
Eigen vervoer: ${profiel.eigen_vervoer ? "Ja" : "Nee"}
Beschikbaarheid: ${beschikbaarheidTekst}
Beschikbaar vanaf: ${profiel.beschikbaar_vanaf || "niet opgegeven"}
Max uren/week: ${profiel.max_uren_per_week || "niet opgegeven"}
Contractvorm: ${profiel.uitbetalingswijze}
Motivatie: ${profiel.motivatie}`;

  const messages: ChatMessage[] = [
    { role: "system", content: SYSTEM_PROMPT },
    { role: "user", content: userPrompt },
  ];

  const response = await chatCompletion(messages, { temperature: 0.3 });

  try {
    // Parse JSON response, handle potential markdown code blocks
    const cleaned = response.replace(/```json\n?|\n?```/g, "").trim();
    return JSON.parse(cleaned) as ScreeningResult;
  } catch {
    // Fallback if GPT doesn't return valid JSON
    return {
      score: 5,
      samenvatting: response.slice(0, 200),
      sterke_punten: [],
      aandachtspunten: ["AI screening kon niet volledig worden verwerkt"],
      aanbeveling: "Handmatige beoordeling aanbevolen",
    };
  }
}
