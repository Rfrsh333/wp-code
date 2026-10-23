import { supabaseAdmin } from "@/lib/supabase";
import { haalDemoIds } from "@/lib/demo";
import { isDemoKlantId } from "@/lib/demo-regels";
import { isOntbrekendeKolom } from "@/lib/db-kolom-fallback";
import { captureRouteError } from "@/lib/sentry-utils";
import { naarCoordinaat } from "@/lib/locatie/locatie-regels";
import { beschikbaarheidPerMedewerker, type BeschikbaarheidVelden } from "@/lib/medewerker/beschikbaarheid-bron";
import { maandagVan } from "@/lib/medewerker/beschikbaarheid";
import { isOntbrekendeTabel } from "@/lib/medewerker/werkgever-voorkeuren";
import { kiesOntvangers, type GeenPushReden, type PushDienst, type PushMedewerker } from "@/lib/medewerker/push-doelgroep-regels";

/**
 * DB-kant van de gerichte push bij een nieuwe dienst (regels: push-doelgroep-regels.ts).
 *
 * Zonder migratie 20261023_ontdekken_afstand_werkgevers.sql (kolommen geo_* en max_afstand_km
 * ontbreken: 42703/PGRST204) geeft dit `iedereen`: dan gaat de push zoals voorheen naar alle
 * medewerkers van de juiste wereld (sendPushToAllOfType). Een fout in de hoofdqueries (diensten,
 * medewerkers) wordt gegooid; pushNieuweDienst (lib/klant-controle.ts) valt dan terug op de oude
 * push. Lukt een aanvulling niet (overrides, verborgen werkgevers), dan gaat het zonder die
 * aanvulling verder en komt de fout in Sentry.
 */

export type PushDoelgroep =
  | { modus: "gericht"; ids: string[]; kandidaten: number; redenen: Partial<Record<GeenPushReden, number>>; functieTerugval: number }
  | { modus: "iedereen"; reden: "geen_diensten" | "migratie_ontbreekt" | "databasefout" };

type DienstRij = {
  id: string;
  klant_id: string | null;
  functie: string | null;
  datum: string;
  start_tijd: string;
  eind_tijd: string | null;
  geo_lat: unknown;
  geo_lng: unknown;
};
type MedewerkerRij = {
  id: string;
  email: string | null;
  functie: string | string[] | null;
  status: string | null;
  geo_lat: unknown;
  geo_lng: unknown;
  max_afstand_km: number | null;
};
type DbFout = { code?: string | null; message?: string | null } | null;

/** PostgREST-blokken klein houden (URL-lengte). */
const BLOK = 150;
/** Supabase geeft standaard maximaal 1000 rijen per verzoek (max_rows): pagineren. */
const PAGINA = 1000;

function blokken<T>(lijst: readonly T[]): T[][] {
  const uit: T[][] = [];
  for (let i = 0; i < lijst.length; i += BLOK) uit.push(lijst.slice(i, i + BLOK));
  return uit;
}

/** Alle actieve medewerkers, per 1000 (op id gesorteerd, zodat geen rij wegvalt of dubbel komt). */
async function actieveMedewerkers(): Promise<{ data: MedewerkerRij[]; error: DbFout }> {
  const alle: MedewerkerRij[] = [];
  for (let van = 0; ; van += PAGINA) {
    const { data, error } = await supabaseAdmin
      .from("medewerkers")
      .select("id, email, functie, status, geo_lat, geo_lng, max_afstand_km")
      .eq("status", "actief")
      .order("id", { ascending: true })
      .range(van, van + PAGINA - 1);
    if (error) return { data: [], error };
    alle.push(...((data ?? []) as MedewerkerRij[]));
    if ((data ?? []).length < PAGINA) return { data: alle, error: null };
  }
}

export async function bepaalPushDoelgroep(dienstIds: readonly string[], demo: boolean): Promise<PushDoelgroep> {
  if (dienstIds.length === 0) return { modus: "iedereen", reden: "geen_diensten" };

  const [dn, mw, demoIds] = await Promise.all([
    supabaseAdmin.from("diensten").select("id, klant_id, functie, datum, start_tijd, eind_tijd, geo_lat, geo_lng").in("id", [...dienstIds]),
    actieveMedewerkers(),
    haalDemoIds(),
  ]);
  if (isOntbrekendeKolom(dn.error) || isOntbrekendeKolom(mw.error)) return { modus: "iedereen", reden: "migratie_ontbreekt" };
  if (dn.error || mw.error) throw dn.error ?? mw.error;

  const dienstRijen = (dn.data ?? []) as DienstRij[];
  if (dienstRijen.length === 0) return { modus: "iedereen", reden: "geen_diensten" };

  const diensten: PushDienst[] = dienstRijen.map((d) => ({
    klantId: d.klant_id,
    functie: d.functie,
    datum: d.datum,
    startTijd: d.start_tijd,
    eindTijd: d.eind_tijd,
    demo: isDemoKlantId(demoIds, d.klant_id),
    locatie: naarCoordinaat(d.geo_lat, d.geo_lng),
    weekStart: maandagVan(d.datum),
  }));

  // Alleen medewerkers uit de wereld van de klant (demo blijft gescheiden, zoals voorheen).
  const kandidaten = mw.data.filter((m) => demoIds.medewerkers.has(m.id) === demo);
  if (kandidaten.length === 0) return { modus: "gericht", ids: [], kandidaten: 0, redenen: {}, functieTerugval: 0 };

  const klantIds = [...new Set(diensten.map((d) => d.klantId).filter((k): k is string => !!k))];
  const weken = [...new Set(diensten.map((d) => d.weekStart).filter((w): w is string => !!w))];

  const overrides = new Map<string, Map<string, unknown>>();
  const verborgen = new Map<string, Set<string>>();
  const rooster = new Map<string, BeschikbaarheidVelden>();

  // Per blok van 150 medewerkers: rooster (zoekt ook op e-mailadres), weekoverrides en verborgen
  // werkgevers. Zo past elke .in()-lijst in de URL en blijft elk antwoord onder de 1000 rijen.
  for (const blok of blokken(kandidaten)) {
    const ids = blok.map((m) => m.id);
    const [roosterBlok, ov, vb] = await Promise.all([
      beschikbaarheidPerMedewerker(blok),
      weken.length
        ? supabaseAdmin
            .from("medewerker_beschikbaarheid_overrides")
            .select("medewerker_id, week_start, beschikbaarheid")
            .in("medewerker_id", ids)
            .in("week_start", weken)
        : Promise.resolve({ data: [], error: null }),
      klantIds.length
        ? supabaseAdmin
            .from("medewerker_werkgever_voorkeuren")
            .select("medewerker_id, klant_id")
            .eq("soort", "verborgen")
            .in("medewerker_id", ids)
            .in("klant_id", klantIds)
        : Promise.resolve({ data: [], error: null }),
    ]);
    for (const [id, v] of roosterBlok) rooster.set(id, v);

    // Overrides zijn een aanvulling: lukt het ophalen niet, dan geldt het vaste rooster.
    if (ov.error) captureRouteError(ov.error, { route: "lib/push-doelgroep", action: "OVERRIDES" });
    for (const o of (ov.data ?? []) as { medewerker_id: string; week_start: string; beschikbaarheid: unknown }[]) {
      const perWeek = overrides.get(o.medewerker_id) ?? new Map<string, unknown>();
      perWeek.set(String(o.week_start).slice(0, 10), o.beschikbaarheid);
      overrides.set(o.medewerker_id, perWeek);
    }

    // Tabel nog niet gemigreerd = niemand heeft iets verborgen. Een andere fout: doorgaan zonder
    // (liever een melding te veel dan iedereen missen) en naar Sentry.
    if (vb.error && !isOntbrekendeTabel(vb.error)) captureRouteError(vb.error, { route: "lib/push-doelgroep", action: "VERBORGEN" });
    for (const v of (vb.data ?? []) as { medewerker_id: string; klant_id: string }[]) {
      const set = verborgen.get(v.medewerker_id) ?? new Set<string>();
      set.add(v.klant_id);
      verborgen.set(v.medewerker_id, set);
    }
  }

  const leeg = new Set<string>();
  const medewerkers: PushMedewerker[] = kandidaten.map((m) => {
    const b = rooster.get(m.id);
    return {
      id: m.id,
      status: m.status,
      functie: m.functie,
      demo,
      rooster: b?.beschikbaarheid ?? null,
      beschikbaarVanaf: b?.beschikbaar_vanaf ?? null,
      overrides: overrides.get(m.id),
      locatie: naarCoordinaat(m.geo_lat, m.geo_lng),
      maxAfstandKm: m.max_afstand_km ?? null,
      verborgenKlantIds: verborgen.get(m.id) ?? leeg,
    };
  });
  // Per dienst iedereen die past; past er niemand op functie, dan de terugval (kiesOntvangers).
  const { ids, functieTerugval, redenen } = kiesOntvangers(medewerkers, diensten);

  return { modus: "gericht", ids, kandidaten: kandidaten.length, redenen, functieTerugval };
}

/** Push naar een lijst medewerkers, in blokken (lange .in()-lijsten lopen tegen de URL-limiet aan). */
export async function pushNaarMedewerkers(
  ids: readonly string[],
  stuur: (blok: string[]) => Promise<{ sent: number; failed: number }>,
): Promise<{ sent: number; failed: number }> {
  let sent = 0;
  let failed = 0;
  for (const blok of blokken(ids)) {
    const r = await stuur(blok);
    sent += r.sent;
    failed += r.failed;
  }
  return { sent, failed };
}
