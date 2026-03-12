import { chatCompletion, type ChatMessage } from "@/lib/openai";

type WhatsAppType = "intro" | "follow_up" | "beschikbaarheid" | "bedankt" | "herinnering";

interface WhatsAppInput {
  type: WhatsAppType;
  bedrijfsnaam: string;
  contactpersoon: string | null;
  branche: string | null;
  stad: string | null;
  pain_points: string[];
  eerdere_berichten_count: number;
  laatste_contact_type: string | null;
}

export interface WhatsAppResult {
  bericht: string;
}

const SYSTEM_PROMPT = `Je bent een sales specialist voor TopTalent Jobs, een horeca uitzendbureau. Je schrijft WhatsApp berichten.

Over TopTalent Jobs:
- Specialist in horeca personeel: bediening, bar, keuken, afwas, evenementen
- Levert binnen 24 uur, flexibel per dienst
- Actief in Utrecht en Amsterdam
- Website: toptalentjobs.nl

WhatsApp stijlregels:
- KORT: max 3-4 zinnen, nooit meer dan 60 woorden
- Informeel maar professioneel, gebruik "je/jij"
- Geen "Geachte" of formele aanhef — gewoon "Hey [naam]" of "Hi [naam]"
- Geen handtekening onderaan, alleen voornaam: "Groet, [naam van TopTalent]"
- Geen bullet points of lange lijsten
- Eén duidelijke vraag of call-to-action
- Gebruik GEEN emoji's tenzij het een bedankje is (dan max 1)

Bericht types:
- intro: Eerste contact, stel jezelf kort voor
- follow_up: Refereer aan eerder contact, korte check-in
- beschikbaarheid: Vraag of ze deze week/maand personeel nodig hebben
- bedankt: Bedank voor gesprek/afspraak
- herinnering: Vriendelijke reminder op eerder contact

Antwoord ALLEEN met het bericht zelf, geen JSON, geen aanhalingstekens.`;

export async function generateWhatsAppMessage(input: WhatsAppInput): Promise<WhatsAppResult> {
  const typeLabel = {
    intro: "Eerste kennismaking via WhatsApp",
    follow_up: "Follow-up",
    beschikbaarheid: "Beschikbaarheid check",
    bedankt: "Bedankje",
    herinnering: "Herinnering",
  }[input.type];

  const userPrompt = `Schrijf een ${typeLabel} WhatsApp bericht:

Bedrijf: ${input.bedrijfsnaam}
Contactpersoon: ${input.contactpersoon || "onbekend (gebruik dan geen naam)"}
Branche: ${input.branche || "horeca"}
Stad: ${input.stad || ""}
${input.pain_points.length > 0 ? `Mogelijke behoeften: ${input.pain_points.join(", ")}` : ""}
Eerdere berichten: ${input.eerdere_berichten_count}
${input.laatste_contact_type ? `Laatste contact was via: ${input.laatste_contact_type}` : ""}`;

  const messages: ChatMessage[] = [
    { role: "system", content: SYSTEM_PROMPT },
    { role: "user", content: userPrompt },
  ];

  const response = await chatCompletion(messages, { temperature: 0.7, maxTokens: 300 });

  return { bericht: response.trim().replace(/^["']|["']$/g, "") };
}

// Smart Channel Selection: bepaal het beste kanaal voor een lead
export interface ChannelRecommendation {
  kanaal: "email" | "telefoon" | "whatsapp";
  reden: string;
  tijdstip_advies: string;
}

interface ChannelInput {
  branche: string | null;
  stad: string | null;
  heeft_email: boolean;
  heeft_telefoon: boolean;
  pipeline_stage: string;
  eerdere_contacten: { type: string; richting: string; resultaat: string | null }[];
  ai_score: number | null;
  engagement_score: number;
}

export function recommendChannel(input: ChannelInput): ChannelRecommendation {
  const { branche, heeft_email, heeft_telefoon, pipeline_stage, eerdere_contacten, ai_score, engagement_score } = input;
  const brancheLower = (branche || "").toLowerCase();

  // Tel eerdere pogingen per kanaal
  const emailPogingen = eerdere_contacten.filter((c) => c.type === "email" && c.richting === "uitgaand").length;
  const belPogingen = eerdere_contacten.filter((c) => c.type === "telefoon" && c.richting === "uitgaand").length;
  const waPogingen = eerdere_contacten.filter((c) => c.type === "whatsapp" && c.richting === "uitgaand").length;
  const heeftGereageerd = eerdere_contacten.some((c) => c.richting === "inkomend");
  const positieveReactie = eerdere_contacten.some((c) => c.resultaat === "positief");

  // Als ze al gereageerd hebben, gebruik het kanaal waarop ze reageerden
  const inkomendContact = eerdere_contacten.find((c) => c.richting === "inkomend");
  if (inkomendContact) {
    return {
      kanaal: inkomendContact.type as "email" | "telefoon" | "whatsapp",
      reden: `Lead heeft eerder gereageerd via ${inkomendContact.type}`,
      tijdstip_advies: getTijdstipAdvies(brancheLower),
    };
  }

  // Bij interesse/offerte stage: persoonlijk contact
  if (pipeline_stage === "interesse" || pipeline_stage === "offerte") {
    if (heeft_telefoon) {
      return {
        kanaal: "telefoon",
        reden: "Lead is in gevorderde fase — persoonlijk bellen werkt het best",
        tijdstip_advies: getTijdstipAdvies(brancheLower),
      };
    }
  }

  // Hoge engagement: bellen
  if (engagement_score >= 50 && heeft_telefoon) {
    return {
      kanaal: "telefoon",
      reden: "Hoge engagement score — direct persoonlijk contact",
      tijdstip_advies: getTijdstipAdvies(brancheLower),
    };
  }

  // Branche-specifieke voorkeur
  if (["restaurant", "cafe", "bar"].includes(brancheLower)) {
    // Horeca: WhatsApp > telefoon > email
    if (heeft_telefoon && waPogingen < 2) {
      // Maar als we al 2+ emails zonder reactie stuurden, switch kanaal
      if (emailPogingen >= 2 && !heeftGereageerd) {
        return {
          kanaal: "whatsapp",
          reden: `${emailPogingen} emails zonder reactie — probeer WhatsApp (horeca reageert beter)`,
          tijdstip_advies: getTijdstipAdvies(brancheLower),
        };
      }
      // Hoge score: direct WhatsApp
      if (ai_score && ai_score > 70) {
        return {
          kanaal: "whatsapp",
          reden: "Hoge score restaurant/cafe — WhatsApp is effectiefst in horeca",
          tijdstip_advies: getTijdstipAdvies(brancheLower),
        };
      }
    }
  }

  if (["hotel", "catering"].includes(brancheLower)) {
    // Formeler: email > telefoon > WhatsApp
    if (heeft_email && emailPogingen < 3) {
      return {
        kanaal: "email",
        reden: "Hotels/catering: email is professioneler eerste contact",
        tijdstip_advies: "Ochtend 9-11u",
      };
    }
  }

  if (["fastfood", "keten"].includes(brancheLower)) {
    // Ketens: email (centraal HR)
    if (heeft_email) {
      return {
        kanaal: "email",
        reden: "Keten/fastfood: email naar centraal HR is standaard",
        tijdstip_advies: "Werkdagen 9-17u",
      };
    }
  }

  // Default logica: start met email, dan WhatsApp, dan bellen
  if (emailPogingen === 0 && heeft_email) {
    return {
      kanaal: "email",
      reden: "Eerste contact — email is veilige start",
      tijdstip_advies: "Di-Do ochtend 9-11u",
    };
  }

  if (emailPogingen >= 2 && !heeftGereageerd && heeft_telefoon && waPogingen === 0) {
    return {
      kanaal: "whatsapp",
      reden: "Geen reactie op emails — probeer WhatsApp",
      tijdstip_advies: getTijdstipAdvies(brancheLower),
    };
  }

  if (heeft_telefoon && belPogingen < 2) {
    return {
      kanaal: "telefoon",
      reden: positieveReactie ? "Positief contact gehad — bel op voor vervolg" : "Probeer telefonisch contact",
      tijdstip_advies: getTijdstipAdvies(brancheLower),
    };
  }

  // Fallback
  if (heeft_email) {
    return { kanaal: "email", reden: "Standaard follow-up via email", tijdstip_advies: "Di-Do ochtend" };
  }
  if (heeft_telefoon) {
    return { kanaal: "whatsapp", reden: "Geen email — WhatsApp als alternatief", tijdstip_advies: getTijdstipAdvies(brancheLower) };
  }

  return { kanaal: "email", reden: "Geen contactgegevens beschikbaar", tijdstip_advies: "" };
}

function getTijdstipAdvies(branche: string): string {
  switch (branche) {
    case "restaurant":
    case "cafe":
    case "bar":
      return "Di-Wo 10-11u of 14-15u (buiten lunch/diner)";
    case "hotel":
      return "Werkdagen 9-11u";
    case "catering":
    case "events":
      return "Werkdagen 9-12u";
    case "fastfood":
      return "Werkdagen 10-16u";
    default:
      return "Di-Do 10-11u";
  }
}
