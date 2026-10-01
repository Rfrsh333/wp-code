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

/** Normaliseer én beperk tot bekende tijdsblokken; voor opslaan vanuit het portaal. */
export function schoneBeschikbaarheid(raw: unknown): Weekbeschikbaarheid | null {
  const genormaliseerd = normaliseerBeschikbaarheid(raw);
  if (!genormaliseerd) return null;
  for (const k of DAG_SLEUTELS) {
    genormaliseerd[k] = genormaliseerd[k].filter((b) => (TIJDBLOKKEN as readonly string[]).includes(b));
  }
  return genormaliseerd;
}
