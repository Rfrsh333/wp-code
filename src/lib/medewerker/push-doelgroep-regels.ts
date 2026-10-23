import { afstandKm, type Coordinaat } from "@/lib/locatie/locatie-regels";
import { beschikbaarVoorDienst } from "@/lib/medewerker/beschikbaarheid";
import { richtlijnVoorFunctie } from "@/lib/pricing/richtlijntarieven";

/**
 * Wie krijgt de push "Nieuwe dienst beschikbaar"? Pure regels (stap 3), getest in
 * tests/unit/push-doelgroep-regels.spec.ts. De DB-kant staat in lib/medewerker/push-doelgroep.ts.
 *
 * Voorheen kreeg ELKE medewerker met een pushabonnement elke nieuwe dienst. Nu alleen een actieve
 * medewerker uit dezelfde wereld (echt of demo, lib/demo-regels.ts) bij wie dit alles klopt:
 *   a. de functie past (zelfde functie of functiegroep; ruim bij een onbekende functie);
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
  eindTijd?: string | null;
  /** Hoort de dienst bij een demo-klant? */
  demo: boolean;
  locatie: Coordinaat | null;
  /** Maandag van de dienstweek, voor de override (lib/medewerker/beschikbaarheid.maandagVan). */
  weekStart?: string | null;
};

export type GeenPushReden = "niet_actief" | "andere_wereld" | "functie" | "verborgen" | "beschikbaarheid" | "afstand";

/**
 * Functiegroep: medewerkers hebben in de praktijk één van de vier hoofdfuncties (bediening, bar,
 * keuken, afwas: lib/candidate-to-medewerker.ts en het admin-formulier), diensten de vrije functies
 * uit platform_options (bv. "bartending", "hulpkok", "spoelkeuken medewerker"). Beide kanten gaan
 * naar dezelfde groep. Runner, gastheer/gastvrouw en hosting vallen onder bediening.
 */
type FunctieGroep = "bediening" | "bar" | "keuken" | "afwas";

const FUNCTIEGROEPEN: Record<FunctieGroep, readonly string[]> = {
  bediening: [
    "bediening", "ober", "serveerster", "serveerder", "ober/serveerster", "bedieningsmedewerker", "runner",
    "gastheer", "gastvrouw", "gastheer/gastvrouw", "gastheer / gastvrouw", "host", "hostess", "host(ess)", "hosting",
    "event staff", "evenement medewerker", "evenementmedewerker",
  ],
  bar: ["bar", "barista", "bartender", "bartending", "barmedewerker", "barkeeper"],
  keuken: ["keuken", "kok", "hulpkok", "keukenhulp", "zelfstandig werkend kok", "chef", "sous-chef", "souschef"],
  afwas: ["afwas", "afwasser", "spoelkeuken", "spoelkeuken medewerker", "afwas / spoelkeuken"],
};

const GROEP_PER_FUNCTIE = new Map<string, FunctieGroep>(
  (Object.entries(FUNCTIEGROEPEN) as [FunctieGroep, readonly string[]][]).flatMap(([groep, namen]) => namen.map((n) => [n, groep] as const)),
);

function schoon(functie: string): string {
  return functie.trim().toLowerCase().replace(/\s+/g, " ");
}

/** Groep van een functienaam, of null als we hem niet kennen (dan filteren we er niet op). */
export function functieGroep(functie: string | null | undefined): FunctieGroep | null {
  if (typeof functie !== "string" || !functie.trim()) return null;
  const f = schoon(functie);
  const direct = GROEP_PER_FUNCTIE.get(f);
  if (direct) return direct;
  // Synoniemen van de richtlijntarieven (bv. "afwas / spoelkeuken"); hun sleutels staan hierboven.
  const sleutel = richtlijnVoorFunctie(f)?.functie;
  return sleutel ? GROEP_PER_FUNCTIE.get(sleutel) ?? null : null;
}

/**
 * Past de dienstfunctie bij de functies van de medewerker? Gelijk (hoofdletterongevoelig) of dezelfde
 * functiegroep. Ruim waar we het niet weten, zodat niemand onterecht een melding mist:
 * - een dienst zonder functie, of met een functie buiten de vier groepen (bv. "catering",
 *   "garderobe"), past bij iedereen;
 * - een medewerker zonder functie past bij elke dienst.
 */
export function functiePast(medewerkerFuncties: string | string[] | null | undefined, dienstFunctie: string | null | undefined): boolean {
  const dienst = typeof dienstFunctie === "string" ? schoon(dienstFunctie) : "";
  if (!dienst) return true;
  const lijst = (Array.isArray(medewerkerFuncties) ? medewerkerFuncties : [medewerkerFuncties])
    .filter((f): f is string => typeof f === "string" && f.trim().length > 0)
    .map(schoon);
  if (lijst.length === 0) return true;
  if (lijst.includes(dienst)) return true;
  const groep = functieGroep(dienst);
  if (!groep) return true;
  return lijst.some((f) => functieGroep(f) === groep);
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
    eindTijd: d.eindTijd,
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
