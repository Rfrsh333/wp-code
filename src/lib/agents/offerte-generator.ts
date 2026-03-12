import { chatCompletion, isOpenAIConfigured, type ChatMessage } from "@/lib/openai";

const TARIEFKAART: Record<string, { basis: number; weekend: number; feestdag: number }> = {
  bediening: { basis: 14.50, weekend: 16.00, feestdag: 18.50 },
  bar: { basis: 15.00, weekend: 17.00, feestdag: 19.50 },
  keuken: { basis: 16.00, weekend: 18.00, feestdag: 20.50 },
  afwas: { basis: 13.00, weekend: 14.50, feestdag: 16.50 },
  gastheer: { basis: 15.50, weekend: 17.50, feestdag: 20.00 },
  runner: { basis: 13.50, weekend: 15.00, feestdag: 17.00 },
};

interface AanvraagInput {
  bedrijfsnaam: string;
  contactpersoon: string;
  typePersoneel: string[];
  aantalPersonen: string;
  werkdagen: string[];
  werktijden: string;
  locatie: string;
  startDatum: string;
  eindDatum?: string;
  contractType: string[];
  gewenstUurtarief?: number;
}

export interface OfferteVoorstel {
  introductie: string;
  tarieven: {
    functie: string;
    uurtarief: number;
    weekend_tarief: number;
    feestdag_tarief: number;
    aantal: number;
  }[];
  korting_percentage: number;
  korting_reden: string;
  totaal_per_week: number;
  markt_vergelijking: string;
}

function berekenUrenPerWeek(werkdagen: string[], werktijden: string): number {
  const urenPerDag = werktijden.includes("hele") ? 8 : werktijden.includes("ochtend") || werktijden.includes("middag") ? 5 : werktijden.includes("avond") ? 6 : 8;
  return werkdagen.length * urenPerDag;
}

export async function generateOfferteVoorstel(input: AanvraagInput): Promise<OfferteVoorstel> {
  const urenPerWeek = berekenUrenPerWeek(input.werkdagen, input.werktijden);
  const aantal = parseInt(input.aantalPersonen) || 1;

  // Bereken tarieven per functie
  const tarieven = input.typePersoneel.map(functie => {
    const f = functie.toLowerCase();
    const tarief = TARIEFKAART[f] || TARIEFKAART.bediening;
    return {
      functie,
      uurtarief: tarief.basis,
      weekend_tarief: tarief.weekend,
      feestdag_tarief: tarief.feestdag,
      aantal,
    };
  });

  // Volume korting
  let korting_percentage = 0;
  let korting_reden = "";
  const totaalUrenPerWeek = urenPerWeek * aantal;
  if (totaalUrenPerWeek > 40) {
    korting_percentage = 10;
    korting_reden = "Volume korting (>40 uur/week)";
  } else if (totaalUrenPerWeek > 20) {
    korting_percentage = 5;
    korting_reden = "Volume korting (>20 uur/week)";
  }

  // Bereken totaal
  const gemTarief = tarieven.reduce((sum, t) => sum + t.uurtarief, 0) / tarieven.length;
  const totaal_per_week = gemTarief * totaalUrenPerWeek * (1 - korting_percentage / 100);

  if (!isOpenAIConfigured()) {
    return {
      introductie: `Beste ${input.contactpersoon},\n\nBedankt voor uw aanvraag voor ${input.typePersoneel.join(" en ")} personeel. Op basis van uw wensen hebben wij het volgende voorstel samengesteld voor ${input.bedrijfsnaam}.`,
      tarieven,
      korting_percentage,
      korting_reden,
      totaal_per_week: Math.round(totaal_per_week * 100) / 100,
      markt_vergelijking: "Onze tarieven zijn marktconform en inclusief alle werkgeverslasten, werving, selectie en vervanging bij uitval.",
    };
  }

  const messages: ChatMessage[] = [
    {
      role: "system",
      content: `Je bent een sales specialist voor TopTalent Jobs, een horeca uitzendbureau.
Genereer een professioneel en persoonlijk offerte voorstel.

Antwoord ALLEEN met valid JSON:
{
  "introductie": "Persoonlijke introductietekst (3-4 zinnen, professioneel maar warm)",
  "markt_vergelijking": "Korte vergelijking met marktgemiddelde (1-2 zinnen)"
}`
    },
    {
      role: "user",
      content: `Klant: ${input.bedrijfsnaam}
Contactpersoon: ${input.contactpersoon}
Locatie: ${input.locatie}
Gevraagd: ${input.typePersoneel.join(", ")} (${input.aantalPersonen} personen)
Werkdagen: ${input.werkdagen.join(", ")}
Werktijden: ${input.werktijden}
Start: ${input.startDatum}${input.eindDatum ? ` tot ${input.eindDatum}` : " (doorlopend)"}
Uren per week: ${totaalUrenPerWeek}
Volume korting: ${korting_percentage}%`
    }
  ];

  try {
    const response = await chatCompletion(messages, { temperature: 0.7, maxTokens: 300 });
    const cleaned = response.replace(/```json\n?|\n?```/g, "").trim();
    const aiResult = JSON.parse(cleaned);

    return {
      introductie: aiResult.introductie || `Beste ${input.contactpersoon}, bedankt voor uw aanvraag.`,
      tarieven,
      korting_percentage,
      korting_reden,
      totaal_per_week: Math.round(totaal_per_week * 100) / 100,
      markt_vergelijking: aiResult.markt_vergelijking || "Marktconforme tarieven.",
    };
  } catch {
    return {
      introductie: `Beste ${input.contactpersoon},\n\nBedankt voor uw aanvraag voor ${input.typePersoneel.join(" en ")} personeel bij ${input.bedrijfsnaam}. Wij hebben een passend voorstel voor u samengesteld.`,
      tarieven,
      korting_percentage,
      korting_reden,
      totaal_per_week: Math.round(totaal_per_week * 100) / 100,
      markt_vergelijking: "Onze tarieven zijn marktconform en all-in.",
    };
  }
}
