import { supabaseAdmin } from "@/lib/supabase";
import { isOntbrekendeKolom, schrijfMetKolomFallback } from "@/lib/db-kolom-fallback";
import { isOntbrekendeTabel } from "@/lib/medewerker/werkgever-voorkeuren";
import { nlVandaag } from "@/lib/nl-tijd";
import { geocodeerPostcode } from "@/lib/locatie/pdok";
import {
  gewisteGeoVelden,
  gewisteOntdekVeldenMedewerker,
  naarCoordinaat,
  normaliseerPostcode,
  postcodeUitTekst,
  type Coordinaat,
} from "@/lib/locatie/locatie-regels";

/**
 * Globale locatie (postcode → afgeronde coördinaten) opslaan bij medewerkers en diensten.
 * Kolommen uit migratie 20261023_ontdekken_afstand_werkgevers.sql:
 *   geo_lat, geo_lng        afgerond op 3 decimalen, null = onbekend
 *   geo_postcode            de postcode waar de coördinaten bij horen
 *   geo_bijgewerkt_op       wanneer we het geprobeerd hebben; null = nog doen (backfill)
 * Zonder migratie (42703/PGRST204) doen deze functies niets en melden ze `migratie_ontbreekt`.
 * Een PDOK-fout of time-out blokkeert nooit: dan blijft de locatie leeg en pakt de backfill hem later op.
 */

export type LocatieUitkomst = "opgeslagen" | "geen_postcode" | "geen_resultaat" | "fout" | "migratie_ontbreekt";

type GeoVelden = {
  geo_lat: number | null;
  geo_lng: number | null;
  geo_postcode: string | null;
  geo_bijgewerkt_op: string | null;
};

/**
 * Bestaan de geo-kolommen al? Eerst controleren, zodat we zonder migratie geen postcode naar PDOK
 * sturen (en niet op PDOK wachten) voor niets. Per serverinstantie 5 minuten onthouden.
 */
const KOLOM_CACHE_MS = 5 * 60 * 1000;
const kolomCache = new Map<string, { tot: number; aanwezig: boolean }>();

async function geoKolommenAanwezig(tabel: "medewerkers" | "diensten"): Promise<boolean> {
  const bewaard = kolomCache.get(tabel);
  if (bewaard && bewaard.tot > Date.now()) return bewaard.aanwezig;
  const { error } = await supabaseAdmin.from(tabel).select("id, geo_lat, geo_lng, geo_postcode, geo_bijgewerkt_op").limit(1);
  if (error && !isOntbrekendeKolom(error)) throw error;
  const aanwezig = !error;
  kolomCache.set(tabel, { tot: Date.now() + KOLOM_CACHE_MS, aanwezig });
  return aanwezig;
}

async function geoVoorPostcode(pc: string | null): Promise<{ velden: GeoVelden; uitkomst: Exclude<LocatieUitkomst, "migratie_ontbreekt">; locatie: Coordinaat | null }> {
  const nu = new Date().toISOString();
  if (!pc) return { velden: { geo_lat: null, geo_lng: null, geo_postcode: null, geo_bijgewerkt_op: nu }, uitkomst: "geen_postcode", locatie: null };
  const r = await geocodeerPostcode(pc);
  if (r.soort === "ok") {
    return { velden: { geo_lat: r.lat, geo_lng: r.lng, geo_postcode: pc, geo_bijgewerkt_op: nu }, uitkomst: "opgeslagen", locatie: { lat: r.lat, lng: r.lng } };
  }
  if (r.soort === "geen") return { velden: { geo_lat: null, geo_lng: null, geo_postcode: pc, geo_bijgewerkt_op: nu }, uitkomst: "geen_resultaat", locatie: null };
  // Fout: oude coördinaten weg (ze horen mogelijk bij een vorige postcode) en later opnieuw proberen.
  return { velden: { geo_lat: null, geo_lng: null, geo_postcode: null, geo_bijgewerkt_op: null }, uitkomst: "fout", locatie: null };
}

/**
 * Locatie van een medewerker bijwerken uit zijn postcode. Met `alleenBijWijziging` slaan we het over
 * als deze postcode al verwerkt is (web en app sturen bij elk opslaan alle velden mee).
 */
export async function werkMedewerkerLocatieBij(
  medewerkerId: string,
  postcode: unknown,
  opties: { alleenBijWijziging?: boolean } = {},
): Promise<LocatieUitkomst> {
  const pc = normaliseerPostcode(postcode);
  if (!(await geoKolommenAanwezig("medewerkers"))) return "migratie_ontbreekt";
  if (opties.alleenBijWijziging) {
    const { data, error } = await supabaseAdmin.from("medewerkers").select("geo_postcode, geo_bijgewerkt_op").eq("id", medewerkerId).maybeSingle();
    if (isOntbrekendeKolom(error)) return "migratie_ontbreekt";
    if (error) throw error;
    const huidig = data as { geo_postcode: string | null; geo_bijgewerkt_op: string | null } | null;
    if (huidig?.geo_bijgewerkt_op && (huidig.geo_postcode ?? null) === pc) return pc ? "opgeslagen" : "geen_postcode";
  }
  const { velden, uitkomst } = await geoVoorPostcode(pc);
  const { error } = await supabaseAdmin.from("medewerkers").update(velden).eq("id", medewerkerId);
  if (isOntbrekendeKolom(error)) return "migratie_ontbreekt";
  if (error) throw error;
  return uitkomst;
}

/** Postcode van een klant (fallback voor een dienst zonder postcode in de locatie). */
async function klantPostcode(klantId: string | null | undefined, cache?: Map<string, string | null>): Promise<string | null> {
  if (!klantId) return null;
  if (cache?.has(klantId)) return cache.get(klantId) ?? null;
  const { data, error } = await supabaseAdmin.from("klanten").select("postcode").eq("id", klantId).maybeSingle();
  const pc = error ? null : normaliseerPostcode((data as { postcode?: unknown } | null)?.postcode);
  cache?.set(klantId, pc);
  return pc;
}

/**
 * Locatie van één of meer diensten (zelfde locatie en klant, bv. één aanvraag) bijwerken: de postcode
 * uit de locatietekst, anders die van de klant. Geeft ook de coördinaat terug voor de gerichte push.
 */
export async function werkDienstLocatiesBij(
  dienstIds: readonly string[],
  bron: { locatie: unknown; klantId: string | null | undefined },
  cache?: Map<string, string | null>,
): Promise<{ uitkomst: LocatieUitkomst; locatie: Coordinaat | null }> {
  if (dienstIds.length === 0) return { uitkomst: "geen_postcode", locatie: null };
  if (!(await geoKolommenAanwezig("diensten"))) return { uitkomst: "migratie_ontbreekt", locatie: null };
  const pc = postcodeUitTekst(bron.locatie) ?? (await klantPostcode(bron.klantId, cache));
  const { velden, uitkomst, locatie } = await geoVoorPostcode(pc);
  const { error } = await supabaseAdmin.from("diensten").update(velden).in("id", [...dienstIds]);
  if (isOntbrekendeKolom(error)) return { uitkomst: "migratie_ontbreekt", locatie: null };
  if (error) throw error;
  return { uitkomst, locatie };
}

// --- Wissen (verwijderverzoek / account verwijderen) ---------------------------------------

const GEO_KOLOMMEN = ["geo_lat", "geo_lng", "geo_postcode", "geo_bijgewerkt_op"] as const;

/**
 * Ontdekken-gegevens van een medewerker wissen: globale locatie, maximale afstand en zijn
 * bewaarde/verborgen werkgevers. Geen van deze gegevens valt onder een bewaarplicht, dus dit gebeurt
 * al bij het verzoek om het account te verwijderen (en nog eens bij het verwijderen door de admin).
 * Zonder migratie (kolommen of tabel ontbreken) is er niets te wissen. Een andere fout wordt gegooid.
 */
export async function wisOntdekGegevensMedewerker(medewerkerId: string): Promise<void> {
  const { error } = await schrijfMetKolomFallback(gewisteOntdekVeldenMedewerker(), [...GEO_KOLOMMEN, "max_afstand_km"], (rij) =>
    Object.keys(rij).length ? supabaseAdmin.from("medewerkers").update(rij).eq("id", medewerkerId) : Promise.resolve({ data: null, error: null }),
  );
  if (error && !isOntbrekendeKolom(error)) throw error;
  const voorkeuren = await supabaseAdmin.from("medewerker_werkgever_voorkeuren").delete().eq("medewerker_id", medewerkerId);
  if (voorkeuren.error && !isOntbrekendeTabel(voorkeuren.error)) throw voorkeuren.error;
}

/**
 * Bij het verwijderen van een klantaccount: de globale locatie van zijn diensten (afgeleid van zijn
 * adres of postcode) en de keuzes van medewerkers om deze werkgever te bewaren of te verbergen.
 */
export async function wisOntdekGegevensKlant(klantId: string): Promise<void> {
  const { error } = await schrijfMetKolomFallback(gewisteGeoVelden(), GEO_KOLOMMEN, (rij) =>
    Object.keys(rij).length ? supabaseAdmin.from("diensten").update(rij).eq("klant_id", klantId) : Promise.resolve({ data: null, error: null }),
  );
  if (error && !isOntbrekendeKolom(error)) throw error;
  const voorkeuren = await supabaseAdmin.from("medewerker_werkgever_voorkeuren").delete().eq("klant_id", klantId);
  if (voorkeuren.error && !isOntbrekendeTabel(voorkeuren.error)) throw voorkeuren.error;
}

// --- Lezen ----------------------------------------------------------------------------------

export type MedewerkerAfstand = {
  /** false = migratie nog niet gedraaid. */
  beschikbaar: boolean;
  locatie: Coordinaat | null;
  maxAfstandKm: number | null;
  postcodeIngevuld: boolean;
};

/** Eigen locatie en maximale afstand van een medewerker (leeg zonder migratie). */
export async function haalMedewerkerAfstand(medewerkerId: string): Promise<MedewerkerAfstand> {
  const { data, error } = await supabaseAdmin
    .from("medewerkers")
    .select("postcode, geo_lat, geo_lng, max_afstand_km")
    .eq("id", medewerkerId)
    .maybeSingle();
  if (isOntbrekendeKolom(error)) return { beschikbaar: false, locatie: null, maxAfstandKm: null, postcodeIngevuld: false };
  if (error) throw error;
  const rij = data as { postcode: string | null; geo_lat: unknown; geo_lng: unknown; max_afstand_km: number | null } | null;
  return {
    beschikbaar: true,
    locatie: naarCoordinaat(rij?.geo_lat, rij?.geo_lng),
    maxAfstandKm: rij?.max_afstand_km ?? null,
    postcodeIngevuld: !!normaliseerPostcode(rij?.postcode),
  };
}

/** Locatie per dienst-id (alleen diensten met een bekende locatie; leeg zonder migratie). */
export async function haalDienstLocaties(dienstIds: readonly string[]): Promise<Map<string, Coordinaat>> {
  const uit = new Map<string, Coordinaat>();
  const uniek = [...new Set(dienstIds)];
  for (let i = 0; i < uniek.length; i += 150) {
    const { data, error } = await supabaseAdmin.from("diensten").select("id, geo_lat, geo_lng").in("id", uniek.slice(i, i + 150));
    if (isOntbrekendeKolom(error)) return new Map();
    if (error) throw error;
    for (const d of (data ?? []) as { id: string; geo_lat: unknown; geo_lng: unknown }[]) {
      const c = naarCoordinaat(d.geo_lat, d.geo_lng);
      if (c) uit.set(d.id, c);
    }
  }
  return uit;
}

// --- Backfill (admin, eenmalig voor bestaande rijen) ----------------------------------------

export type BackfillTelling = Record<Exclude<LocatieUitkomst, "migratie_ontbreekt">, number>;
const legeTelling = (): BackfillTelling => ({ opgeslagen: 0, geen_postcode: 0, geen_resultaat: 0, fout: 0 });

export type BackfillResultaat =
  | { migratie: false }
  | {
      migratie: true;
      medewerkers: BackfillTelling;
      diensten: BackfillTelling;
      /** Nog te doen na deze aanroep (geo_bijgewerkt_op is null): actieve medewerkers, diensten vanaf vandaag. */
      resterend: { medewerkers: number | null; diensten: number | null };
      /** Gestopt omdat PDOK herhaaldelijk niet antwoordde (later opnieuw proberen). */
      afgebroken: boolean;
      /** Gestopt omdat het tijdbudget (± 40 s) op was; gewoon opnieuw aanroepen. */
      tijdbudget_op: boolean;
    };

export const BACKFILL_STANDAARD_LIMIET = 50;
export const BACKFILL_MAX_LIMIET = 100;
const TEGELIJK = 4;
const MAX_FOUTEN_OP_RIJ = 3;
/** Ruim binnen maxDuration (60 s) van de route blijven: daarna geen nieuwe rijen meer beginnen. */
const TIJDBUDGET_MS = 40_000;

/**
 * Vult de locatie aan voor rijen waar geo_bijgewerkt_op nog leeg is: eerst actieve medewerkers
 * (dataminimalisatie: inactieve accounts niet), dan diensten vanaf vandaag (oudere diensten verschijnen
 * niet meer in Ontdekken). Idempotent: een verwerkte rij krijgt geo_bijgewerkt_op en komt niet terug;
 * een PDOK- of databasefout op een rij blijft open voor een volgende aanroep en blokkeert de rest niet.
 * `limiet` = maximaal aantal rijen per aanroep (medewerkers + diensten samen); na ± 40 s stopt hij.
 */
export async function backfillLocaties(limiet: number): Promise<BackfillResultaat> {
  const max = Math.max(1, Math.min(BACKFILL_MAX_LIMIET, Math.floor(limiet) || BACKFILL_STANDAARD_LIMIET));
  const vandaag = nlVandaag();
  const medewerkers = legeTelling();
  const diensten = legeTelling();
  let foutenOpRij = 0;
  let afgebroken = false;
  const begin = Date.now();
  const tijdOp = () => Date.now() - begin > TIJDBUDGET_MS;
  const perRij = async <T,>(werk: () => Promise<T>, bijFout: T): Promise<T> => {
    try {
      return await werk();
    } catch (e) {
      console.error("[backfill-locaties] rij mislukt:", e instanceof Error ? e.message : e);
      return bijFout;
    }
  };

  const tel = (t: BackfillTelling, u: LocatieUitkomst) => {
    if (u === "migratie_ontbreekt") return;
    t[u]++;
    foutenOpRij = u === "fout" ? foutenOpRij + 1 : 0;
    if (foutenOpRij >= MAX_FOUTEN_OP_RIJ) afgebroken = true;
  };

  const mw = await supabaseAdmin
    .from("medewerkers")
    .select("id, postcode")
    .is("geo_bijgewerkt_op", null)
    .eq("status", "actief")
    .order("id", { ascending: true })
    .limit(max);
  if (isOntbrekendeKolom(mw.error)) return { migratie: false };
  if (mw.error) throw mw.error;
  const mwRijen = (mw.data ?? []) as { id: string; postcode: string | null }[];
  let mwGedaan = 0;
  for (let i = 0; i < mwRijen.length && !afgebroken && !tijdOp(); i += TEGELIJK) {
    const blok = mwRijen.slice(i, i + TEGELIJK);
    const uitkomsten = await Promise.all(blok.map((m) => perRij(() => werkMedewerkerLocatieBij(m.id, m.postcode), "fout" as LocatieUitkomst)));
    uitkomsten.forEach((u) => tel(medewerkers, u));
    mwGedaan += blok.length;
  }

  const rest = max - mwRijen.length;
  if (rest > 0 && !afgebroken && !tijdOp() && mwGedaan === mwRijen.length) {
    const dn = await supabaseAdmin
      .from("diensten")
      .select("id, locatie, klant_id")
      .is("geo_bijgewerkt_op", null)
      .gte("datum", vandaag)
      .order("datum", { ascending: true })
      .limit(rest);
    if (isOntbrekendeKolom(dn.error)) return { migratie: false };
    if (dn.error) throw dn.error;
    const klantCache = new Map<string, string | null>();
    const dnRijen = (dn.data ?? []) as { id: string; locatie: string | null; klant_id: string | null }[];
    for (let i = 0; i < dnRijen.length && !afgebroken && !tijdOp(); i += TEGELIJK) {
      const uitkomsten = await Promise.all(
        dnRijen
          .slice(i, i + TEGELIJK)
          .map((d) =>
            perRij(
              () => werkDienstLocatiesBij([d.id], { locatie: d.locatie, klantId: d.klant_id }, klantCache),
              { uitkomst: "fout" as LocatieUitkomst, locatie: null },
            ),
          ),
      );
      uitkomsten.forEach((u) => tel(diensten, u.uitkomst));
    }
  }

  const [restMw, restDn] = await Promise.all([
    supabaseAdmin.from("medewerkers").select("id", { count: "exact", head: true }).is("geo_bijgewerkt_op", null).eq("status", "actief"),
    supabaseAdmin.from("diensten").select("id", { count: "exact", head: true }).is("geo_bijgewerkt_op", null).gte("datum", vandaag),
  ]);
  return {
    migratie: true,
    medewerkers,
    diensten,
    resterend: { medewerkers: restMw.error ? null : restMw.count ?? null, diensten: restDn.error ? null : restDn.count ?? null },
    afgebroken,
    tijdbudget_op: tijdOp(),
  };
}
