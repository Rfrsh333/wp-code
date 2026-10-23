/**
 * Pure regels voor het publieke inschrijfformulier (/api/inschrijven).
 * Los van de route zodat ze zonder Supabase/Next te testen zijn.
 */

/** Verplichte velden met hun Nederlandse label (volgorde = volgorde in het formulier). */
export const VERPLICHTE_INSCHRIJF_VELDEN = {
  voornaam: "voornaam",
  achternaam: "achternaam",
  email: "e-mailadres",
  telefoon: "telefoonnummer",
  stad: "woonplaats",
  geboortedatum: "geboortedatum",
  geslacht: "geslacht",
  horecaErvaring: "horeca-ervaring",
  functies: "gewenste functies",
  talen: "talen",
  beschikbaarheid: "beschikbaarheid",
  beschikbaarVanaf: "beschikbaar vanaf",
  uitbetalingswijze: "contractvorm",
  hoeGekomen: "hoe je bij ons bent gekomen",
} as const;

export type VerplichtInschrijfVeld = keyof typeof VERPLICHTE_INSCHRIJF_VELDEN;

export type InschrijfVelden = {
  [K in VerplichtInschrijfVeld]: K extends "functies" | "talen" ? string[] : string;
};

/**
 * Geeft de velden terug die leeg zijn. Motivatie staat hier bewust NIET in:
 * het formulier noemt dat veld "(optioneel)".
 */
export function ontbrekendeInschrijfVelden(velden: InschrijfVelden): VerplichtInschrijfVeld[] {
  return (Object.keys(VERPLICHTE_INSCHRIJF_VELDEN) as VerplichtInschrijfVeld[]).filter((veld) => {
    const waarde = velden[veld];
    if (Array.isArray(waarde)) return waarde.length === 0;
    return !waarde || !String(waarde).trim();
  });
}

/** Leesbare foutmelding die noemt wélke velden ontbreken. */
export function inschrijfFoutmelding(ontbrekend: VerplichtInschrijfVeld[]): string {
  const labels = ontbrekend.map((veld) => VERPLICHTE_INSCHRIJF_VELDEN[veld]);
  if (labels.length === 0) return "";
  if (labels.length === 1) return `Vul het verplichte veld in: ${labels[0]}`;
  return `Vul de verplichte velden in: ${labels.join(", ")}`;
}

export type HerinschrijvingKeuze =
  | { soort: "nieuw" }
  | { soort: "hergebruik"; id: string }
  | { soort: "bestaat" };

/**
 * B13: wat er gebeurt als iemand zich inschrijft met een adres dat al bekend is.
 * De afwijzingsmail zegt "je bent altijd welkom om je opnieuw in te schrijven", maar de route
 * gaf dan 409. Nu: zijn alle bestaande inschrijvingen afgewezen, dan wordt de nieuwste
 * hergebruikt (zelfde id, gegevens en onboarding opnieuw); loopt er nog een, dan blijft het 409.
 */
export function herinschrijvingKeuze(
  bestaand: readonly { id: string; onboarding_status?: string | null; created_at?: string | null }[],
): HerinschrijvingKeuze {
  if (bestaand.length === 0) return { soort: "nieuw" };
  if (bestaand.some((r) => r.onboarding_status !== "afgewezen")) return { soort: "bestaat" };
  const nieuwste = [...bestaand].sort((a, b) => (b.created_at ?? "").localeCompare(a.created_at ?? ""))[0];
  return { soort: "hergebruik", id: nieuwste.id };
}

/**
 * Velden die bij hergebruik van een afgewezen inschrijving terug naar de beginstand gaan, zodat
 * de nieuwe inschrijving niet de status, links of datums van de oude erft.
 */
export const HERINSCHRIJVING_RESET = {
  onboarding_status: "nieuw",
  onboarding_step: 0,
  onboarding_auto: true,
  documenten_compleet: false,
  goedgekeurd_op: null,
  inzetbaar_op: null,
  onboarding_portal_token: null,
  onboarding_portal_token_expires_at: null,
  documenten_verzoek_verstuurd_op: null,
  documenten_reminder_verstuurd_op: null,
  intake_bevestiging_verstuurd_op: null,
  welkom_mail_verstuurd_op: null,
  ai_screening_score: null,
} as const;

/** Kleinste reset (kolommen die zeker bestaan) als een kolom uit HERINSCHRIJVING_RESET ontbreekt. */
export const HERINSCHRIJVING_RESET_BASIS = {
  onboarding_status: "nieuw",
  documenten_compleet: false,
  goedgekeurd_op: null,
  inzetbaar_op: null,
  onboarding_portal_token: null,
  onboarding_portal_token_expires_at: null,
  documenten_verzoek_verstuurd_op: null,
} as const;

/** Notitie op documenten van een vorige, afgewezen inschrijving (die tellen niet meer mee). */
export const VORIGE_INSCHRIJVING_NOTITIE = "Van een eerdere (afgewezen) inschrijving; telt niet mee voor de nieuwe.";
