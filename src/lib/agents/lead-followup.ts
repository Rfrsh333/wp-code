import { chatCompletion, type ChatMessage } from "@/lib/openai";

interface PersoneelAanvraag {
  bedrijfsnaam: string;
  contactpersoon: string;
  email: string;
  type_personeel: string[];
  aantal_personen: string;
  start_datum: string;
  eind_datum: string | null;
  werkdagen: string[];
  werktijden: string;
  locatie: string;
  opmerkingen: string | null;
}

const SYSTEM_PROMPT = `Je bent een professionele sales medewerker van TopTalent Jobs, een horeca uitzendbureau in Utrecht en omgeving.

Over TopTalent Jobs:
- Specialist in horeca personeel: bediening, bar, keuken, afwas, evenementen
- Levert binnen 24 uur ervaren krachten
- Actief in Utrecht en omgeving
- Alle medewerkers zijn gescreend en ervaren
- Flexibele inzet: per dienst, per week, of langere periodes
- Website: www.toptalentjobs.nl
- Telefoon: beschikbaar voor vragen

Schrijfstijl:
- Professioneel maar warm en persoonlijk
- In het Nederlands
- Gebruik "je/jij" (informeel)
- Kort en bondig, max 200 woorden
- Eindig altijd met een duidelijke call-to-action
- Vermeld dat je binnen 24 uur een voorstel stuurt met beschikbare medewerkers

Structuur email:
1. Bedank voor de aanvraag
2. Bevestig dat je de details hebt ontvangen (noem specifieke details)
3. Kort wat je kunt bieden
4. Volgende stap / call-to-action`;

/**
 * Genereer een gepersonaliseerde lead follow-up email
 */
export async function generateLeadResponse(aanvraag: PersoneelAanvraag): Promise<string> {
  const userPrompt = `Genereer een professionele reactie-email voor deze personeel aanvraag:

Bedrijf: ${aanvraag.bedrijfsnaam}
Contactpersoon: ${aanvraag.contactpersoon}
Gevraagd personeel: ${aanvraag.type_personeel.join(", ")}
Aantal: ${aanvraag.aantal_personen}
Start datum: ${aanvraag.start_datum}
${aanvraag.eind_datum ? `Eind datum: ${aanvraag.eind_datum}` : "Doorlopend / geen einddatum"}
Werkdagen: ${aanvraag.werkdagen.join(", ")}
Werktijden: ${aanvraag.werktijden}
Locatie: ${aanvraag.locatie}
${aanvraag.opmerkingen ? `Extra opmerkingen: ${aanvraag.opmerkingen}` : ""}

Schrijf alleen de email body (geen onderwerpregel). Begin met "Beste ${aanvraag.contactpersoon}," en eindig met een groet namens TopTalent Jobs.`;

  const messages: ChatMessage[] = [
    { role: "system", content: SYSTEM_PROMPT },
    { role: "user", content: userPrompt },
  ];

  return chatCompletion(messages, { temperature: 0.7 });
}
