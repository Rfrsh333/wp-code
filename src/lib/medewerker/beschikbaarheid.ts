/**
 * Eén dagnotatie voor beschikbaarheid: de korte sleutels die de matching gebruikt
 * (`ma`…`zo`, zie lib/matching.ts). De Beschikbaarheid-pagina sloeg voorheen `Maandag`…
 * `Zondag` op, waardoor de matching niemand als beschikbaar zag. Bij lezen accepteren we
 * beide (en kleine letters), bij opslaan schrijven we altijd de korte sleutels.
 */

export const DAG_SLEUTELS = ["ma", "di", "wo", "do", "vr", "za", "zo"] as const;
export type DagSleutel = (typeof DAG_SLEUTELS)[number];

export const DAG_LABELS: Record<DagSleutel, string> = {
  ma: "Maandag",
  di: "Dinsdag",
  wo: "Woensdag",
  do: "Donderdag",
  vr: "Vrijdag",
  za: "Zaterdag",
  zo: "Zondag",
};

const ALIASSEN: Record<string, DagSleutel> = {
  ...Object.fromEntries(DAG_SLEUTELS.map((k) => [k, k])),
  ...Object.fromEntries(DAG_SLEUTELS.map((k) => [DAG_LABELS[k].toLowerCase(), k])),
};

export function dagSleutel(naam: string): DagSleutel | null {
  return ALIASSEN[naam.trim().toLowerCase()] ?? null;
}

export type Weekbeschikbaarheid = Record<DagSleutel, string[]>;

/**
 * Zet opgeslagen beschikbaarheid (oude of nieuwe notatie) om naar korte sleutels.
 * Geeft null als er geen object is (bv. de vrije tekst uit het inschrijfformulier), zodat
 * de matching zijn bestaande "geen gegevens"-pad blijft volgen.
 */
export function normaliseerBeschikbaarheid(raw: unknown): Weekbeschikbaarheid | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const uit = Object.fromEntries(DAG_SLEUTELS.map((k) => [k, [] as string[]])) as Weekbeschikbaarheid;
  for (const [naam, waarde] of Object.entries(raw as Record<string, unknown>)) {
    const sleutel = dagSleutel(naam);
    if (!sleutel || !Array.isArray(waarde)) continue;
    for (const blok of waarde) {
      if (typeof blok === "string" && blok && !uit[sleutel].includes(blok)) uit[sleutel].push(blok);
    }
  }
  return uit;
}

/** Tijdsblokken die de Beschikbaarheid-pagina aanbiedt (`hele_dag` komt uit oudere data). */
export const TIJDBLOKKEN = ["ochtend", "middag", "avond", "nacht", "hele_dag"] as const;

/** Dagsleutel (ma…zo) van een kalenderdatum YYYY-MM-DD, los van de tijdzone. */
export function dagSleutelVanDatum(datum: string): DagSleutel | null {
  const [y, m, d] = datum.split("-").map(Number);
  const t = new Date(Date.UTC(y, (m || 1) - 1, d || 1));
  if (Number.isNaN(t.getTime())) return null;
  // getUTCDay: 0 = zondag.
  return (["zo", "ma", "di", "wo", "do", "vr", "za"] as const)[t.getUTCDay()];
}

/** Maandag (YYYY-MM-DD) van de week waarin `datum` valt: de sleutel van een weekoverride. */
export function maandagVan(datum: string): string | null {
  const [y, m, d] = datum.split("-").map(Number);
  const t = new Date(Date.UTC(y, (m || 1) - 1, d || 1));
  if (Number.isNaN(t.getTime())) return null;
  const terug = (t.getUTCDay() + 6) % 7;
  t.setUTCDate(t.getUTCDate() - terug);
  return t.toISOString().slice(0, 10);
}

/**
 * Tijdsblokken waar een dienst met deze begintijd onder valt. Zelfde indeling als de matching
 * (lib/matching.ts: voor 12 uur ochtend, voor 17 uur middag, anders avond), plus `nacht` voor een
 * begintijd vanaf 22 uur of voor 6 uur (dat blok bestond in het portaal, maar telde nergens mee).
 */
export function tijdsblokkenVoorStart(startTijd: string): string[] {
  const uur = parseInt(String(startTijd).split(":")[0], 10);
  if (!Number.isFinite(uur)) return [];
  const blok = uur < 12 ? "ochtend" : uur < 17 ? "middag" : "avond";
  return uur >= 22 || uur < 6 ? [blok, "nacht"] : [blok];
}

/**
 * Valt een dienst binnen de beschikbaarheid van een medewerker?
 * - `true` / `false`: de medewerker heeft beschikbaarheid ingevuld en de dienst valt er wel / niet in;
 * - `null`: geen beschikbaarheid ingevuld (geen rooster, alleen vrije tekst, of alle dagen leeg),
 *   de aanroeper beslist dan zelf (de gerichte push stuurt dan wel).
 * Een weekoverride (medewerker_beschikbaarheid_overrides) voor de week van de dienst gaat vóór het
 * vaste rooster; een lege override betekent "die week niet beschikbaar". `beschikbaar_vanaf` na de
 * dienstdatum betekent altijd niet beschikbaar.
 */
export function beschikbaarVoorDienst(input: {
  rooster: unknown;
  override?: unknown;
  beschikbaarVanaf?: string | null;
  datum: string;
  startTijd: string;
}): boolean | null {
  if (input.beschikbaarVanaf && input.datum < input.beschikbaarVanaf.slice(0, 10)) return false;
  const dag = dagSleutelVanDatum(input.datum);
  if (!dag) return null;
  const blokken = tijdsblokkenVoorStart(input.startTijd);

  const override = input.override != null ? normaliseerBeschikbaarheid(input.override) : null;
  const week = override ?? normaliseerBeschikbaarheid(input.rooster);
  if (!week) return null;
  if (!override && DAG_SLEUTELS.every((k) => week[k].length === 0)) return null;
  const vandaag = week[dag];
  return vandaag.includes("hele_dag") || blokken.some((b) => vandaag.includes(b));
}

/** Normaliseer én beperk tot bekende tijdsblokken; voor opslaan vanuit het portaal. */
export function schoneBeschikbaarheid(raw: unknown): Weekbeschikbaarheid | null {
  const genormaliseerd = normaliseerBeschikbaarheid(raw);
  if (!genormaliseerd) return null;
  for (const k of DAG_SLEUTELS) {
    genormaliseerd[k] = genormaliseerd[k].filter((b) => (TIJDBLOKKEN as readonly string[]).includes(b));
  }
  return genormaliseerd;
}
