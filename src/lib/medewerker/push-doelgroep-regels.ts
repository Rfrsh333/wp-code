import { afstandKm, type Coordinaat } from "@/lib/locatie/locatie-regels";
import { beschikbaarVoorDienst } from "@/lib/medewerker/beschikbaarheid";
import { richtlijnVoorFunctie } from "@/lib/pricing/richtlijntarieven";

/**
 * Wie krijgt de push "Nieuwe dienst beschikbaar"? Pure regels (stap 3), getest in
 * tests/unit/push-doelgroep-regels.spec.ts. De DB-kant staat in lib/medewerker/push-doelgroep.ts.
 *
 * Voorheen kreeg ELKE medewerker met een pushabonnement elke nieuwe dienst. Nu alleen een actieve
 * medewerker uit dezelfde wereld (echt of demo, lib/demo-regels.ts) bij wie dit alles klopt:
 *   a. de functie past;
 *   b. hij heeft de werkgever niet verborgen;
 *   c. de dienst valt binnen zijn beschikbaarheid, ALS hij die heeft ingevuld (anders wel sturen);
 *   d. de dienst ligt binnen zijn maximale afstand, ALS hij die heeft ingesteld én van beide kanten
 *      een locatie bekend is (anders wel sturen).
 */

export type PushMedewerker = {
  id: string;
  status: string | null;
  /** medewerkers.functie: meestal een lijst, soms (oud) één tekst. */
  functie: string | string[] | null;
  demo: boolean;
  /** Vast weekrooster (inschrijving of medewerker), ruwe opslag. */
  rooster: unknown;
  beschikbaarVanaf: string | null;
  /** Weekoverrides per maandag (YYYY-MM-DD) → ruwe beschikbaarheid. */
  overrides?: ReadonlyMap<string, unknown>;
  locatie: Coordinaat | null;
  maxAfstandKm: number | null;
  /** Klant-ids die deze medewerker heeft verborgen. */
  verborgenKlantIds: ReadonlySet<string>;
};

export type PushDienst = {
  klantId: string | null;
  functie: string | null;
  datum: string;
  startTijd: string;
  /** Hoort de dienst bij een demo-klant? */
  demo: boolean;
  locatie: Coordinaat | null;
  /** Maandag van de dienstweek, voor de override (lib/medewerker/beschikbaarheid.maandagVan). */
  weekStart?: string | null;
};

export type GeenPushReden = "niet_actief" | "andere_wereld" | "functie" | "verborgen" | "beschikbaarheid" | "afstand";

/** Functienaam vergelijkbaar maken: kleine letters, en bekende synoniemen (ober → bediening, barista → bar). */
function functieSleutel(functie: string): string {
  const schoon = functie.trim().toLowerCase();
  return richtlijnVoorFunctie(schoon)?.functie ?? schoon;
}

/**
 * Past de dienstfunctie bij de functies van de medewerker? Hoofdletterongevoelig en via de synoniemen
 * van de richtlijntarieven. Een dienst zonder functie past bij iedereen; een medewerker zonder
 * functie past bij geen dienst met een functie (zoals de matching in lib/matching.ts).
 */
export function functiePast(medewerkerFuncties: string | string[] | null | undefined, dienstFunctie: string | null | undefined): boolean {
  const dienst = typeof dienstFunctie === "string" ? dienstFunctie.trim() : "";
  if (!dienst) return true;
  const lijst = (Array.isArray(medewerkerFuncties) ? medewerkerFuncties : [medewerkerFuncties])
    .filter((f): f is string => typeof f === "string" && f.trim().length > 0)
    .map(functieSleutel);
  return lijst.includes(functieSleutel(dienst));
}

/** Waarom deze medewerker géén push krijgt voor deze dienst, of null als hij hem wel krijgt. */
export function redenGeenPush(m: PushMedewerker, d: PushDienst): GeenPushReden | null {
  if (m.status !== "actief") return "niet_actief";
  if (m.demo !== d.demo) return "andere_wereld";
  if (!functiePast(m.functie, d.functie)) return "functie";
  if (d.klantId && m.verborgenKlantIds.has(d.klantId)) return "verborgen";
  const override = d.weekStart ? m.overrides?.get(d.weekStart) : undefined;
  const beschikbaar = beschikbaarVoorDienst({
    rooster: m.rooster,
    override,
    beschikbaarVanaf: m.beschikbaarVanaf,
    datum: d.datum,
    startTijd: d.startTijd,
  });
  if (beschikbaar === false) return "beschikbaarheid";
  if (m.maxAfstandKm != null && m.locatie && d.locatie && afstandKm(m.locatie, d.locatie) > m.maxAfstandKm) return "afstand";
  return null;
}

/** Krijgt deze medewerker de push voor deze dienst? */
export function moetPushKrijgen(m: PushMedewerker, d: PushDienst): boolean {
  return redenGeenPush(m, d) === null;
}

/** Eén aanvraag kan meerdere diensten hebben (functies): een push als er minstens één past. */
export function moetPushKrijgenVoorEen(m: PushMedewerker, diensten: readonly PushDienst[]): boolean {
  return diensten.some((d) => moetPushKrijgen(m, d));
}
