/**
 * Template-based auto-reply voor personeel aanvragen.
 * Geen OpenAI call nodig — conditionele personalisatie.
 */

interface Inquiry {
  id: string;
  contactpersoon: string;
  bedrijfsnaam: string;
  email: string;
  type_personeel: string[];
  aantal_personen: string;
  start_datum: string;
  eind_datum: string | null;
  opmerkingen: string | null;
  locatie: string;
}

interface ReplyOptions {
  senderName: string;
  bookingUrl: string;
}

/**
 * Genereer een gepersonaliseerd tekstblok op basis van de aanvraag
 */
function getPersonalization(inquiry: Inquiry): string {
  const types = (inquiry.type_personeel || []).map((t) => t.toLowerCase());
  const isUrgent = isUrgentInquiry(inquiry);
  const aantal = inquiry.aantal_personen;

  // Koks
  if (types.some((t) => t.includes("kok") || t.includes("keuken"))) {
    return `Een goede kok op ${isUrgent ? "korte termijn" : "termijn"} — dat regelen we graag voor je.`;
  }

  // Bediening
  if (types.some((t) => t.includes("bediening") || t.includes("serveerster") || t.includes("ober"))) {
    return `Ervaren bediening die weet wat gastvrijheid is — daar zorgen wij voor.`;
  }

  // Bar
  if (types.some((t) => t.includes("bar"))) {
    return `Een sterke bartender die snel en professioneel werkt — we hebben ze klaarstaan.`;
  }

  // Afwas
  if (types.some((t) => t.includes("afwas"))) {
    return `Betrouwbare spoelkrachten die de keuken draaiende houden — we schakelen snel.`;
  }

  // Evenementen
  if (types.some((t) => t.includes("evenement") || t.includes("event"))) {
    const aantalStr = aantal ? ` van ${aantal} personen` : "";
    return `Een evenement${aantalStr}? Klinkt als een mooie klus. We zorgen dat je de juiste mensen op de vloer hebt.`;
  }

  // Meerdere types
  if (types.length > 1) {
    return `Een compleet team samenstellen — daar zijn we goed in. We kijken meteen wat we voor je kunnen regelen.`;
  }

  // Urgent
  if (isUrgent) {
    return `We snappen dat het snel moet. Daar zijn we goed in — we schakelen meteen.`;
  }

  // Default
  return `Goed dat je ons hebt gevonden. We helpen je graag aan het juiste horecapersoneel.`;
}

function isUrgentInquiry(inquiry: Inquiry): boolean {
  if (!inquiry.start_datum) return false;
  const startDate = new Date(inquiry.start_datum);
  const today = new Date();
  const diffDays = Math.ceil((startDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  return diffDays <= 3;
}

/**
 * Genereer de volledige auto-reply email tekst
 */
export function generateAutoReply(inquiry: Inquiry, options: ReplyOptions): string {
  const voornaam = inquiry.contactpersoon.split(" ")[0];
  const personalisatie = getPersonalization(inquiry);

  return `Hoi ${voornaam},

Bedankt voor je aanvraag bij TopTalent Jobs!

${personalisatie}

Ik bespreek graag de mogelijkheden even met je in een kort gesprek. Plan hier een moment dat jou uitkomt:

${options.bookingUrl}

Het gesprekje duurt zo'n 15-20 minuten. Geen verplichtingen, gewoon even kennismaken en kijken wat we voor je kunnen betekenen.

Als je liever belt: ik ben bereikbaar op +31 6 17 17 79 39.

Groet,
${options.senderName}
TopTalent Jobs`;
}

/**
 * Genereer het e-mail onderwerp
 */
export function generateAutoReplySubject(): string {
  return "Reactie op je aanvraag — TopTalent Jobs";
}
