import { supabaseAdmin } from "@/lib/supabase";
import { haalDemoIds, zelfdeWereld } from "@/lib/demo";
import { nlVandaag, plusDagen } from "@/lib/nl-tijd";
import { isOntbrekendeTabel } from "@/lib/medewerker/werkgever-voorkeuren";
import { isOntbrekendeKolom, type DbFout } from "@/lib/db-kolom-fallback";
import {
  BETAAL_PERIODE_DAGEN,
  bouwWerkgeverProfiel,
  compactProfiel,
  LEEG_PROFIEL,
  PROFIEL_PERIODE_DAGEN,
  type BeoordelingRij,
  type BetaalRij,
  type BeslisRij,
  type ReactieRij,
  type WerkgeverProfielCompact,
  type WerkgeverProfielKern,
} from "@/lib/werkgever-profiel-regels";

/**
 * Werkgeversprofiel uit de database (stap 4 "Vertrouwen zoals YoungOnes"). De rekenregels staan in
 * lib/werkgever-profiel-regels.ts; hier alleen de queries, de demo-scheiding en een korte cache.
 *
 * Bronnen per werkgever (klant_id):
 *   werkgever_beoordelingen   sterren en deelscores (niet verborgen); ontbreekt de tabel → geen sterren
 *   dienst_aanmeldingen       aangemeld_at → beoordeeld_at (beslissingen in de laatste 90 dagen)
 *   diensten + aanmeldingen   afgelopen diensten (laatste 90 dagen) met reacties, en of iemand gekozen is
 *   facturen                  status 'betaald' met betaald_op in de laatste 180 dagen: created_at
 *                             (factuurdatum) → betaald_op. Zonder kolom betaald_op (migratie 20261024
 *                             niet gedraaid) geen betaaltermijn, de rest van het profiel gewoon.
 * Demo-accounts: alleen waarnemingen uit de wereld van de werkgever tellen (lib/demo.ts).
 *
 * De cache (per serverinstantie, 5 minuten) houdt Ontdekken snel: daar staan tot 200 diensten van
 * tientallen werkgevers in één antwoord.
 */

const TTL_MS = 5 * 60_000;
const BLOK = 150;
const cache = new Map<string, { tot: number; profiel: WerkgeverProfielKern }>();

export function vergeetWerkgeverProfiel(klantId: string): void {
  cache.delete(klantId);
}

/** Alleen voor tests. */
export function _resetWerkgeverProfielCache(): void {
  cache.clear();
}

function blokken<T>(lijst: readonly T[]): T[][] {
  const uit: T[][] = [];
  for (let i = 0; i < lijst.length; i += BLOK) uit.push(lijst.slice(i, i + BLOK));
  return uit;
}

/** PostgREST geeft standaard hooguit 1000 rijen per verzoek: pagina voor pagina ophalen. */
const PAGINA = 1000;
const MAX_PAGINAS = 20;
async function allePaginas<T>(
  pagina: (van: number, tot: number) => PromiseLike<{ data: unknown; error: DbFout }>,
): Promise<{ data: T[]; error: DbFout }> {
  const uit: T[] = [];
  for (let p = 0; p < MAX_PAGINAS; p++) {
    const { data, error } = await pagina(p * PAGINA, (p + 1) * PAGINA - 1);
    if (error) return { data: uit, error };
    const rijen = (data ?? []) as T[];
    uit.push(...rijen);
    if (rijen.length < PAGINA) break;
  }
  return { data: uit, error: null };
}

type Een<T> = T | T[] | null | undefined;
const een = <T,>(v: Een<T>): T | null => (Array.isArray(v) ? (v[0] ?? null) : (v ?? null));

async function berekenProfielen(klantIds: string[], nu: Date): Promise<Map<string, WerkgeverProfielKern>> {
  const demoIds = await haalDemoIds();
  const vandaag = nlVandaag();
  const periodeStart = plusDagen(vandaag, -PROFIEL_PERIODE_DAGEN);
  const beslisGrens = new Date(nu.getTime() - PROFIEL_PERIODE_DAGEN * 24 * 60 * 60 * 1000).toISOString();
  const betaalGrens = new Date(nu.getTime() - BETAAL_PERIODE_DAGEN * 24 * 60 * 60 * 1000).toISOString();

  const beoordelingen = new Map<string, BeoordelingRij[]>();
  const beslissingen = new Map<string, BeslisRij[]>();
  const dienstenPerKlant = new Map<string, string[]>();
  const klantVanDienst = new Map<string, string>();
  const reacties = new Map<string, ReactieRij[]>();
  const betalingen = new Map<string, BetaalRij[]>();
  let beoordelingenBeschikbaar = true;

  const voeg = <T,>(m: Map<string, T[]>, k: string, v: T) => {
    const l = m.get(k);
    if (l) l.push(v);
    else m.set(k, [v]);
  };

  for (const blok of blokken(klantIds)) {
    const [b, s, d, f] = await Promise.all([
      allePaginas<BeoordelingRij & { klant_id: string; medewerker_id: string }>((van, tot) =>
        supabaseAdmin
          .from("werkgever_beoordelingen")
          .select("id, klant_id, medewerker_id, score, score_instructies, score_sfeer, score_zoals_beschreven")
          .in("klant_id", blok)
          .is("verborgen_op", null)
          .order("id")
          .range(van, tot),
      ),
      allePaginas<BeslisRij & { medewerker_id: string; dienst: Een<{ klant_id: string }> }>((van, tot) =>
        supabaseAdmin
          .from("dienst_aanmeldingen")
          .select("id, medewerker_id, aangemeld_at, beoordeeld_at, dienst:diensten!inner(klant_id)")
          .in("dienst.klant_id", blok)
          .gte("beoordeeld_at", beslisGrens)
          .order("id")
          .range(van, tot),
      ),
      allePaginas<{ id: string; klant_id: string }>((van, tot) =>
        supabaseAdmin
          .from("diensten")
          .select("id, klant_id")
          .in("klant_id", blok)
          .gte("datum", periodeStart)
          .lt("datum", vandaag)
          .order("id")
          .range(van, tot),
      ),
      allePaginas<{ id: string; klant_id: string; created_at: string | null; betaald_op: string | null }>((van, tot) =>
        supabaseAdmin
          .from("facturen")
          .select("id, klant_id, created_at, betaald_op")
          .in("klant_id", blok)
          .eq("status", "betaald")
          .gte("betaald_op", betaalGrens)
          .order("id")
          .range(van, tot),
      ),
    ]);

    if (isOntbrekendeTabel(b.error)) beoordelingenBeschikbaar = false;
    else if (b.error) throw b.error;
    if (s.error) throw s.error;
    if (d.error) throw d.error;
    if (f.error && !isOntbrekendeKolom(f.error)) throw f.error;

    for (const r of b.data) {
      if (!zelfdeWereld(demoIds, r.medewerker_id, r.klant_id)) continue;
      voeg(beoordelingen, r.klant_id, r);
    }
    for (const r of s.data) {
      const klantId = een(r.dienst)?.klant_id;
      if (!klantId || !zelfdeWereld(demoIds, r.medewerker_id, klantId)) continue;
      voeg(beslissingen, klantId, { aangemeld_at: r.aangemeld_at, beoordeeld_at: r.beoordeeld_at });
    }
    for (const r of d.data) {
      voeg(dienstenPerKlant, r.klant_id, r.id);
      klantVanDienst.set(r.id, r.klant_id);
    }
    // Een factuur hoort bij één werkgever; geen medewerker erbij, dus geen demo-filter nodig.
    for (const r of f.error ? [] : f.data) {
      voeg(betalingen, r.klant_id, { factuur_datum: r.created_at, betaald_op: r.betaald_op });
    }
  }

  for (const blok of blokken([...klantVanDienst.keys()])) {
    const { data, error } = await allePaginas<ReactieRij & { medewerker_id: string }>((van, tot) =>
      supabaseAdmin
        .from("dienst_aanmeldingen")
        .select("id, dienst_id, medewerker_id, status, beoordeeld_at")
        .in("dienst_id", blok)
        .order("id")
        .range(van, tot),
    );
    if (error) throw error;
    for (const r of data) {
      const klantId = klantVanDienst.get(r.dienst_id);
      if (!klantId || !zelfdeWereld(demoIds, r.medewerker_id, klantId)) continue;
      voeg(reacties, klantId, r);
    }
  }

  const uit = new Map<string, WerkgeverProfielKern>();
  for (const id of klantIds) {
    uit.set(
      id,
      bouwWerkgeverProfiel({
        beoordelingen: beoordelingen.get(id) ?? [],
        beslissingen: beslissingen.get(id) ?? [],
        dienstIds: dienstenPerKlant.get(id) ?? [],
        reacties: reacties.get(id) ?? [],
        betalingen: betalingen.get(id) ?? [],
        beoordelingenBeschikbaar,
        nu,
      }),
    );
  }
  return uit;
}

/** Profielen (kern) voor een reeks werkgevers; uit de cache waar dat kan. */
export async function haalWerkgeverProfielen(
  klantIds: readonly (string | null | undefined)[],
  nu: Date = new Date(),
): Promise<Map<string, WerkgeverProfielKern>> {
  const uniek = [...new Set(klantIds.filter((id): id is string => !!id))];
  const uit = new Map<string, WerkgeverProfielKern>();
  const teBerekenen: string[] = [];
  for (const id of uniek) {
    const hit = cache.get(id);
    if (hit && hit.tot > Date.now()) uit.set(id, hit.profiel);
    else teBerekenen.push(id);
  }
  if (teBerekenen.length > 0) {
    const nieuw = await berekenProfielen(teBerekenen, nu);
    const tot = Date.now() + TTL_MS;
    for (const [id, profiel] of nieuw) {
      cache.set(id, { tot, profiel });
      uit.set(id, profiel);
    }
  }
  return uit;
}

/** Compacte profielen voor de dienstdata (`werkgever_profiel` in shifts/beschikbaar en het overzicht). */
export async function haalCompacteWerkgeverProfielen(
  klantIds: readonly (string | null | undefined)[],
): Promise<Map<string, WerkgeverProfielCompact>> {
  const kern = await haalWerkgeverProfielen(klantIds);
  return new Map([...kern].map(([id, p]) => [id, compactProfiel(p)]));
}

export type WerkgeverProfiel = WerkgeverProfielKern & {
  klant_id: string;
  bedrijfsnaam: string;
  bedrijf_foto_url: string | null;
};

/** Volledig profiel van één werkgever, met naam en bedrijfsfoto. Null als de klant niet bestaat. */
export async function haalWerkgeverProfiel(klantId: string): Promise<WerkgeverProfiel | null> {
  type KlantRij = { id: string; bedrijfsnaam: string | null; bedrijf_foto_url?: string | null };
  const vol = await supabaseAdmin.from("klanten").select("id, bedrijfsnaam, bedrijf_foto_url").eq("id", klantId).maybeSingle();
  const klant =
    vol.error && (vol.error.code === "42703" || vol.error.code === "PGRST204")
      ? await supabaseAdmin.from("klanten").select("id, bedrijfsnaam").eq("id", klantId).maybeSingle()
      : vol;
  if (klant.error) throw klant.error;
  const k = klant.data as KlantRij | null;
  if (!k) return null;
  const profiel = (await haalWerkgeverProfielen([klantId])).get(klantId) ?? LEEG_PROFIEL;
  return {
    klant_id: k.id,
    bedrijfsnaam: k.bedrijfsnaam || "Onbekende werkgever",
    bedrijf_foto_url: k.bedrijf_foto_url ?? null,
    ...profiel,
  };
}
