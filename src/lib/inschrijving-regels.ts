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
