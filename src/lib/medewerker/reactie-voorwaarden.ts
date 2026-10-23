import { supabaseAdmin } from "@/lib/supabase";
import { isOntbrekendeKolom } from "@/lib/db-kolom-fallback";

/**
 * DB-kant van "uitgebreid reageren": de voorwaarden per aanmelding (tegenbod, eigen tijden,
 * motivatie, kleding-akkoord, automatisch intrekken) en de nieuwe dienstvelden (kledingvoorschrift,
 * pauze) apart ophalen, los van de bestaande selects.
 *
 * Waarom apart: zolang migratie 20261023_uitgebreid_reageren.sql niet gedraaid is, zou elke select
 * met die kolommen 42703 geven en de hele route breken. Deze functies geven dan een lege Map
 * (= overal het tarief en de tijden van de dienst, zoals voorheen). Een andere databasefout gooien
 * ze wel door: liever een 500 dan een factuur of verdienste met het verkeerde tarief.
 * De rekenregels zelf staan puur in lib/medewerker/reactie-regels.ts.
 */

export const VOORWAARDEN_KOLOMMEN =
  "voorgesteld_uurtarief, voorgestelde_start_tijd, voorgestelde_eind_tijd, motivatie, kleding_akkoord_op, auto_intrekken_uren, annuleer_reden";

export const DIENST_EXTRA_KOLOMMEN = "kledingvoorschrift, pauze_minuten";

export type AanmeldingVoorwaarden = {
  voorgesteld_uurtarief: number | null;
  voorgestelde_start_tijd: string | null;
  voorgestelde_eind_tijd: string | null;
  motivatie: string | null;
  kleding_akkoord_op: string | null;
  auto_intrekken_uren: number | null;
  annuleer_reden: string | null;
};

export type DienstExtras = { kledingvoorschrift: string | null; pauze_minuten: number | null };

/** PostgREST-blokken klein houden: lange .in()-lijsten lopen tegen de URL-limiet aan. */
const BLOK = 150;

const getal = (v: unknown): number | null => {
  if (v == null || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};
const tekst = (v: unknown): string | null => (typeof v === "string" && v !== "" ? v : null);

async function inBlokken<T>(
  ids: readonly (string | null | undefined)[],
  haal: (blok: string[]) => PromiseLike<{ data: unknown[] | null; error: { code?: string | null; message?: string | null } | null }>,
  zet: (rij: Record<string, unknown>) => [string, T],
): Promise<Map<string, T>> {
  const uniek = [...new Set(ids.filter((id): id is string => typeof id === "string" && id.length > 0))];
  const resultaat = new Map<string, T>();
  for (let i = 0; i < uniek.length; i += BLOK) {
    const { data, error } = await haal(uniek.slice(i, i + BLOK));
    if (isOntbrekendeKolom(error)) return new Map(); // migratie nog niet gedraaid
    if (error) throw error;
    for (const rij of (data ?? []) as Record<string, unknown>[]) {
      const [id, waarde] = zet(rij);
      resultaat.set(id, waarde);
    }
  }
  return resultaat;
}

/** Zet een (deel van een) rij uit dienst_aanmeldingen om naar AanmeldingVoorwaarden. */
export function naarVoorwaarden(rij: Record<string, unknown> | null | undefined): AanmeldingVoorwaarden {
  return {
    voorgesteld_uurtarief: getal(rij?.voorgesteld_uurtarief),
    voorgestelde_start_tijd: tekst(rij?.voorgestelde_start_tijd),
    voorgestelde_eind_tijd: tekst(rij?.voorgestelde_eind_tijd),
    motivatie: tekst(rij?.motivatie),
    kleding_akkoord_op: tekst(rij?.kleding_akkoord_op),
    auto_intrekken_uren: getal(rij?.auto_intrekken_uren),
    annuleer_reden: tekst(rij?.annuleer_reden),
  };
}

/** Voorwaarden per aanmelding-id. Leeg zonder migratie. */
export async function haalVoorwaarden(aanmeldingIds: readonly (string | null | undefined)[]): Promise<Map<string, AanmeldingVoorwaarden>> {
  return inBlokken(
    aanmeldingIds,
    (blok) => supabaseAdmin.from("dienst_aanmeldingen").select(`id, ${VOORWAARDEN_KOLOMMEN}`).in("id", blok),
    (rij) => [rij.id as string, naarVoorwaarden(rij)],
  );
}

/** Kledingvoorschrift en pauze per dienst-id. Leeg zonder migratie. */
export async function haalDienstExtras(dienstIds: readonly (string | null | undefined)[]): Promise<Map<string, DienstExtras>> {
  return inBlokken(
    dienstIds,
    (blok) => supabaseAdmin.from("diensten").select(`id, ${DIENST_EXTRA_KOLOMMEN}`).in("id", blok),
    (rij) => [rij.id as string, { kledingvoorschrift: tekst(rij.kledingvoorschrift)?.trim() || null, pauze_minuten: getal(rij.pauze_minuten) }],
  );
}

/** Lege extras (dienst zonder kledingvoorschrift en pauze). */
export const GEEN_EXTRAS: DienstExtras = { kledingvoorschrift: null, pauze_minuten: null };
