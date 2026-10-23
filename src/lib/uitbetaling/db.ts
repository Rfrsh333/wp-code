import { supabaseAdmin } from "@/lib/supabase";
import { decryptField } from "@/lib/encryption";
import { normaliseerIban } from "@/lib/medewerker/iban";
import { normaliseerBtwNummer, normaliseerKvkNummer } from "@/lib/medewerker/zzp-gegevens";
import { haalVoorwaarden } from "@/lib/medewerker/reactie-voorwaarden";
import { isOntbrekendeKolom, type DbFout } from "@/lib/db-kolom-fallback";
import { haalDemoIds } from "@/lib/demo";
import { nlDatum } from "@/lib/nl-tijd";
import {
  berekenRegel,
  kiesAdres,
  plusWerkdagen,
  uitbetaalStatus,
  type UitbetaalRegel,
  type UitbetaalStatus,
} from "@/lib/uitbetaling/regels";

/**
 * DB-kant van uitbetalen met zelffacturering. De rekenregels staan puur in lib/uitbetaling/regels.ts.
 *
 * Zolang migratie 20261024_uitbetalen_zelffacturering.sql niet gedraaid is, bestaan de tabellen
 * uitbetalingen/uitbetaling_regels/uitbetaalrondes en de akkoordkolommen niet. Dan geven deze
 * functies `migratieOntbreekt: true` en lege lijsten in plaats van een 500.
 */

/** Tabel of kolom ontbreekt (migratie nog niet gedraaid). */
export function isMigratieFout(fout: DbFout): boolean {
  return !!fout && (isOntbrekendeKolom(fout) || fout.code === "42P01" || fout.code === "PGRST205" || fout.code === "PGRST200");
}

export class MigratieOntbreektFout extends Error {
  constructor() {
    super("Migratie 20261024_uitbetalen_zelffacturering.sql is nog niet gedraaid");
    this.name = "MigratieOntbreektFout";
  }
}

type Embed<T> = T | T[] | null | undefined;
const een = <T,>(v: Embed<T>): T | null => (Array.isArray(v) ? (v[0] ?? null) : (v ?? null));

/** PostgREST-blokken klein houden: lange .in()-lijsten lopen tegen de URL-limiet aan. */
const BLOK = 150;
const PAGINA = 1000;
/** Bovengrens tegen een runaway-query; ruim boven het verwachte aantal open uren. */
const MAX_RIJEN = 20000;

async function perBlok<T>(ids: readonly string[], haal: (blok: string[]) => PromiseLike<{ data: unknown; error: DbFout }>): Promise<T[]> {
  const uniek = [...new Set(ids.filter(Boolean))];
  const resultaat: T[] = [];
  for (let i = 0; i < uniek.length; i += BLOK) {
    const { data, error } = await haal(uniek.slice(i, i + BLOK));
    if (error) throw error;
    resultaat.push(...((data as T[] | null) ?? []));
  }
  return resultaat;
}

// --- Uren met hun uitbetaalstatus ----------------------------------------------------------------

export type UrenItem = {
  uren_registratie_id: string;
  aanmelding_id: string;
  medewerker_id: string;
  status: UitbetaalStatus;
  klant_factuur_id: string | null;
  klant_factuur_nummer: string | null;
  klant_factuur_status: string | null;
  klant_factuur_betaald_op: string | null;
  /** betaald_op + X werkdagen (UITBETAAL_TERMIJN_WERKDAGEN), of null. */
  uiterlijk_uitbetalen: string | null;
  uitbetaling_id: string | null;
  regel: UitbetaalRegel;
};

type UrenRij = {
  id: string;
  aanmelding_id: string;
  status: string;
  goedgekeurd_at?: string | null;
  gewerkte_uren: number | null;
  start_tijd: string | null;
  eind_tijd: string | null;
  reiskosten_km: number | string | null;
  aanmelding: Embed<{
    medewerker_id: string;
    dienst: Embed<{
      datum: string | null;
      uurtarief: number | null;
      klant_naam: string | null;
      functie: string | null;
      klant: Embed<{ bedrijfsnaam: string | null }>;
    }>;
  }>;
};

const UREN_SELECT = (metGoedkeuring: boolean) => `
  id, aanmelding_id, status, ${metGoedkeuring ? "goedgekeurd_at, " : ""}gewerkte_uren, start_tijd, eind_tijd, reiskosten_km,
  aanmelding:dienst_aanmeldingen!inner (
    medewerker_id,
    dienst:diensten!dienst_id ( datum, uurtarief, klant_naam, functie, klant:klanten!klant_id ( bedrijfsnaam ) )
  )`;

async function haalUrenRijen(filter: { medewerkerId?: string; urenIds?: readonly string[] }): Promise<UrenRij[]> {
  const bouw = (metGoedkeuring: boolean) => {
    let q = supabaseAdmin
      .from("uren_registraties")
      .select(UREN_SELECT(metGoedkeuring))
      .in("status", ["goedgekeurd", "gefactureerd"]);
    if (filter.medewerkerId) q = q.eq("aanmelding.medewerker_id", filter.medewerkerId);
    return q;
  };

  const haalAlles = async (metGoedkeuring: boolean): Promise<{ rijen: UrenRij[]; error: DbFout }> => {
    const rijen: UrenRij[] = [];
    if (filter.urenIds) {
      try {
        rijen.push(...(await perBlok<UrenRij>(filter.urenIds, (blok) => bouw(metGoedkeuring).in("id", blok))));
      } catch (e) {
        return { rijen: [], error: e as DbFout };
      }
      return { rijen, error: null };
    }
    for (let van = 0; van < MAX_RIJEN; van += PAGINA) {
      const { data, error } = await bouw(metGoedkeuring).order("id", { ascending: true }).range(van, van + PAGINA - 1);
      if (error) return { rijen: [], error };
      const pagina = (data ?? []) as unknown as UrenRij[];
      rijen.push(...pagina);
      if (pagina.length < PAGINA) break;
    }
    return { rijen, error: null };
  };

  const eerste = await haalAlles(true);
  if (!eerste.error) return eerste.rijen;
  // goedgekeurd_at ontbreekt: niets is aantoonbaar door de admin goedgekeurd (dus niets uitbetaalbaar).
  if (!isOntbrekendeKolom(eerste.error)) throw eerste.error;
  const tweede = await haalAlles(false);
  if (tweede.error) throw tweede.error;
  return tweede.rijen;
}

type KlantFactuur = { id: string; factuur_nummer: string | null; status: string | null; betaald_op: string | null };

async function haalKlantFacturen(urenIds: readonly string[]): Promise<Map<string, KlantFactuur>> {
  const regels = await perBlok<{ uren_registratie_id: string; factuur_id: string }>(urenIds, (blok) =>
    supabaseAdmin.from("factuur_regels").select("uren_registratie_id, factuur_id").in("uren_registratie_id", blok),
  );
  const factuurIds = [...new Set(regels.map((r) => r.factuur_id).filter(Boolean))];
  let facturen: KlantFactuur[];
  try {
    facturen = await perBlok<KlantFactuur>(factuurIds, (blok) =>
      supabaseAdmin.from("facturen").select("id, factuur_nummer, status, betaald_op").in("id", blok),
    );
  } catch (e) {
    if (!isOntbrekendeKolom(e as DbFout)) throw e;
    // betaald_op bestaat nog niet (migratie): status is genoeg, alleen de termijn is onbekend.
    facturen = (
      await perBlok<Omit<KlantFactuur, "betaald_op">>(factuurIds, (blok) =>
        supabaseAdmin.from("facturen").select("id, factuur_nummer, status").in("id", blok),
      )
    ).map((f) => ({ ...f, betaald_op: null }));
  }
  const perId = new Map(facturen.map((f) => [f.id, f]));
  const perUren = new Map<string, KlantFactuur>();
  for (const r of regels) {
    const f = perId.get(r.factuur_id);
    if (!f) continue;
    const huidig = perUren.get(r.uren_registratie_id);
    if (!huidig) perUren.set(r.uren_registratie_id, f);
    // Uren horen op precies één klantfactuur (een toeslagregel staat op dezelfde factuur). Staan ze
    // op meer facturen, dan is er iets mis: nooit automatisch uitbetalen (status "conflict").
    else if (huidig.id !== f.id) perUren.set(r.uren_registratie_id, { ...huidig, status: "conflict", betaald_op: null });
  }
  return perUren;
}

type UitbetalingKoppeling = { uitbetaling_id: string; status: string };

/** Bestaan de tabellen van de migratie? (Een lege urenlijst zegt daar anders niets over.) */
export async function isMigratieGedraaid(): Promise<boolean> {
  // Geen head-request: postgrest-js maakt van een 404 zonder body "geen fout", dan lijkt een
  // ontbrekende tabel gedraaid. Een gewone select met limit 1 geeft wel 42P01/PGRST205.
  const { error } = await supabaseAdmin.from("uitbetaalrondes").select("id").limit(1);
  if (isMigratieFout(error)) return false;
  if (error) throw error;
  return true;
}

/** Welke uren al in een zelffactuur zitten (ook in een ronde die nog wordt opgebouwd). */
async function haalUitbetaaldeUren(urenIds: readonly string[]): Promise<{ koppeling: Map<string, UitbetalingKoppeling>; migratieOntbreekt: boolean }> {
  if (urenIds.length === 0) return { koppeling: new Map(), migratieOntbreekt: !(await isMigratieGedraaid()) };
  let regels: { uren_registratie_id: string; uitbetaling_id: string }[];
  try {
    regels = await perBlok(urenIds, (blok) =>
      supabaseAdmin.from("uitbetaling_regels").select("uren_registratie_id, uitbetaling_id").in("uren_registratie_id", blok),
    );
  } catch (e) {
    if (isMigratieFout(e as DbFout)) return { koppeling: new Map(), migratieOntbreekt: true };
    throw e;
  }
  const uitbetalingen = await perBlok<{ id: string; status: string }>(
    regels.map((r) => r.uitbetaling_id),
    (blok) => supabaseAdmin.from("uitbetalingen").select("id, status").in("id", blok),
  );
  const status = new Map(uitbetalingen.map((u) => [u.id, u.status]));
  const koppeling = new Map<string, UitbetalingKoppeling>();
  for (const r of regels) {
    koppeling.set(r.uren_registratie_id, { uitbetaling_id: r.uitbetaling_id, status: status.get(r.uitbetaling_id) ?? "in_uitbetaalronde" });
  }
  return { koppeling, migratieOntbreekt: false };
}

/**
 * Alle door de admin goedgekeurde of gefactureerde uren met hun uitbetaalstatus en bedragen.
 * Demo-medewerkers vallen eruit (die worden nooit uitbetaald).
 */
export async function haalUrenMetStatus(
  filter: { medewerkerId?: string; urenIds?: readonly string[] },
  opties: { termijnWerkdagen: number | null },
): Promise<{ items: UrenItem[]; migratieOntbreekt: boolean }> {
  const rijen = await haalUrenRijen(filter);
  const demo = await haalDemoIds();
  const relevant = rijen.filter((r) => {
    const mid = een(r.aanmelding)?.medewerker_id;
    return !!mid && !demo.medewerkers.has(mid);
  });
  const urenIds = relevant.map((r) => r.id);

  const [voorwaarden, klantFacturen, uitbetaald] = await Promise.all([
    haalVoorwaarden(relevant.map((r) => r.aanmelding_id)),
    haalKlantFacturen(urenIds),
    haalUitbetaaldeUren(urenIds),
  ]);

  const items: UrenItem[] = [];
  for (const r of relevant) {
    const aanmelding = een(r.aanmelding);
    const dienst = een(aanmelding?.dienst);
    const klant = een(dienst?.klant);
    const factuur = klantFacturen.get(r.id) ?? null;
    const koppeling = uitbetaald.koppeling.get(r.id) ?? null;
    const status = uitbetaalStatus({
      status: r.status,
      goedgekeurd_at: r.goedgekeurd_at ?? null,
      klant_factuur_status: factuur?.status ?? null,
      uitbetaling_status: koppeling?.status ?? null,
    });
    if (!status || !aanmelding) continue;
    const betaaldOp = factuur?.betaald_op ? nlDatum(new Date(factuur.betaald_op)) : null;
    items.push({
      uren_registratie_id: r.id,
      aanmelding_id: r.aanmelding_id,
      medewerker_id: aanmelding.medewerker_id,
      status,
      klant_factuur_id: factuur?.id ?? null,
      klant_factuur_nummer: factuur?.factuur_nummer ?? null,
      klant_factuur_status: factuur?.status ?? null,
      klant_factuur_betaald_op: factuur?.betaald_op ?? null,
      uiterlijk_uitbetalen: betaaldOp && opties.termijnWerkdagen ? plusWerkdagen(betaaldOp, opties.termijnWerkdagen) : null,
      uitbetaling_id: koppeling?.uitbetaling_id ?? null,
      regel: berekenRegel({
        uren_registratie_id: r.id,
        datum: dienst?.datum ?? null,
        werkgever: klant?.bedrijfsnaam || dienst?.klant_naam || "Onbekend",
        functie: dienst?.functie ?? null,
        gewerkte_uren: r.gewerkte_uren,
        start_tijd: r.start_tijd,
        eind_tijd: r.eind_tijd,
        reiskosten_km: r.reiskosten_km,
        dienst_uurtarief: dienst?.uurtarief ?? null,
        voorgesteld_uurtarief: voorwaarden.get(r.aanmelding_id)?.voorgesteld_uurtarief ?? null,
      }),
    });
  }
  items.sort((a, b) => (a.regel.datum ?? "").localeCompare(b.regel.datum ?? ""));
  return { items, migratieOntbreekt: uitbetaald.migratieOntbreekt };
}

// --- Gegevens van de zzp'er (leverancier) -------------------------------------------------------

export type Leverancier = {
  id: string;
  naam: string | null;
  adres: string | null;
  postcode: string | null;
  stad: string | null;
  kvk_nummer: string | null;
  /** Ontsleuteld en genormaliseerd. Nooit naar de browser sturen zonder maskeren. */
  btw_nummer: string | null;
  /** Ontsleuteld en genormaliseerd. Nooit naar de browser sturen zonder maskeren. */
  iban: string | null;
  kor: boolean;
  akkoord_op: string | null;
  akkoord_versie: string | null;
};

const LEVERANCIER_BASIS = "id, naam, stad, factuur_adres, factuur_postcode, factuur_stad, btw_nummer, iban";
const LEVERANCIER_PROFIEL = "adres, postcode, kor_actief, kvk_nummer";
const LEVERANCIER_AKKOORD = "zelffacturering_akkoord_op, zelffacturering_akkoord_versie";

/**
 * Leveranciersgegevens per medewerker-id. Leest stapsgewijs terug als kolommen ontbreken
 * (akkoord → profiel → basis), zodat het overzicht ook zonder migratie werkt.
 */
export async function haalLeveranciers(ids: readonly string[]): Promise<{ perId: Map<string, Leverancier>; akkoordKolommen: boolean }> {
  const pogingen = [
    { kolommen: `${LEVERANCIER_BASIS}, ${LEVERANCIER_PROFIEL}, ${LEVERANCIER_AKKOORD}`, akkoord: true },
    { kolommen: `${LEVERANCIER_BASIS}, ${LEVERANCIER_PROFIEL}`, akkoord: false },
    { kolommen: LEVERANCIER_BASIS, akkoord: false },
  ];
  for (const poging of pogingen) {
    try {
      const rijen = await perBlok<Record<string, unknown>>(ids, (blok) =>
        supabaseAdmin.from("medewerkers").select(poging.kolommen).in("id", blok),
      );
      const perId = new Map<string, Leverancier>();
      for (const r of rijen) {
        const tekst = (k: string) => (typeof r[k] === "string" && (r[k] as string).trim() ? (r[k] as string).trim() : null);
        const adres = kiesAdres({
          adres: tekst("adres"),
          postcode: tekst("postcode"),
          stad: tekst("stad"),
          factuur_adres: tekst("factuur_adres"),
          factuur_postcode: tekst("factuur_postcode"),
          factuur_stad: tekst("factuur_stad"),
        });
        const btw = decryptField(tekst("btw_nummer"));
        const iban = decryptField(tekst("iban"));
        const kvk = tekst("kvk_nummer");
        perId.set(r.id as string, {
          id: r.id as string,
          naam: tekst("naam"),
          ...adres,
          kvk_nummer: kvk ? normaliseerKvkNummer(kvk) : null,
          btw_nummer: btw ? normaliseerBtwNummer(btw) : null,
          iban: iban ? normaliseerIban(iban) : null,
          kor: r.kor_actief === true,
          akkoord_op: tekst("zelffacturering_akkoord_op"),
          akkoord_versie: tekst("zelffacturering_akkoord_versie"),
        });
      }
      return { perId, akkoordKolommen: poging.akkoord };
    } catch (e) {
      if (!isOntbrekendeKolom(e as DbFout)) throw e;
    }
  }
  return { perId: new Map(), akkoordKolommen: false };
}

// --- Zelffacturen lezen -----------------------------------------------------------------------------

export type ZelffactuurRij = {
  id: string;
  ronde_id: string;
  medewerker_id: string | null;
  factuur_nummer: string;
  factuur_datum: string;
  status: "in_uitbetaalronde" | "uitbetaald";
  bedrag_excl: number;
  btw_percentage: number;
  btw_bedrag: number;
  bedrag_incl: number;
  kor: boolean;
  leverancier_naam: string;
  iban_laatste4: string | null;
  pdf_pad: string | null;
  uitbetaald_op: string | null;
};

export const ZELFFACTUUR_KOLOMMEN =
  "id, ronde_id, medewerker_id, factuur_nummer, factuur_datum, status, bedrag_excl, btw_percentage, btw_bedrag, bedrag_incl, kor, leverancier_naam, iban_laatste4, pdf_pad, uitbetaald_op";

/**
 * Zelffacturen van één medewerker (rondes in opbouw tellen niet mee). `jaar` beperkt op factuurdatum.
 */
export async function haalZelffacturenVanMedewerker(
  medewerkerId: string,
  jaar?: number,
): Promise<{ facturen: ZelffactuurRij[]; jaren: number[]; migratieOntbreekt: boolean }> {
  let q = supabaseAdmin
    .from("uitbetalingen")
    .select(`${ZELFFACTUUR_KOLOMMEN}, ronde:uitbetaalrondes!inner(status)`)
    .eq("medewerker_id", medewerkerId)
    .neq("ronde.status", "concept")
    .order("factuur_datum", { ascending: false })
    .order("volgnummer", { ascending: false })
    .limit(1000);
  if (jaar) q = q.gte("factuur_datum", `${jaar}-01-01`).lte("factuur_datum", `${jaar}-12-31`);

  const [{ data, error }, datums] = await Promise.all([
    q,
    supabaseAdmin
      .from("uitbetalingen")
      .select("factuur_datum, ronde:uitbetaalrondes!inner(status)")
      .eq("medewerker_id", medewerkerId)
      .neq("ronde.status", "concept")
      .limit(5000),
  ]);
  if (isMigratieFout(error) || isMigratieFout(datums.error)) return { facturen: [], jaren: [], migratieOntbreekt: true };
  if (error) throw error;
  if (datums.error) throw datums.error;

  const facturen = ((data ?? []) as unknown as (ZelffactuurRij & { ronde?: unknown })[]).map((rij) => {
    const { ronde: _ronde, ...f } = rij;
    void _ronde;
    return {
      ...f,
      bedrag_excl: Number(f.bedrag_excl),
      btw_percentage: Number(f.btw_percentage),
      btw_bedrag: Number(f.btw_bedrag),
      bedrag_incl: Number(f.bedrag_incl),
    };
  });
  const jaren = [...new Set(((datums.data ?? []) as { factuur_datum: string }[]).map((d) => Number(d.factuur_datum.slice(0, 4))))].sort(
    (a, b) => b - a,
  );
  return { facturen, jaren, migratieOntbreekt: false };
}
