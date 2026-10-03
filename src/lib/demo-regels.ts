/**
 * Pure regels voor demo-accounts (reviewaccounts voor Apple/Google). Geen database hier, zodat
 * de regels los te testen zijn; de queries staan in lib/demo.ts.
 *
 * Twee gescheiden werelden:
 * - echte klanten en medewerkers zien elkaar, zoals altijd;
 * - demo-klanten en demo-medewerkers zien alleen elkaar.
 * Een dienst hoort bij de wereld van zijn klant (klant_id). Een dienst zonder klant_id is echt.
 */

export type DemoIds = {
  klanten: ReadonlySet<string>;
  medewerkers: ReadonlySet<string>;
  /** E-mailadressen (lowercase) van alle demo-accounts, voor mailfuncties die alleen een adres krijgen. */
  emails: ReadonlySet<string>;
};

export const GEEN_DEMO_IDS: DemoIds = { klanten: new Set(), medewerkers: new Set(), emails: new Set() };

/** Niet-bestaand uuid: `in.()` met een lege lijst is ongeldige PostgREST-syntax. */
export const NIL_UUID = "00000000-0000-0000-0000-000000000000";

export const DEMO_MELDINGEN = {
  factuur:
    "Dit is een demo-account. Facturen worden hier niet echt aangemaakt, zodat er geen factuurnummer wordt verbruikt.",
} as const;

export function isDemoKlantId(ids: DemoIds, klantId: string | null | undefined): boolean {
  return !!klantId && ids.klanten.has(klantId);
}

export function isDemoMedewerkerId(ids: DemoIds, medewerkerId: string | null | undefined): boolean {
  return !!medewerkerId && ids.medewerkers.has(medewerkerId);
}

export function isDemoEmail(ids: DemoIds, email: string | null | undefined): boolean {
  return !!email && ids.emails.has(email.trim().toLowerCase());
}

/** Mag deze medewerker iets met een dienst van deze klant? Alleen binnen dezelfde wereld. */
export function zelfdeWereld(ids: DemoIds, medewerkerId: string, klantId: string | null | undefined): boolean {
  return isDemoMedewerkerId(ids, medewerkerId) === isDemoKlantId(ids, klantId);
}

/** Houdt alleen de ids over die in dezelfde wereld zitten als `demo`. */
export function filterOpWereld(ids: readonly string[], demoSet: ReadonlySet<string>, demo: boolean): string[] {
  return ids.filter((id) => demoSet.has(id) === demo);
}

/**
 * PostgREST-filter voor diensten (kolom klant_id) zodat alleen diensten uit de juiste wereld
 * terugkomen. `null` = geen filter nodig (er zijn geen demo-klanten en de kijker is echt).
 * - demo: alleen diensten van demo-klanten
 * - echt: diensten zonder klant of van een niet-demo-klant (`not.in` alleen zou NULL wegfilteren)
 */
export function dienstenFilter(ids: DemoIds, demo: boolean): { soort: "in"; waarden: string[] } | { soort: "or"; filter: string } | null {
  const klanten = [...ids.klanten];
  if (demo) return { soort: "in", waarden: klanten.length > 0 ? klanten : [NIL_UUID] };
  if (klanten.length === 0) return null;
  return { soort: "or", filter: `klant_id.is.null,klant_id.not.in.(${klanten.join(",")})` };
}
