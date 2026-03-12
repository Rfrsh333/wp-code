import { chatCompletion, isOpenAIConfigured, type ChatMessage } from "@/lib/openai";

interface KlantProfile {
  bedrijfsnaam: string;
  contactpersoon: string | null;
  stad: string | null;
  loyalty_tier: string;
  totaal_diensten: number;
  totaal_omzet: number;
  laatste_dienst_datum: string | null;
  gemiddelde_beoordeling: number;
}

interface HistorischeDiensten {
  maand: string;
  aantal: number;
}

export interface RetentionAnalysis {
  risico_niveau: "hoog" | "middel" | "laag";
  reden: string;
  aanbevolen_actie: string;
  email_suggestie?: { onderwerp: string; inhoud: string };
}

export async function analyzeKlantRetention(
  klant: KlantProfile,
  historisch: HistorischeDiensten[],
  huidigeMaand: number,
  huidigJaar: number
): Promise<RetentionAnalysis> {
  // Bereken basis metrics
  const recenteMaanden = historisch.slice(-6);
  const gemiddeldPerMaand = recenteMaanden.length > 0
    ? recenteMaanden.reduce((sum, m) => sum + m.aantal, 0) / recenteMaanden.length
    : 0;

  const huidigeMaandKey = `${huidigJaar}-${String(huidigeMaand).padStart(2, "0")}`;
  const dezeMaand = historisch.find(h => h.maand === huidigeMaandKey)?.aantal || 0;

  // Vergelijk met vorig jaar dezelfde maand
  const vorigJaarMaandKey = `${huidigJaar - 1}-${String(huidigeMaand).padStart(2, "0")}`;
  const vorigJaarDezeMaand = historisch.find(h => h.maand === vorigJaarMaandKey)?.aantal || 0;

  const dagenSindsLaatste = klant.laatste_dienst_datum
    ? Math.floor((Date.now() - new Date(klant.laatste_dienst_datum).getTime()) / (1000 * 60 * 60 * 24))
    : 999;

  if (!isOpenAIConfigured()) {
    return fallbackAnalysis(klant, gemiddeldPerMaand, dezeMaand, vorigJaarDezeMaand, dagenSindsLaatste);
  }

  const maandNamen = ["", "januari", "februari", "maart", "april", "mei", "juni", "juli", "augustus", "september", "oktober", "november", "december"];

  const messages: ChatMessage[] = [
    {
      role: "system",
      content: `Je bent een klant retention specialist voor TopTalent Jobs, een horeca uitzendbureau in Utrecht/Amsterdam.
Analyseer de klantdata en geef advies om churn te voorkomen.

Antwoord ALLEEN met valid JSON:
{
  "risico_niveau": "hoog" | "middel" | "laag",
  "reden": "korte uitleg waarom dit risico niveau (1-2 zinnen)",
  "aanbevolen_actie": "concrete actie voor de accountmanager (1-2 zinnen)",
  "email_suggestie": { "onderwerp": "email onderwerp", "inhoud": "korte email tekst (3-5 zinnen, persoonlijk en professioneel)" }
}`
    },
    {
      role: "user",
      content: `Klant: ${klant.bedrijfsnaam}
Contactpersoon: ${klant.contactpersoon || "onbekend"}
Stad: ${klant.stad || "onbekend"}
Loyalty tier: ${klant.loyalty_tier}
Totaal diensten: ${klant.totaal_diensten}
Totaal omzet: €${klant.totaal_omzet.toFixed(2)}
Laatste dienst: ${klant.laatste_dienst_datum || "nooit"} (${dagenSindsLaatste} dagen geleden)
Gemiddelde beoordeling die ze geven: ${klant.gemiddelde_beoordeling}/5

Diensten per maand (afgelopen 12 maanden):
${historisch.slice(-12).map(h => `  ${h.maand}: ${h.aantal} diensten`).join("\n")}

Gemiddeld per maand (afgelopen 6 mnd): ${gemiddeldPerMaand.toFixed(1)}
Deze maand (${maandNamen[huidigeMaand]}): ${dezeMaand} diensten
Zelfde maand vorig jaar: ${vorigJaarDezeMaand} diensten`
    }
  ];

  try {
    const response = await chatCompletion(messages, { temperature: 0.5, maxTokens: 500 });
    const cleaned = response.replace(/```json\n?|\n?```/g, "").trim();
    return JSON.parse(cleaned);
  } catch {
    return fallbackAnalysis(klant, gemiddeldPerMaand, dezeMaand, vorigJaarDezeMaand, dagenSindsLaatste);
  }
}

function fallbackAnalysis(
  klant: KlantProfile,
  gemiddeldPerMaand: number,
  dezeMaand: number,
  vorigJaarDezeMaand: number,
  dagenSindsLaatste: number
): RetentionAnalysis {
  let risico_niveau: "hoog" | "middel" | "laag" = "laag";
  let reden = "";
  let aanbevolen_actie = "";

  if (dagenSindsLaatste > 60) {
    risico_niveau = "hoog";
    reden = `${klant.bedrijfsnaam} heeft al ${dagenSindsLaatste} dagen geen dienst geboekt. Dit wijst op mogelijke churn.`;
    aanbevolen_actie = "Bel de klant vandaag nog om de relatie warm te houden en te vragen of er aankomende personeelsbehoefte is.";
  } else if (dagenSindsLaatste > 30 || (gemiddeldPerMaand > 2 && dezeMaand < gemiddeldPerMaand * 0.5)) {
    risico_niveau = "middel";
    reden = dezeMaand < gemiddeldPerMaand * 0.5
      ? `${klant.bedrijfsnaam} boekt deze maand ${dezeMaand} diensten vs gemiddeld ${gemiddeldPerMaand.toFixed(1)}. Significant minder dan normaal.`
      : `${klant.bedrijfsnaam} heeft ${dagenSindsLaatste} dagen niet geboekt.`;
    aanbevolen_actie = "Stuur een persoonlijke email met seizoensaanbod of bel voor een check-in.";
  } else {
    reden = `${klant.bedrijfsnaam} is actief met ${dezeMaand} diensten deze maand.`;
    aanbevolen_actie = "Geen actie nodig. Overweeg een upsell voor extra functies.";
  }

  if (vorigJaarDezeMaand > 0 && dezeMaand < vorigJaarDezeMaand * 0.5 && risico_niveau === "laag") {
    risico_niveau = "middel";
    reden = `${klant.bedrijfsnaam} boekte vorig jaar ${vorigJaarDezeMaand} diensten deze maand, nu pas ${dezeMaand}.`;
    aanbevolen_actie = "Proactief contact opnemen over seizoensplanning.";
  }

  return {
    risico_niveau,
    reden,
    aanbevolen_actie,
    email_suggestie: risico_niveau !== "laag" ? {
      onderwerp: `Personeelsplanning ${klant.bedrijfsnaam} — kunnen we helpen?`,
      inhoud: `Beste ${klant.contactpersoon || ""},\n\nWe merkten dat het even rustig is geweest. Het seizoen trekt aan en we willen graag zorgen dat jullie team op sterkte is. Zullen we even bellen om de komende weken door te nemen?\n\nMet vriendelijke groet,\nTopTalent Jobs`,
    } : undefined,
  };
}
