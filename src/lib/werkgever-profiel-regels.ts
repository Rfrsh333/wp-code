/**
 * Pure rekenregels voor het werkgeversprofiel (stap 4 "Vertrouwen zoals YoungOnes"). Geen database
 * hier, zodat alles los te testen is (tests/unit/werkgever-profiel-regels.spec.ts); de queries staan
 * in lib/werkgever-profiel.ts.
 *
 * Kengetallen over een werkgever (klant), zoals een medewerker ze ziet:
 *   gemiddelde / aantal     sterren van medewerkers na een afgeronde dienst (verborgen = niet meegeteld)
 *   kiest_binnen_uren       mediaan van aanmelding → beslissing (geaccepteerd of afgewezen) door de
 *                           werkgever, over beslissingen in de laatste 90 dagen
 *   kies_percentage         van de afgelopen diensten (laatste 90 dagen) met minstens één reactie:
 *                           in hoeveel procent is iemand gekozen
 *   betaalt_binnen_dagen    altijd null: een factuur krijgt alleen de status "betaald", zonder datum
 *                           (api/facturen/[id]/betaald), dus de betaaltermijn is niet vast te stellen
 *
 * Elk kengetal is pas zichtbaar vanaf MIN_WAARNEMINGEN waarnemingen; anders null. De UI toont dan
 * "Nog te weinig gegevens" (of niets). `aantal` is altijd het echte aantal beoordelingen.
 */

export const MIN_WAARNEMINGEN = 3;
export const PROFIEL_PERIODE_DAGEN = 90;

/**
 * Een "beslissing" binnen zoveel seconden na de aanmelding is geen keuze van de werkgever: TopTalent
 * plant bij een spoeddienst direct in (aangemeld_at en beoordeeld_at in dezelfde insert).
 */
export const DIRECT_INGEPLAND_SECONDEN = 5;

export const DEELSCORES = ["instructies", "sfeer", "zoals_beschreven"] as const;
export type Deelscore = (typeof DEELSCORES)[number];

/** Kolom in werkgever_beoordelingen per deelscore. */
export const DEELSCORE_KOLOM = {
  instructies: "score_instructies",
  sfeer: "score_sfeer",
  zoals_beschreven: "score_zoals_beschreven",
} as const satisfies Record<Deelscore, string>;

/** Vraag bij het beoordelen en label in de overzichten. */
export const DEELSCORE_LABEL: Record<Deelscore, string> = {
  instructies: "Duidelijke instructies",
  sfeer: "Sfeer en behandeling",
  zoals_beschreven: "Werk zoals beschreven",
};

/** Een geldige score is een geheel getal van 1 tot en met 5. */
export function isGeldigeScore(v: unknown): v is number {
  return typeof v === "number" && Number.isInteger(v) && v >= 1 && v <= 5;
}

export function mediaan(waarden: readonly number[]): number | null {
  if (waarden.length === 0) return null;
  const s = [...waarden].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 === 1 ? s[m] : (s[m - 1] + s[m]) / 2;
}

const opEen = (n: number) => Math.round(n * 10) / 10;

// ---------------------------------------------------------------------------------------------
// Beoordelingen
// ---------------------------------------------------------------------------------------------

export type BeoordelingRij = {
  score: number | null;
  score_instructies?: number | null;
  score_sfeer?: number | null;
  score_zoals_beschreven?: number | null;
  verborgen_op?: string | null;
};

export type ScoreSamenvatting = {
  /** Gemiddelde (1 decimaal), null onder MIN_WAARNEMINGEN. */
  gemiddelde: number | null;
  aantal: number;
  deelscores: Record<Deelscore, number | null>;
  aantal_deelscores: Record<Deelscore, number>;
};

function gemiddeldeVanaf(waarden: number[]): number | null {
  if (waarden.length < MIN_WAARNEMINGEN) return null;
  return opEen(waarden.reduce((a, b) => a + b, 0) / waarden.length);
}

/** Gemiddelde, aantal en deelscores. Verborgen (gemodereerde) en ongeldige rijen tellen niet mee. */
export function scoreSamenvatting(rijen: readonly BeoordelingRij[]): ScoreSamenvatting {
  const zichtbaar = rijen.filter((r) => !r.verborgen_op && isGeldigeScore(r.score));
  const scores = zichtbaar.map((r) => r.score as number);
  const deelscores = {} as Record<Deelscore, number | null>;
  const aantalDeelscores = {} as Record<Deelscore, number>;
  for (const d of DEELSCORES) {
    const waarden = zichtbaar.map((r) => r[DEELSCORE_KOLOM[d]]).filter(isGeldigeScore);
    deelscores[d] = gemiddeldeVanaf(waarden);
    aantalDeelscores[d] = waarden.length;
  }
  return { gemiddelde: gemiddeldeVanaf(scores), aantal: scores.length, deelscores, aantal_deelscores: aantalDeelscores };
}

// ---------------------------------------------------------------------------------------------
// "Kiest meestal binnen X"
// ---------------------------------------------------------------------------------------------

export type BeslisRij = { aangemeld_at: string | null; beoordeeld_at: string | null };

/**
 * Mediaan (uren, 1 decimaal) van aanmelding → beslissing, over beslissingen in de laatste
 * `periodeDagen`. Directe inplanning (≤ DIRECT_INGEPLAND_SECONDEN) en onzin (beslissing vóór de
 * aanmelding, in de toekomst of ongeldige datum) tellen niet mee.
 */
export function kiestBinnen(
  rijen: readonly BeslisRij[],
  nu: Date = new Date(),
  periodeDagen: number = PROFIEL_PERIODE_DAGEN,
): { uren: number | null; aantal: number } {
  const grens = nu.getTime() - periodeDagen * 24 * 60 * 60 * 1000;
  const duren: number[] = [];
  for (const r of rijen) {
    if (!r.aangemeld_at || !r.beoordeeld_at) continue;
    const a = new Date(r.aangemeld_at).getTime();
    const b = new Date(r.beoordeeld_at).getTime();
    if (!Number.isFinite(a) || !Number.isFinite(b)) continue;
    if (b < grens || b > nu.getTime()) continue;
    if (b - a <= DIRECT_INGEPLAND_SECONDEN * 1000) continue;
    duren.push((b - a) / (60 * 60 * 1000));
  }
  const m = duren.length >= MIN_WAARNEMINGEN ? mediaan(duren) : null;
  return { uren: m == null ? null : opEen(m), aantal: duren.length };
}

// ---------------------------------------------------------------------------------------------
// "Kiest in X% van de diensten iemand"
// ---------------------------------------------------------------------------------------------

/** Statussen waarbij de werkgever (of TopTalent namens hem) deze medewerker heeft gekozen. */
export const GEKOZEN_STATUSSEN = ["geaccepteerd", "bevestigd", "voltooid", "vervanging_gezocht", "vervangen"] as const;

/** Uitnodigingen en aanbiedingen die nog openstaan zijn geen reactie van een medewerker. */
export const GEEN_REACTIE_STATUSSEN = ["uitgenodigd", "aangeboden"] as const;

export type ReactieRij = { dienst_id: string; status: string | null; beoordeeld_at?: string | null };

/** Gekozen, ook als de medewerker na de keuze zelf heeft afgezegd (geannuleerd met beslismoment). */
export function isGekozen(r: Pick<ReactieRij, "status" | "beoordeeld_at">): boolean {
  if ((GEKOZEN_STATUSSEN as readonly string[]).includes(r.status ?? "")) return true;
  return r.status === "geannuleerd" && !!r.beoordeeld_at;
}

/**
 * Van de diensten `dienstIds` (afgelopen diensten in de periode) tellen alleen die met minstens één
 * reactie. Percentage (geheel getal) daarvan waarin iemand gekozen is; null onder MIN_WAARNEMINGEN.
 */
export function kiesPercentage(
  dienstIds: readonly string[],
  reacties: readonly ReactieRij[],
): { percentage: number | null; aantal: number } {
  const perDienst = new Map<string, { reactie: boolean; gekozen: boolean }>();
  for (const id of dienstIds) perDienst.set(id, { reactie: false, gekozen: false });
  for (const r of reacties) {
    const d = perDienst.get(r.dienst_id);
    if (!d) continue;
    if ((GEEN_REACTIE_STATUSSEN as readonly string[]).includes(r.status ?? "")) continue;
    d.reactie = true;
    if (isGekozen(r)) d.gekozen = true;
  }
  const metReactie = [...perDienst.values()].filter((d) => d.reactie);
  const gekozen = metReactie.filter((d) => d.gekozen).length;
  return {
    percentage: metReactie.length >= MIN_WAARNEMINGEN ? Math.round((100 * gekozen) / metReactie.length) : null,
    aantal: metReactie.length,
  };
}

// ---------------------------------------------------------------------------------------------
// Profiel
// ---------------------------------------------------------------------------------------------

/** Compact profiel in de dienstdata (shifts/beschikbaar en het overzicht). */
export type WerkgeverProfielCompact = {
  gemiddelde: number | null;
  aantal: number;
  kiest_binnen_uren: number | null;
  kies_percentage: number | null;
  /** Altijd null: TopTalent legt geen betaaldatum vast (zie de toelichting bovenaan). */
  betaalt_binnen_dagen: number | null;
};

/** Volledig profiel: compact + deelscores + het aantal waarnemingen achter elk kengetal. */
export type WerkgeverProfielKern = WerkgeverProfielCompact & {
  deelscores: Record<Deelscore, number | null>;
  waarnemingen: {
    beoordelingen: number;
    deelscores: Record<Deelscore, number>;
    beslissingen: number;
    diensten_met_reactie: number;
  };
  minimum_waarnemingen: number;
  periode_dagen: number;
  /** false zolang de tabel werkgever_beoordelingen niet bestaat (migratie niet gedraaid). */
  beoordelingen_beschikbaar: boolean;
};

export function bouwWerkgeverProfiel(input: {
  beoordelingen: readonly BeoordelingRij[];
  beslissingen: readonly BeslisRij[];
  dienstIds: readonly string[];
  reacties: readonly ReactieRij[];
  beoordelingenBeschikbaar?: boolean;
  nu?: Date;
}): WerkgeverProfielKern {
  const scores = scoreSamenvatting(input.beoordelingen);
  const kiest = kiestBinnen(input.beslissingen, input.nu ?? new Date());
  const kies = kiesPercentage(input.dienstIds, input.reacties);
  return {
    gemiddelde: scores.gemiddelde,
    aantal: scores.aantal,
    kiest_binnen_uren: kiest.uren,
    kies_percentage: kies.percentage,
    betaalt_binnen_dagen: null,
    deelscores: scores.deelscores,
    waarnemingen: {
      beoordelingen: scores.aantal,
      deelscores: scores.aantal_deelscores,
      beslissingen: kiest.aantal,
      diensten_met_reactie: kies.aantal,
    },
    minimum_waarnemingen: MIN_WAARNEMINGEN,
    periode_dagen: PROFIEL_PERIODE_DAGEN,
    beoordelingen_beschikbaar: input.beoordelingenBeschikbaar ?? true,
  };
}

export const LEEG_PROFIEL: WerkgeverProfielKern = bouwWerkgeverProfiel({
  beoordelingen: [],
  beslissingen: [],
  dienstIds: [],
  reacties: [],
  beoordelingenBeschikbaar: false,
});

export function compactProfiel(p: WerkgeverProfielCompact): WerkgeverProfielCompact {
  return {
    gemiddelde: p.gemiddelde,
    aantal: p.aantal,
    kiest_binnen_uren: p.kiest_binnen_uren,
    kies_percentage: p.kies_percentage,
    betaalt_binnen_dagen: p.betaalt_binnen_dagen,
  };
}

/** Heeft het profiel iets om te tonen? Zo niet: "Nog te weinig gegevens". */
export function heeftKengetallen(p: WerkgeverProfielCompact | null | undefined): boolean {
  return !!p && (p.gemiddelde != null || p.kiest_binnen_uren != null || p.kies_percentage != null || p.betaalt_binnen_dagen != null);
}

// ---------------------------------------------------------------------------------------------
// Teksten (webportaal; de app volgt dezelfde afronding)
// ---------------------------------------------------------------------------------------------

/** 4.25 → "4,3". */
export function scoreTekst(gemiddelde: number): string {
  return gemiddelde.toFixed(1).replace(".", ",");
}

/**
 * "binnen een uur" / "binnen 6 uur" / "binnen 1 dag" / "binnen 3 dagen". Altijd naar boven
 * afgerond: "binnen" moet kloppen.
 */
export function kiestBinnenTekst(uren: number | null | undefined): string | null {
  if (uren == null || !Number.isFinite(uren) || uren < 0) return null;
  if (uren < 1) return "binnen een uur";
  if (uren < 24) return `binnen ${Math.ceil(uren)} uur`;
  const dagen = Math.ceil(uren / 24);
  return dagen === 1 ? "binnen 1 dag" : `binnen ${dagen} dagen`;
}
