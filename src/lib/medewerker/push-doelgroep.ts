import { supabaseAdmin } from "@/lib/supabase";
import { haalDemoIds } from "@/lib/demo";
import { isDemoKlantId } from "@/lib/demo-regels";
import { isOntbrekendeKolom } from "@/lib/db-kolom-fallback";
import { naarCoordinaat } from "@/lib/locatie/locatie-regels";
import { beschikbaarheidPerMedewerker } from "@/lib/medewerker/beschikbaarheid-bron";
import { maandagVan } from "@/lib/medewerker/beschikbaarheid";
import { isOntbrekendeTabel } from "@/lib/medewerker/werkgever-voorkeuren";
import { moetPushKrijgenVoorEen, type PushDienst, type PushMedewerker } from "@/lib/medewerker/push-doelgroep-regels";

/**
 * DB-kant van de gerichte push bij een nieuwe dienst (regels: push-doelgroep-regels.ts).
 *
 * Zonder migratie 20261023_ontdekken_afstand_werkgevers.sql (kolommen geo_* en max_afstand_km
 * ontbreken: 42703/PGRST204) geeft dit `iedereen`: dan gaat de push zoals voorheen naar alle
 * medewerkers van de juiste wereld (sendPushToAllOfType). Een andere databasefout wordt gegooid;
 * pushNieuweDienst (lib/klant-controle.ts) valt dan ook terug op de oude push.
 */

export type PushDoelgroep =
  | { modus: "gericht"; ids: string[]; kandidaten: number }
  | { modus: "iedereen"; reden: "geen_diensten" | "migratie_ontbreekt" | "databasefout" };

type DienstRij = { id: string; klant_id: string | null; functie: string | null; datum: string; start_tijd: string; geo_lat: unknown; geo_lng: unknown };
type MedewerkerRij = { id: string; email: string | null; functie: string | string[] | null; status: string | null; geo_lat: unknown; geo_lng: unknown; max_afstand_km: number | null };

/** PostgREST-blokken klein houden (URL-lengte). */
const BLOK = 150;

function blokken<T>(lijst: readonly T[]): T[][] {
  const uit: T[][] = [];
  for (let i = 0; i < lijst.length; i += BLOK) uit.push(lijst.slice(i, i + BLOK));
  return uit;
}

export async function bepaalPushDoelgroep(dienstIds: readonly string[], demo: boolean): Promise<PushDoelgroep> {
  if (dienstIds.length === 0) return { modus: "iedereen", reden: "geen_diensten" };

  const [dn, mw, demoIds] = await Promise.all([
    supabaseAdmin.from("diensten").select("id, klant_id, functie, datum, start_tijd, geo_lat, geo_lng").in("id", [...dienstIds]),
    supabaseAdmin
      .from("medewerkers")
      .select("id, email, functie, status, geo_lat, geo_lng, max_afstand_km")
      .eq("status", "actief")
      .limit(5000),
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
    demo: isDemoKlantId(demoIds, d.klant_id),
    locatie: naarCoordinaat(d.geo_lat, d.geo_lng),
    weekStart: maandagVan(d.datum),
  }));

  // Alleen medewerkers uit de wereld van de klant (demo blijft gescheiden, zoals voorheen).
  const kandidaten = ((mw.data ?? []) as MedewerkerRij[]).filter((m) => demoIds.medewerkers.has(m.id) === demo);
  if (kandidaten.length === 0) return { modus: "gericht", ids: [], kandidaten: 0 };

  const klantIds = [...new Set(diensten.map((d) => d.klantId).filter((k): k is string => !!k))];
  const weken = [...new Set(diensten.map((d) => d.weekStart).filter((w): w is string => !!w))];

  const [roosterBlokken, overridesRes, verborgenRes] = await Promise.all([
    // In blokken: beschikbaarheidPerMedewerker zoekt ook op e-mailadres (.in), dat moet in de URL passen.
    Promise.all(blokken(kandidaten).map((blok) => beschikbaarheidPerMedewerker(blok))),
    weken.length
      ? supabaseAdmin.from("medewerker_beschikbaarheid_overrides").select("medewerker_id, week_start, beschikbaarheid").in("week_start", weken)
      : Promise.resolve({ data: [], error: null }),
    klantIds.length
      ? supabaseAdmin.from("medewerker_werkgever_voorkeuren").select("medewerker_id, klant_id").eq("soort", "verborgen").in("klant_id", klantIds)
      : Promise.resolve({ data: [], error: null }),
  ]);

  const rooster = new Map(roosterBlokken.flatMap((m) => [...m.entries()]));

  // Overrides zijn een aanvulling: lukt het ophalen niet, dan geldt het vaste rooster.
  const overrides = new Map<string, Map<string, unknown>>();
  if (!overridesRes.error) {
    for (const o of (overridesRes.data ?? []) as { medewerker_id: string; week_start: string; beschikbaarheid: unknown }[]) {
      const perWeek = overrides.get(o.medewerker_id) ?? new Map<string, unknown>();
      perWeek.set(String(o.week_start).slice(0, 10), o.beschikbaarheid);
      overrides.set(o.medewerker_id, perWeek);
    }
  }

  const verborgen = new Map<string, Set<string>>();
  if (verborgenRes.error && !isOntbrekendeTabel(verborgenRes.error)) throw verborgenRes.error;
  for (const v of (verborgenRes.data ?? []) as { medewerker_id: string; klant_id: string }[]) {
    const set = verborgen.get(v.medewerker_id) ?? new Set<string>();
    set.add(v.klant_id);
    verborgen.set(v.medewerker_id, set);
  }

  const leeg = new Set<string>();
  const ids = kandidaten
    .filter((m) => {
      const b = rooster.get(m.id);
      const medewerker: PushMedewerker = {
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
      return moetPushKrijgenVoorEen(medewerker, diensten);
    })
    .map((m) => m.id);

  return { modus: "gericht", ids, kandidaten: kandidaten.length };
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
