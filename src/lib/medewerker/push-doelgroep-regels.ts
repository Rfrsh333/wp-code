import { afstandKm, type Coordinaat } from "@/lib/locatie/locatie-regels";
import { beschikbaarVoorDienst } from "@/lib/medewerker/beschikbaarheid";
import { richtlijnVoorFunctie } from "@/lib/pricing/richtlijntarieven";

/**
 * Wie krijgt de push "Nieuwe dienst beschikbaar"? Pure regels (stap 3), getest in
 * tests/unit/push-doelgroep-regels.spec.ts. De DB-kant staat in lib/medewerker/push-doelgroep.ts.
 *
 * Voorheen kreeg ELKE medewerker met een pushabonnement elke nieuwe dienst. Nu alleen een actieve
 * medewerker uit dezelfde wereld (echt of demo, lib/demo-regels.ts) bij wie dit alles klopt:
 *   a. de functie past (zelfde functie of functiegroep; ruim bij een onbekende functie). Past er
 *      voor een dienst niemand, dan geldt a niet (kiesOntvangers: een dienst blijft nooit stil);
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
 * naar dezelfde groep(en). Runner, gastheer/gastvrouw en hosting vallen onder bediening.
 *
 * Barista hoort bij bar én bediening: koffie zetten zit achter de bar, maar in de horeca doet de
 * bediening het vaak (lunchroom, café). Op prod (23-10-2026) zijn er 7 barista-diensten, 1 bar- en
 * 3 bedieningsmedewerkers; alleen "bar" zou bijna iedereen uitsluiten.
 */
type FunctieGroep = "bediening" | "bar" | "keuken" | "afwas";

const FUNCTIEGROEPEN: Record<string, readonly FunctieGroep[]> = Object.fromEntries([
  ...[
    "bediening", "ober", "serveerster", "serveerder", "ober/serveerster", "bedieningsmedewerker", "runner",
    "gastheer", "gastvrouw", "gastheer/gastvrouw", "gastheer / gastvrouw", "host", "hostess", "host(ess)", "hosting",
    "event staff", "evenement medewerker", "evenementmedewerker",
  ].map((n) => [n, ["bediening"]] as const),
  ...["bar", "bartender", "bartending", "barmedewerker", "barkeeper"].map((n) => [n, ["bar"]] as const),
  ["barista", ["bar", "bediening"]] as const,
  ...["keuken", "kok", "hulpkok", "keukenhulp", "zelfstandig werkend kok", "chef", "sous-chef", "souschef"].map((n) => [n, ["keuken"]] as const),
  ...["afwas", "afwasser", "spoelkeuken", "spoelkeuken medewerker", "afwas / spoelkeuken"].map((n) => [n, ["afwas"]] as const),
]);

function schoon(functie: string): string {
  return functie.trim().toLowerCase().replace(/\s+/g, " ");
}

/**
 * Groep(en) van een functienaam; leeg als we hem niet kennen (dan filteren we er niet op), bv.
 * "catering", "sitecrew - hospitality" of "schoonmaak".
 */
export function functieGroepen(functie: string | null | undefined): readonly FunctieGroep[] {
  if (typeof functie !== "string" || !functie.trim()) return [];
  const f = schoon(functie);
  const direct = FUNCTIEGROEPEN[f];
  if (direct) return direct;
  // Synoniemen van de richtlijntarieven (bv. "afwas / spoelkeuken"); hun sleutels staan hierboven.
  const sleutel = richtlijnVoorFunctie(f)?.functie;
  return (sleutel && FUNCTIEGROEPEN[sleutel]) || [];
}

/**
 * Past de dienstfunctie bij de functies van de medewerker? Gelijk (hoofdletterongevoelig) of een
 * gedeelde functiegroep. Ruim waar we het niet weten, zodat niemand onterecht een melding mist:
 * - een dienst zonder functie, of met een functie buiten de groepen (bv. "catering", "schoonmaak"),
 *   past bij iedereen;
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
  const groepen = functieGroepen(dienst);
  if (groepen.length === 0) return true;
  return lijst.some((f) => functieGroepen(f).some((g) => groepen.includes(g)));
}

/**
 * Waarom deze medewerker géén push krijgt voor deze dienst, of null als hij hem wel krijgt.
 * `negeerFunctie`: voor de terugval van kiesOntvangers (alle andere filters blijven gelden).
 */
export function redenGeenPush(m: PushMedewerker, d: PushDienst, opties: { negeerFunctie?: boolean } = {}): GeenPushReden | null {
  if (m.status !== "actief") return "niet_actief";
  if (m.demo !== d.demo) return "andere_wereld";
  if (!opties.negeerFunctie && !functiePast(m.functie, d.functie)) return "functie";
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

export type Ontvangers = {
  ids: string[];
  /** Diensten waarvoor na het functiefilter niemand overbleef en de terugval gold. */
  functieTerugval: number;
  /** Waarom de overige kandidaten geen push kregen (eerste reden, voor de log). */
  redenen: Partial<Record<GeenPushReden, number>>;
};

/**
 * Ontvangers voor één aanvraag (één of meer diensten). Per dienst: iedereen die alle filters
 * doorstaat. Blijft er voor een dienst na het functiefilter niemand over, dan alle medewerkers die
 * de andere filters doorstaan (wereld, actief, verborgen, beschikbaarheid, afstand): zo blijft een
 * nieuwe dienst nooit stil door een functienaam die nergens op aansluit.
 */
export function kiesOntvangers(medewerkers: readonly PushMedewerker[], diensten: readonly PushDienst[]): Ontvangers {
  const gekozen = new Set<string>();
  let functieTerugval = 0;
  for (const d of diensten) {
    const streng = medewerkers.filter((m) => redenGeenPush(m, d) === null);
    if (streng.length > 0) {
      streng.forEach((m) => gekozen.add(m.id));
      continue;
    }
    const ruim = medewerkers.filter((m) => redenGeenPush(m, d, { negeerFunctie: true }) === null);
    if (ruim.length > 0) functieTerugval++;
    ruim.forEach((m) => gekozen.add(m.id));
  }
  const redenen: Partial<Record<GeenPushReden, number>> = {};
  for (const m of medewerkers) {
    if (gekozen.has(m.id) || diensten.length === 0) continue;
    const reden = redenGeenPush(m, diensten[0]) ?? "functie";
    redenen[reden] = (redenen[reden] ?? 0) + 1;
  }
  return { ids: medewerkers.filter((m) => gekozen.has(m.id)).map((m) => m.id), functieTerugval, redenen };
}
