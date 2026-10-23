import { supabaseAdmin } from "@/lib/supabase";
import { dienstenFilter, GEEN_DEMO_IDS, isDemoEmail, isDemoKlantId, isDemoMedewerkerId, type DemoIds } from "@/lib/demo-regels";

export { DEMO_MELDINGEN, filterOpWereld, zelfdeWereld, type DemoIds } from "@/lib/demo-regels";

/**
 * Demo-accounts (reviewaccounts voor Apple/Google), server-side afgeschermd.
 * Kolom `is_demo` op klanten en medewerkers (migratie 20261007_demo_accounts.sql).
 * Zolang die kolom niet bestaat (42703) is niemand demo en werkt alles zoals voorheen.
 * Uitleg en SQL voor het aanmaken: docs/demo-account.md.
 *
 * Er zijn hooguit een paar demo-accounts, dus we halen de ids één keer op en cachen ze kort
 * per serverinstantie. Lukt het ophalen niet (anders dan 42703), dan liever een fout dan
 * per ongeluk een demo-actie als echte behandelen (push naar alle medewerkers, factuurnummer).
 */

const TTL_MS = 60_000;
let cache: { tot: number; ids: DemoIds } | null = null;

function isOntbrekendeKolom(error: { code?: string; message?: string } | null): boolean {
  if (!error) return false;
  return error.code === "42703" || (error.code === "PGRST204" && /is_demo/.test(error.message ?? ""));
}

type Rij = { id: string; email: string | null };

async function rijenVan(tabel: "klanten" | "medewerkers"): Promise<Rij[]> {
  const { data, error } = await supabaseAdmin.from(tabel).select("id, email").eq("is_demo", true).limit(1000);
  if (isOntbrekendeKolom(error)) return [];
  if (error) throw error;
  return (data ?? []) as Rij[];
}

export async function haalDemoIds(): Promise<DemoIds> {
  if (cache && cache.tot > Date.now()) return cache.ids;
  try {
    const [klanten, medewerkers] = await Promise.all([rijenVan("klanten"), rijenVan("medewerkers")]);
    const ids: DemoIds =
      klanten.length + medewerkers.length === 0
        ? GEEN_DEMO_IDS
        : {
            klanten: new Set(klanten.map((r) => r.id)),
            medewerkers: new Set(medewerkers.map((r) => r.id)),
            emails: new Set(
              [...klanten, ...medewerkers].map((r) => r.email?.trim().toLowerCase()).filter((e): e is string => !!e),
            ),
          };
    cache = { tot: Date.now() + TTL_MS, ids };
    return ids;
  } catch (error) {
    // Verlopen cache is beter dan niets; zonder cache: fout doorgeven (fail closed).
    if (cache) return cache.ids;
    throw error;
  }
}

export async function isDemoKlant(klantId: string | null | undefined): Promise<boolean> {
  if (!klantId) return false;
  return isDemoKlantId(await haalDemoIds(), klantId);
}

export async function isDemoMedewerker(medewerkerId: string | null | undefined): Promise<boolean> {
  if (!medewerkerId) return false;
  return isDemoMedewerkerId(await haalDemoIds(), medewerkerId);
}

/** Hoort dit e-mailadres bij een demo-account? Voor mails die alleen een adres krijgen. */
export async function isDemoAdres(email: string | null | undefined): Promise<boolean> {
  if (!email) return false;
  return isDemoEmail(await haalDemoIds(), email);
}

type DienstenQuery<Q> = {
  in(kolom: string, waarden: readonly string[]): Q;
  or(filter: string): Q;
};

/**
 * Beperkt een query op `diensten` tot de wereld van de kijker: een demo-medewerker ziet alleen
 * diensten van demo-klanten, een echte medewerker nooit een dienst van een demo-klant.
 */
export function beperkDiensten<Q extends DienstenQuery<Q>>(query: Q, ids: DemoIds, demo: boolean): Q {
  const filter = dienstenFilter(ids, demo);
  if (!filter) return query;
  return filter.soort === "in" ? query.in("klant_id", filter.waarden) : query.or(filter.filter);
}

/** Medewerker-ids die een push/uitnodiging mogen krijgen vanuit een klant in wereld `demo`. */
export async function medewerkersInWereld(medewerkerIds: readonly string[], demo: boolean): Promise<string[]> {
  const ids = await haalDemoIds();
  return medewerkerIds.filter((id) => ids.medewerkers.has(id) === demo);
}

/** Alleen voor tests: cache leegmaken. */
export function _resetDemoCache(): void {
  cache = null;
}
