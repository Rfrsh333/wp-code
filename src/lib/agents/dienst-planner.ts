import { chatCompletion, type ChatMessage } from "@/lib/openai";
import { supabaseAdmin } from "@/lib/supabase";

interface PlanningInput {
  klant_naam: string;
  locatie: string;
  datum: string;
  functie: string;
  start_tijd?: string;
  eind_tijd?: string;
}

export interface PlanningSuggestie {
  aanbevolen_aantal: number;
  aanbevolen_functies: string[];
  tijdsadvies: string;
  onderbouwing: string;
  tips: string[];
}

const SYSTEM_PROMPT = `Je bent een planning specialist voor TopTalent Jobs, een horeca uitzendbureau.

Je analyseert diensten en geeft advies over optimale bezetting. Je hebt kennis van de horeca industrie.

Beschikbare functies: bediening, bar, keuken, afwas

Richtlijnen per type gelegenheid:
- Restaurant (klein, <50 zitplaatsen): 1-2 bediening, 1 bar, 1-2 keuken
- Restaurant (groot, 50+ zitplaatsen): 2-4 bediening, 1-2 bar, 2-3 keuken, 1 afwas
- Evenement (<100 gasten): 2-3 bediening, 1 bar
- Evenement (100-300 gasten): 4-6 bediening, 2 bar, 2-3 keuken
- Evenement (300+ gasten): 6-10 bediening, 3-4 bar, 3-4 keuken, 2 afwas
- Hotel: 2-3 bediening per shift, 1-2 keuken
- Catering: afhankelijk van gasten, vergelijkbaar met evenement

Tijdsadvies:
- Lunch diensten: 10:00-15:00
- Diner diensten: 16:00-23:00
- Evenementen: afhankelijk van het type, meestal 4-8 uur

Antwoord ALTIJD in exact dit JSON format:
{
  "aanbevolen_aantal": <nummer>,
  "aanbevolen_functies": ["<functie1>", "<functie2>"],
  "tijdsadvies": "<advies over timing>",
  "onderbouwing": "<uitleg waarom>",
  "tips": ["<tip1>", "<tip2>"]
}`;

/**
 * Genereer planning suggesties voor een dienst
 */
export async function generatePlanningSuggestie(input: PlanningInput): Promise<PlanningSuggestie> {
  // Haal historische data op voor deze klant
  const { data: historischeDiensten } = await supabaseAdmin
    .from("diensten")
    .select("functie, aantal_nodig, start_tijd, eind_tijd, status")
    .eq("klant_naam", input.klant_naam)
    .order("datum", { ascending: false })
    .limit(10);

  const historischeContext = historischeDiensten?.length
    ? `\nHistorische diensten bij deze klant:\n${historischeDiensten
        .map(
          (d) =>
            `- ${d.functie}: ${d.aantal_nodig} personen (${d.start_tijd}-${d.eind_tijd}, status: ${d.status})`
        )
        .join("\n")}`
    : "\nGeen eerdere diensten bij deze klant.";

  const userPrompt = `Geef planning suggesties voor deze dienst:

Klant: ${input.klant_naam}
Locatie: ${input.locatie}
Datum: ${input.datum}
Gevraagde functie: ${input.functie}
${input.start_tijd ? `Starttijd: ${input.start_tijd}` : ""}
${input.eind_tijd ? `Eindtijd: ${input.eind_tijd}` : ""}
${historischeContext}`;

  const messages: ChatMessage[] = [
    { role: "system", content: SYSTEM_PROMPT },
    { role: "user", content: userPrompt },
  ];

  const response = await chatCompletion(messages, { temperature: 0.4 });

  try {
    const cleaned = response.replace(/```json\n?|\n?```/g, "").trim();
    return JSON.parse(cleaned) as PlanningSuggestie;
  } catch {
    return {
      aanbevolen_aantal: 2,
      aanbevolen_functies: [input.functie],
      tijdsadvies: "Standaard dienst tijden aanbevolen",
      onderbouwing: response.slice(0, 300),
      tips: ["AI suggestie kon niet volledig worden verwerkt, handmatig beoordelen"],
    };
  }
}
