import { chatCompletion, type ChatMessage } from "@/lib/openai";

type EmailType = "cold_intro" | "follow_up" | "offerte" | "reminder";

interface OutreachInput {
  type: EmailType;
  bedrijfsnaam: string;
  contactpersoon: string | null;
  branche: string | null;
  stad: string | null;
  pain_points: string[];
  personalisatie_notities: string | null;
  eerdere_emails_count: number;
  laatste_contact_type: string | null;
}

export interface OutreachResult {
  onderwerp: string;
  inhoud: string;
}

const SYSTEM_PROMPT = `Je bent een professionele sales copywriter voor TopTalent Jobs, een horeca uitzendbureau in Utrecht en omgeving.

Over TopTalent Jobs:
- Specialist in horeca personeel: bediening, bar, keuken, afwas, evenementen
- Levert binnen 24 uur ervaren, gescreende krachten
- Flexibele inzet: per dienst, per week, of langere periodes
- Actief in Utrecht, Amsterdam en omgeving
- Geen langetermijnverplichtingen
- Website: www.toptalentjobs.nl

Schrijfstijl:
- Professioneel maar warm en persoonlijk
- In het Nederlands
- Gebruik "je/jij" (informeel)
- Kort en bondig, max 150 woorden voor de body
- Geen overdreven sales-taal, geen uitroeptekens
- Eindig met een duidelijke maar zachte call-to-action

Email types:
- cold_intro: Eerste contact, stel TopTalent voor, refereer aan hun branche
- follow_up: Tweede/derde bericht, refereer aan vorige email, voeg waarde toe
- offerte: Concreet voorstel met tarieven en beschikbaarheid
- reminder: Vriendelijke herinnering, kort en to-the-point

Antwoord ALTIJD in exact dit JSON format:
{
  "onderwerp": "<email onderwerp>",
  "inhoud": "<volledige email body>"
}`;

export async function generateOutreachEmail(input: OutreachInput): Promise<OutreachResult> {
  const typeLabel = {
    cold_intro: "Eerste kennismaking",
    follow_up: `Follow-up (email #${input.eerdere_emails_count + 1})`,
    offerte: "Offerte / concreet voorstel",
    reminder: "Vriendelijke herinnering",
  }[input.type];

  const userPrompt = `Genereer een ${typeLabel} email:

Bedrijf: ${input.bedrijfsnaam}
Contactpersoon: ${input.contactpersoon || "onbekend (gebruik dan geen naam)"}
Branche: ${input.branche || "horeca"}
Stad: ${input.stad || "Utrecht"}
${input.pain_points.length > 0 ? `Mogelijke uitdagingen: ${input.pain_points.join(", ")}` : ""}
${input.personalisatie_notities ? `Personalisatie tips: ${input.personalisatie_notities}` : ""}
Eerdere emails verstuurd: ${input.eerdere_emails_count}
${input.laatste_contact_type ? `Laatste contact type: ${input.laatste_contact_type}` : ""}

${input.type === "follow_up" ? "Refereer subtiel aan een eerder bericht zonder te pushy te zijn." : ""}
${input.type === "offerte" ? "Noem dat tarieven afhankelijk zijn van het type personeel en de duur, en bied een vrijblijvend gesprek aan om een voorstel op maat te maken." : ""}

Begin de email met "Beste ${input.contactpersoon || ""}," (of "Hallo," als geen naam bekend) en eindig met een groet namens TopTalent Jobs.`;

  const messages: ChatMessage[] = [
    { role: "system", content: SYSTEM_PROMPT },
    { role: "user", content: userPrompt },
  ];

  const response = await chatCompletion(messages, { temperature: 0.7, maxTokens: 1000 });

  try {
    const cleaned = response.replace(/```json\n?|\n?```/g, "").trim();
    return JSON.parse(cleaned) as OutreachResult;
  } catch {
    return {
      onderwerp: `TopTalent Jobs - Horeca personeel voor ${input.bedrijfsnaam}`,
      inhoud: response,
    };
  }
}

export function applyTemplate(
  template: string,
  variables: Record<string, string>
): string {
  let result = template;
  for (const [key, value] of Object.entries(variables)) {
    result = result.replace(new RegExp(`\\{\\{${key}\\}\\}`, "g"), value);
  }
  return result;
}
