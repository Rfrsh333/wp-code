import { INGEPLAND_STATUSSEN } from "@/lib/dienst-status";
import { nlDatumKort, plusDagen } from "@/lib/nl-tijd";
import { dienstEindMoment } from "@/lib/medewerker/uren-regels";
import { DEELSCORE_KOLOM, DEELSCORES, isGeldigeScore } from "@/lib/werkgever-profiel-regels";

/**
 * Pure regels voor "medewerker beoordeelt werkgever" (stap 4 "Vertrouwen zoals YoungOnes"). Getest in
 * tests/unit/werkgever-beoordeling-regels.spec.ts; de DB-kant staat in lib/medewerker/werkgever-beoordeling.ts.
 *
 * Een dienst is "afgerond" voor deze medewerker (en dus te beoordelen) als:
 *   - hij er uren voor heeft ingediend (ook als ze daarna zijn aangepast, goedgekeurd of
 *     gefactureerd), of
 *   - hij ingepland stond (geaccepteerd/bevestigd, of al voltooid) en de dienst voorbij is
 *     (eindtijd in NL-tijd; eind ≤ start = nachtdienst tot de volgende dag).
 * Een geannuleerde dienst is nooit afgerond. Beoordelen kan tot BEOORDEEL_TERMIJN_DAGEN na de
 * dienstdatum, één keer per medewerker per dienst (unieke index in de database).
 */

export const BEOORDEEL_TERMIJN_DAGEN = 14;

/** De herinnering ("Hoe was het bij X?") gaat alleen over diensten van de laatste dagen. */
export const HERINNERING_DAGEN = 3;

export const OPMERKING_MAX = 500;

/** Aanmeldingsstatussen waarbij de medewerker ingepland stond. */
export const BEOORDEELBARE_AANMELD_STATUSSEN = [...INGEPLAND_STATUSSEN, "voltooid"] as const;

/** Uren-statussen die betekenen: de medewerker heeft uren ingediend. */
export const UREN_INGEDIEND_STATUSSEN = ["ingediend", "klant_aangepast", "klant_goedgekeurd", "goedgekeurd", "gefactureerd"] as const;

export type AfgerondInvoer = {
  aanmelding_status: string | null;
  uren_statussen: readonly (string | null | undefined)[];
  dienst: { datum: string | null; start_tijd: string | null; eind_tijd: string | null; status?: string | null };
};

export function isAfgerondVoorBeoordeling(inv: AfgerondInvoer, nu: Date = new Date()): boolean {
  const d = inv.dienst;
  if (d.status === "geannuleerd") return false;
  if (inv.uren_statussen.some((s) => (UREN_INGEDIEND_STATUSSEN as readonly string[]).includes(s ?? ""))) return true;
  if (!(BEOORDEELBARE_AANMELD_STATUSSEN as readonly string[]).includes(inv.aanmelding_status ?? "")) return false;
  if (!d.datum || !d.start_tijd || !d.eind_tijd) return false;
  return dienstEindMoment(d.datum, d.start_tijd, d.eind_tijd).getTime() <= nu.getTime();
}

/** Laatste dag (YYYY-MM-DD) waarop de dienst van `datum` nog te beoordelen is. */
export function beoordelenTot(datum: string): string {
  return plusDagen(datum, BEOORDEEL_TERMIJN_DAGEN);
}

/** Valt de dienstdatum binnen de beoordeeltermijn (vandaag = NL-datum)? */
export function binnenBeoordeelTermijn(datum: string | null | undefined, vandaag: string): boolean {
  return !!datum && datum <= vandaag && vandaag <= beoordelenTot(datum);
}

// ---------------------------------------------------------------------------------------------
// Invoer van de medewerker
// ---------------------------------------------------------------------------------------------

export type WerkgeverBeoordelingInvoer = {
  score: number;
  score_instructies: number | null;
  score_sfeer: number | null;
  score_zoals_beschreven: number | null;
  /** Alleen voor TopTalent; de werkgever ziet dit nooit. */
  opmerking: string | null;
};

export type ParseResultaat = { ok: true; waarde: WerkgeverBeoordelingInvoer } | { ok: false; fout: string; veld: string };

/** "4", 4 en 4.0 zijn 4; leeg (null/undefined/"") is "niet ingevuld". */
function leesScore(v: unknown): number | null | "ongeldig" {
  if (v === null || v === undefined || v === "") return null;
  const n = typeof v === "string" ? Number(v.trim()) : v;
  return isGeldigeScore(n) ? n : "ongeldig";
}

/**
 * Body van POST /api/medewerker/werkgever-beoordelingen:
 *   { score: 1-5, score_instructies?, score_sfeer?, score_zoals_beschreven? (1-5 of null), opmerking? }
 * De dienst (dienst_id of aanmelding_id) leest de route zelf.
 */
export function parseWerkgeverBeoordeling(body: unknown): ParseResultaat {
  const b = (body && typeof body === "object" ? body : {}) as Record<string, unknown>;
  const score = leesScore(b.score);
  if (score === null || score === "ongeldig") return { ok: false, fout: "Geef 1 tot 5 sterren.", veld: "score" };

  const deel: Partial<Record<(typeof DEELSCORE_KOLOM)[keyof typeof DEELSCORE_KOLOM], number | null>> = {};
  for (const d of DEELSCORES) {
    const kolom = DEELSCORE_KOLOM[d];
    const v = leesScore(b[kolom]);
    if (v === "ongeldig") return { ok: false, fout: "Een deelscore is 1 tot 5 sterren, of leeg.", veld: kolom };
    deel[kolom] = v;
  }

  let opmerking: string | null = null;
  if (b.opmerking !== undefined && b.opmerking !== null) {
    if (typeof b.opmerking !== "string") return { ok: false, fout: "De opmerking moet tekst zijn.", veld: "opmerking" };
    // Stuurtekens weg (behalve regeleinden), witruimte aan de randen weg.
    const schoon = b.opmerking.replace(/[\u0000-\u0009\u000B-\u001F\u007F]/g, "").trim();
    if (schoon.length > OPMERKING_MAX) {
      return { ok: false, fout: `De opmerking is te lang (max. ${OPMERKING_MAX} tekens).`, veld: "opmerking" };
    }
    opmerking = schoon || null;
  }

  return {
    ok: true,
    waarde: {
      score,
      score_instructies: deel.score_instructies ?? null,
      score_sfeer: deel.score_sfeer ?? null,
      score_zoals_beschreven: deel.score_zoals_beschreven ?? null,
      opmerking,
    },
  };
}

// ---------------------------------------------------------------------------------------------
// Herinnering
// ---------------------------------------------------------------------------------------------

/** Link in de push; het webportaal opent dan direct het beoordeelscherm (de app volgt hetzelfde pad). */
export function beoordeelUrl(dienstId: string): string {
  return `/medewerker/diensten/?tab=voltooid&beoordeel=${encodeURIComponent(dienstId)}`;
}

export function herinneringPush(input: { dienstId: string; klantNaam: string | null; datum: string; functie: string | null }) {
  const naam = input.klantNaam?.trim() || "je werkgever";
  const wat = input.functie ? `je dienst als ${input.functie.toLowerCase()}` : "je dienst";
  return {
    title: `Hoe was het bij ${naam}?`,
    body: `Geef ${wat} van ${nlDatumKort(input.datum)} een beoordeling. De werkgever ziet niet wie wat gaf.`,
    url: beoordeelUrl(input.dienstId),
    tag: `werkgever-beoordeling-${input.dienstId}`,
  };
}
