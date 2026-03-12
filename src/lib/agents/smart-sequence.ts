import { chatCompletion, type ChatMessage } from "@/lib/openai";

export interface NextActionResult {
  action: "email" | "bel" | "whatsapp" | "wacht" | "parkeer";
  reden: string;
  template_suggestie?: string;
  wacht_dagen?: number;
  email_type?: "cold_intro" | "follow_up" | "offerte" | "reminder";
  prioriteit: "hoog" | "normaal" | "laag";
}

interface LeadContext {
  bedrijfsnaam: string;
  contactpersoon: string | null;
  branche: string | null;
  stad: string | null;
  email: string | null;
  telefoon: string | null;
  pipeline_stage: string;
  ai_score: number | null;
  engagement_score: number;
  emails_verzonden_count: number;
  laatste_contact_datum: string | null;
  laatste_contact_type: string | null;
  created_at: string;
  contactmomenten: {
    type: string;
    richting: string;
    resultaat: string | null;
    created_at: string;
  }[];
}

const SYSTEM_PROMPT = `Je bent een AI sales strategie agent voor TopTalent Jobs, een horeca uitzendbureau.

Je analyseert de complete interactie-geschiedenis van een lead en bepaalt de BESTE volgende actie.

Regels:
1. Nooit meer dan 1 email per 3 dagen sturen
2. Na een geopende email: bel binnen 24 uur (als telefoon beschikbaar)
3. Na positief telefoongesprek: stuur offerte-email
4. Na voicemail: wacht 1 dag, stuur dan WhatsApp (of email als geen telefoon)
5. Na 3x geen reactie op email: parkeer lead voor 30 dagen
6. Na 2x geen antwoord telefoon: probeer WhatsApp of email met andere insteek
7. Nieuwe lead met hoge score (>70): direct bellen is prioriteit
8. Nieuwe lead met lagere score: start met email
9. Als lead al in "interesse" of "offerte": focus op bellen en persoonlijk contact
10. Houd rekening met het seizoen (maart-september = terrasseizoen = urgenter)

Kanaal voorkeur per branche:
- Restaurants/cafes: telefoon overdag (10-11u of 14-15u, buiten lunch/diner)
- Hotels: email of telefoon ochtend
- Catering/events: email eerst, dan bellen
- Fastfood/keten: email (vaak centraal HR)

Antwoord ALTIJD in exact dit JSON format:
{
  "action": "email" | "bel" | "whatsapp" | "wacht" | "parkeer",
  "reden": "<korte uitleg waarom deze actie>",
  "template_suggestie": "<optioneel: korte suggestie voor de boodschap>",
  "wacht_dagen": <optioneel: aantal dagen wachten>,
  "email_type": "<optioneel: cold_intro | follow_up | offerte | reminder>",
  "prioriteit": "hoog" | "normaal" | "laag"
}`;

export async function determineNextAction(context: LeadContext): Promise<NextActionResult> {
  const now = new Date();
  const maand = now.getMonth() + 1;
  const seizoen = maand >= 3 && maand <= 9 ? "terrasseizoen (druk)" : "winterseizoen (rustiger)";

  // Bereken dagen sinds laatste contact
  const dagenSindsContact = context.laatste_contact_datum
    ? Math.floor((now.getTime() - new Date(context.laatste_contact_datum).getTime()) / (1000 * 60 * 60 * 24))
    : null;

  // Bereken dagen sinds aangemaakt
  const dagenSindsAangemaakt = Math.floor(
    (now.getTime() - new Date(context.created_at).getTime()) / (1000 * 60 * 60 * 24)
  );

  // Sorteer contactmomenten chronologisch (nieuwste eerst)
  const recenteContacten = context.contactmomenten.slice(0, 10);

  // Tel types
  const emailsVerstuurd = recenteContacten.filter((c) => c.type === "email" && c.richting === "uitgaand").length;
  const belPogingen = recenteContacten.filter((c) => c.type === "telefoon" && c.richting === "uitgaand").length;
  const geenReactieCount = recenteContacten.filter((c) => c.resultaat === "geen_antwoord" || c.resultaat === "voicemail").length;
  const positieveReacties = recenteContacten.filter((c) => c.resultaat === "positief").length;

  const userPrompt = `Bepaal de volgende actie voor deze lead:

Lead profiel:
- Bedrijf: ${context.bedrijfsnaam}
- Contactpersoon: ${context.contactpersoon || "onbekend"}
- Branche: ${context.branche || "onbekend"}
- Stad: ${context.stad || "onbekend"}
- Email: ${context.email ? "beschikbaar" : "NIET beschikbaar"}
- Telefoon: ${context.telefoon ? "beschikbaar" : "NIET beschikbaar"}
- Pipeline stage: ${context.pipeline_stage}
- AI Score: ${context.ai_score || "niet gescoord"}
- Engagement Score: ${context.engagement_score}

Interactie geschiedenis:
- Emails verstuurd: ${emailsVerstuurd}
- Belpogingen: ${belPogingen}
- Keer geen reactie: ${geenReactieCount}
- Positieve reacties: ${positieveReacties}
- Dagen sinds laatste contact: ${dagenSindsContact ?? "nooit contact gehad"}
- Dagen sinds aangemaakt: ${dagenSindsAangemaakt}
- Laatste contact type: ${context.laatste_contact_type || "geen"}

Recente contactmomenten (nieuwste eerst):
${recenteContacten.length > 0 ? recenteContacten.map((c) =>
  `- ${c.type} (${c.richting}) - resultaat: ${c.resultaat || "n.v.t."} - ${new Date(c.created_at).toLocaleDateString("nl-NL")}`
).join("\n") : "Geen contactmomenten"}

Seizoen: ${seizoen} (${now.toLocaleDateString("nl-NL", { month: "long", year: "numeric" })})

Bepaal de beste volgende actie.`;

  const messages: ChatMessage[] = [
    { role: "system", content: SYSTEM_PROMPT },
    { role: "user", content: userPrompt },
  ];

  const response = await chatCompletion(messages, { temperature: 0.3, maxTokens: 500 });

  try {
    const cleaned = response.replace(/```json\n?|\n?```/g, "").trim();
    const result = JSON.parse(cleaned) as NextActionResult;

    // Validatie
    if (!["email", "bel", "whatsapp", "wacht", "parkeer"].includes(result.action)) {
      result.action = "email";
    }
    if (!["hoog", "normaal", "laag"].includes(result.prioriteit)) {
      result.prioriteit = "normaal";
    }

    return result;
  } catch {
    // Fallback logica zonder AI
    return fallbackNextAction(context, emailsVerstuurd, belPogingen, geenReactieCount, dagenSindsContact);
  }
}

function fallbackNextAction(
  context: LeadContext,
  emailsVerstuurd: number,
  belPogingen: number,
  geenReactieCount: number,
  dagenSindsContact: number | null,
): NextActionResult {
  // Nooit eerder contact gehad
  if (!context.laatste_contact_datum) {
    if (context.ai_score && context.ai_score > 70 && context.telefoon) {
      return { action: "bel", reden: "Hoge score lead, nog nooit contact gehad. Direct bellen.", prioriteit: "hoog" };
    }
    if (context.email) {
      return { action: "email", reden: "Nieuwe lead, start met introductie email.", email_type: "cold_intro", prioriteit: "normaal" };
    }
    if (context.telefoon) {
      return { action: "bel", reden: "Geen email beschikbaar, bellen is enige optie.", prioriteit: "normaal" };
    }
    return { action: "parkeer", reden: "Geen contactgegevens beschikbaar.", wacht_dagen: 30, prioriteit: "laag" };
  }

  // Te veel pogingen zonder reactie
  if (geenReactieCount >= 3 && emailsVerstuurd >= 3) {
    return { action: "parkeer", reden: "3+ pogingen zonder reactie, parkeer voor 30 dagen.", wacht_dagen: 30, prioriteit: "laag" };
  }

  // Wacht minimaal 3 dagen tussen emails
  if (dagenSindsContact !== null && dagenSindsContact < 3) {
    return { action: "wacht", reden: `Laatste contact was ${dagenSindsContact} dagen geleden, wacht nog even.`, wacht_dagen: 3 - dagenSindsContact, prioriteit: "laag" };
  }

  // Follow-up nodig
  if (emailsVerstuurd > 0 && emailsVerstuurd < 3 && context.email) {
    return { action: "email", reden: "Tijd voor een follow-up email.", email_type: "follow_up", prioriteit: "normaal" };
  }

  // Probeer te bellen
  if (context.telefoon && belPogingen < 2) {
    return { action: "bel", reden: "Probeer telefonisch contact.", prioriteit: "normaal" };
  }

  return { action: "email", reden: "Standaard follow-up.", email_type: "follow_up", prioriteit: "normaal" };
}

export async function determineNextActionBatch(
  leads: (LeadContext & { id: string })[]
): Promise<Map<string, NextActionResult>> {
  const results = new Map<string, NextActionResult>();
  // Process in chunks of 3 to manage rate limits
  for (let i = 0; i < leads.length; i += 3) {
    const chunk = leads.slice(i, i + 3);
    const chunkResults = await Promise.all(chunk.map((lead) => determineNextAction(lead)));
    chunk.forEach((lead, j) => results.set(lead.id, chunkResults[j]));
  }
  return results;
}
