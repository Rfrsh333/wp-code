import { supabaseAdmin } from "@/lib/supabase";
import { captureRouteError } from "@/lib/sentry-utils";
import {
  cursorFilter,
  inBlokken,
  legeTelling,
  maakCursor,
  maakMeldingRijen,
  MELDING_CATEGORIEEN,
  MELDING_ONTDUBBEL_VENSTER_MS,
  nieuwsteKaartPerOntvanger,
  telling,
  verzamelMeldingIds,
  type MeldingCategorie,
  type MeldingenVraag,
  type MeldingIds,
  type MeldingInvoer,
  type MeldingRij,
  type MeldingUserType,
  type OngelezenTelling,
} from "@/lib/meldingen/meldingen-regels";

/**
 * Meldingencentrum, database-kant (regels: meldingen-regels.ts, tabel: migratie
 * 20261023_meldingencentrum.sql).
 *
 * Zolang de tabel niet bestaat (42P01 / PostgREST PGRST205) slaat opslaan niets op en geven de
 * leesfuncties `beschikbaar: false`; alles werkt dan zoals voorheen. Opslaan gooit nooit: een
 * mislukte insert mag een push of een route nooit breken (fout naar Sentry).
 *
 * Opslaan geeft per ontvanger het id van zijn melding terug (MeldingIds), voor `melding_id` in de
 * push (lib/push-notifications.ts).
 */

export type MeldingGebruiker = { type: MeldingUserType; id: string };

export type MeldingWeergave = {
  id: string;
  categorie: MeldingCategorie;
  titel: string;
  tekst: string;
  url: string | null;
  gelezen: boolean;
  gelezen_op: string | null;
  created_at: string;
};

type DbFout = { code?: string | null; message?: string | null } | null | undefined;

/** Resultaat van opslaan: aantal nieuwe rijen en per ontvanger het id van zijn melding. */
export type MeldingOpslag = { opgeslagen: number; ids: MeldingIds };

const NIETS_OPGESLAGEN = (): MeldingOpslag => ({ opgeslagen: 0, ids: new Map() });

/** Tabel (of een kolom) bestaat nog niet: migratie niet gedraaid. */
function tabelOntbreekt(fout: DbFout): boolean {
  return !!fout && ["42P01", "PGRST205", "42703", "PGRST204"].includes(fout.code ?? "");
}

// Zonder tabel faalt elke insert; dan een paar minuten niet opnieuw proberen (per serverinstantie).
const ONTBREEKT_TTL_MS = 5 * 60_000;
let ontbreektTot = 0;

const ROUTE = "lib/meldingen";
/** Ontvangers ophalen per pagina (Supabase geeft er hooguit max_rows tegelijk, standaard 1000). */
const PAGINA = 1000;
const MAX_PAGINAS = 100;
/** .in()-lijsten klein houden (URL-lengte), zoals in medewerker/push-doelgroep.ts. */
const IN_BLOK = 150;
/**
 * Accounts met deze status kunnen niet inloggen en krijgen geen nieuwe meldingen (een verwijderd
 * klantaccount wordt geanonimiseerd naar `verwijderd`, of `inactief` als die waarde niet mag).
 */
const GEEN_MELDINGEN_BIJ_STATUS = ["verwijderd", "inactief"];

function tabelVan(userType: MeldingUserType): "medewerkers" | "klanten" {
  return userType === "medewerker" ? "medewerkers" : "klanten";
}

type NieuweMelding = { id: string; user_id: string };

/**
 * Rijen in blokken van 500 wegschrijven; geeft id en ontvanger van elke nieuwe rij terug. Gooit
 * nooit (aanroeper vangt alles af).
 */
async function schrijfRijen(rijen: MeldingRij[]): Promise<{ opgeslagen: number; nieuw: NieuweMelding[] }> {
  let opgeslagen = 0;
  const nieuw: NieuweMelding[] = [];
  for (const blok of inBlokken(rijen)) {
    const { data, error } = await supabaseAdmin.from("meldingen").insert(blok).select("id, user_id");
    if (!error) {
      opgeslagen += blok.length;
      nieuw.push(...((data ?? []) as NieuweMelding[]));
      continue;
    }
    if (tabelOntbreekt(error)) {
      ontbreektTot = Date.now() + ONTBREEKT_TTL_MS;
      return { opgeslagen, nieuw };
    }
    captureRouteError(error, { route: ROUTE, action: "OPSLAAN" });
  }
  return { opgeslagen, nieuw };
}

/**
 * Alleen ontvangers met een bestaand account dat niet verwijderd of inactief is (privacy: na het
 * verwijderen van een account geen nieuwe meldingen meer). Lukt de controle niet, dan liever een
 * melding te veel dan een gemiste: de rijen gaan dan ongefilterd door (fout naar Sentry).
 */
async function alleenBestaandeAccounts(rijen: MeldingRij[], userType: MeldingUserType): Promise<MeldingRij[]> {
  const toegestaan = new Set<string>();
  for (const blok of inBlokken(rijen.map((r) => r.user_id), IN_BLOK)) {
    const { data, error } = await supabaseAdmin.from(tabelVan(userType)).select("id, status").in("id", blok);
    if (error) {
      captureRouteError(error, { route: ROUTE, action: "ONTVANGERS_CONTROLE" });
      return rijen;
    }
    for (const r of (data ?? []) as { id: string; status: string | null }[]) {
      if (!GEEN_MELDINGEN_BIJ_STATUS.includes(r.status ?? "")) toegestaan.add(String(r.id).toLowerCase());
    }
  }
  return rijen.filter((r) => toegestaan.has(r.user_id));
}

/**
 * Ontdubbelen (sleutels): heeft een ontvanger binnen het venster al een kaart over hetzelfde (een
 * gemeenschappelijke sleutel, bv. dezelfde dienst), dan wordt deze kaart overgeslagen, of bij
 * `ontdubbel: "vervangen"` (de specifiekere melding, zoals een uitnodiging) de eerdere kaart
 * verwijderd. Lukt de controle niet, dan liever dubbel dan gemist (fout naar Sentry).
 * Klein restrisico: twee meldingen die op exact hetzelfde moment worden opgeslagen, zien elkaar niet.
 * `bestaand`: wie is overgeslagen → id van zijn nieuwste eerdere kaart (voor melding_id in de push).
 */
async function ontdubbel(
  rijen: MeldingRij[],
  userType: MeldingUserType,
  wijze: MeldingInvoer["ontdubbel"],
): Promise<{ rijen: MeldingRij[]; bestaand: MeldingIds }> {
  const sleutels = rijen[0]?.sleutels;
  if (!sleutels?.length) return { rijen, bestaand: new Map() };
  const grens = new Date(Date.now() - MELDING_ONTDUBBEL_VENSTER_MS).toISOString();
  const gevonden: { id: string; user_id: string; created_at: string | null }[] = [];
  for (const blok of inBlokken(rijen.map((r) => r.user_id), IN_BLOK)) {
    const { data, error } = await supabaseAdmin
      .from("meldingen")
      .select("id, user_id, created_at")
      .eq("user_type", userType)
      .in("user_id", blok)
      .overlaps("sleutels", sleutels)
      .gte("created_at", grens);
    if (error) {
      if (!tabelOntbreekt(error)) captureRouteError(error, { route: ROUTE, action: "ONTDUBBELEN" });
      return { rijen, bestaand: new Map() };
    }
    gevonden.push(...((data ?? []) as typeof gevonden));
  }
  if (gevonden.length === 0) return { rijen, bestaand: new Map() };
  const nieuwste = nieuwsteKaartPerOntvanger(gevonden);
  if (wijze !== "vervangen") return { rijen: rijen.filter((r) => !nieuwste.has(r.user_id)), bestaand: nieuwste };

  const weg = gevonden.map((r) => r.id);
  for (const blok of inBlokken(weg, IN_BLOK)) {
    const { error } = await supabaseAdmin.from("meldingen").delete().in("id", blok);
    if (error) captureRouteError(error, { route: ROUTE, action: "ONTDUBBELEN" });
  }
  return { rijen, bestaand: new Map() };
}

/** Ontdubbelen + wegschrijven; per ontvanger het id van zijn (nieuwe of eerdere) melding. */
async function ontdubbelEnSchrijf(
  rijen: MeldingRij[],
  userType: MeldingUserType,
  wijze: MeldingInvoer["ontdubbel"],
): Promise<MeldingOpslag> {
  const { rijen: teSchrijven, bestaand } = await ontdubbel(rijen, userType, wijze);
  const { opgeslagen, nieuw } = await schrijfRijen(teSchrijven);
  return { opgeslagen, ids: verzamelMeldingIds(nieuw, bestaand) };
}

/**
 * Sla één melding op voor elke ontvanger, in blokken van 500 rijen. Gooit nooit; geeft het aantal
 * opgeslagen rijen en per ontvanger het melding-id terug. Lukt een blok niet, dan gaan de andere
 * blokken toch door.
 */
export async function bewaarMeldingen(
  userIds: readonly string[],
  userType: MeldingUserType,
  invoer: MeldingInvoer,
): Promise<MeldingOpslag> {
  try {
    if (ontbreektTot > Date.now()) return NIETS_OPGESLAGEN();
    const rijen = maakMeldingRijen(userIds, userType, invoer);
    if (rijen.length === 0) return NIETS_OPGESLAGEN();
    const bestaand = await alleenBestaandeAccounts(rijen, userType);
    return await ontdubbelEnSchrijf(bestaand, userType, invoer.ontdubbel);
  } catch (e) {
    captureRouteError(e, { route: ROUTE, action: "OPSLAAN" });
    return NIETS_OPGESLAGEN();
  }
}

/**
 * Broadcast naar iedereen van een type (sendPushToAllOfType): een melding voor alle actieve
 * accounts uit dezelfde wereld (demo blijft gescheiden), ook wie geen pushabonnement heeft.
 * Gooit nooit. Elke ontvanger krijgt een eigen melding-id (MeldingIds).
 */
export async function bewaarMeldingenVoorIedereen(
  userType: MeldingUserType,
  invoer: MeldingInvoer,
  wereld: { demo: boolean; demoIds: ReadonlySet<string> },
): Promise<MeldingOpslag> {
  try {
    if (ontbreektTot > Date.now()) return NIETS_OPGESLAGEN();
    const ids: string[] = [];
    // Doorgaan tot een lege pagina: zo valt niemand weg als max_rows lager staat dan PAGINA.
    for (let pagina = 0, van = 0; pagina < MAX_PAGINAS; pagina++) {
      const { data, error } = await supabaseAdmin
        .from(tabelVan(userType))
        .select("id")
        .eq("status", "actief")
        .order("id", { ascending: true })
        .range(van, van + PAGINA - 1);
      if (error) {
        captureRouteError(error, { route: ROUTE, action: "ONTVANGERS" });
        return NIETS_OPGESLAGEN();
      }
      const rijen = (data ?? []) as { id: string }[];
      if (rijen.length === 0) break;
      ids.push(...rijen.map((r) => r.id));
      van += rijen.length;
    }
    // Al gefilterd op status 'actief': geen extra accountcontrole nodig.
    const wereldIds = ids.filter((id) => wereld.demoIds.has(id) === wereld.demo);
    return await ontdubbelEnSchrijf(maakMeldingRijen(wereldIds, userType, invoer), userType, invoer.ontdubbel);
  } catch (e) {
    captureRouteError(e, { route: ROUTE, action: "ONTVANGERS" });
    return NIETS_OPGESLAGEN();
  }
}

/** Lijst, nieuwste eerst, met cursor voor de volgende pagina. Een databasefout wordt gegooid. */
export async function haalMeldingen(
  gebruiker: MeldingGebruiker,
  vraag: MeldingenVraag,
): Promise<{ beschikbaar: boolean; meldingen: MeldingWeergave[]; volgende_cursor: string | null }> {
  let q = supabaseAdmin
    .from("meldingen")
    .select("id, categorie, titel, tekst, url, gelezen_op, created_at")
    .eq("user_type", gebruiker.type)
    .eq("user_id", gebruiker.id);
  if (vraag.categorie) q = q.eq("categorie", vraag.categorie);
  if (vraag.cursor) q = q.or(cursorFilter(vraag.cursor));
  const { data, error } = await q
    .order("created_at", { ascending: false })
    .order("id", { ascending: false })
    .limit(vraag.limiet + 1);

  if (tabelOntbreekt(error)) return { beschikbaar: false, meldingen: [], volgende_cursor: null };
  if (error) throw error;

  type Rij = Omit<MeldingWeergave, "gelezen">;
  const rijen = (data ?? []) as Rij[];
  const pagina = rijen.slice(0, vraag.limiet);
  const laatste = pagina[pagina.length - 1];
  return {
    beschikbaar: true,
    meldingen: pagina.map((r) => ({ ...r, tekst: r.tekst ?? "", gelezen: r.gelezen_op != null })),
    volgende_cursor: rijen.length > vraag.limiet && laatste ? maakCursor(laatste.created_at, laatste.id) : null,
  };
}

/** Ongelezen per categorie (drie tellingen, op de partiële index). */
export async function telOngelezen(gebruiker: MeldingGebruiker): Promise<{ beschikbaar: boolean; ongelezen: OngelezenTelling }> {
  const resultaten = await Promise.all(
    MELDING_CATEGORIEEN.map((categorie) =>
      supabaseAdmin
        .from("meldingen")
        .select("id", { count: "exact", head: true })
        .eq("user_type", gebruiker.type)
        .eq("user_id", gebruiker.id)
        .eq("categorie", categorie)
        .is("gelezen_op", null),
    ),
  );
  const fout = resultaten.find((r) => r.error)?.error;
  if (tabelOntbreekt(fout)) return { beschikbaar: false, ongelezen: legeTelling() };
  if (fout) throw fout;
  const per: Partial<Record<MeldingCategorie, number>> = {};
  MELDING_CATEGORIEEN.forEach((c, i) => (per[c] = resultaten[i].count ?? 0));
  return { beschikbaar: true, ongelezen: telling(per) };
}

/** Alleen het totaal ongelezen (badge): één telling. */
export async function telOngelezenTotaal(gebruiker: MeldingGebruiker): Promise<{ beschikbaar: boolean; totaal: number }> {
  const { count, error } = await supabaseAdmin
    .from("meldingen")
    .select("id", { count: "exact", head: true })
    .eq("user_type", gebruiker.type)
    .eq("user_id", gebruiker.id)
    .is("gelezen_op", null);
  if (tabelOntbreekt(error)) return { beschikbaar: false, totaal: 0 };
  if (error) throw error;
  return { beschikbaar: true, totaal: count ?? 0 };
}

/** Eén melding of alles (eventueel per categorie) als gelezen markeren. Alleen eigen meldingen. */
export async function markeerGelezen(
  gebruiker: MeldingGebruiker,
  wat: { id: string } | { alles: true; categorie: MeldingCategorie | null },
): Promise<{ beschikbaar: boolean; bijgewerkt: number }> {
  let q = supabaseAdmin
    .from("meldingen")
    .update({ gelezen_op: new Date().toISOString() }, { count: "exact" })
    .eq("user_type", gebruiker.type)
    .eq("user_id", gebruiker.id)
    .is("gelezen_op", null);
  if ("id" in wat) q = q.eq("id", wat.id);
  else if (wat.categorie) q = q.eq("categorie", wat.categorie);
  const { count, error } = await q;
  if (tabelOntbreekt(error)) return { beschikbaar: false, bijgewerkt: 0 };
  if (error) throw error;
  return { beschikbaar: true, bijgewerkt: count ?? 0 };
}

/** Alle meldingen van één account weg (account verwijderd). Gooit nooit. */
export async function wisMeldingen(userType: MeldingUserType, userId: string): Promise<void> {
  try {
    const { error } = await supabaseAdmin.from("meldingen").delete().eq("user_type", userType).eq("user_id", userId);
    if (error && !tabelOntbreekt(error)) captureRouteError(error, { route: ROUTE, action: "WISSEN" });
  } catch (e) {
    captureRouteError(e, { route: ROUTE, action: "WISSEN" });
  }
}

/** Opruimen (cron): alles van vóór `grens` (ISO) weg. Een databasefout wordt gegooid. */
export async function ruimMeldingenOp(grens: string): Promise<{ beschikbaar: boolean; verwijderd: number }> {
  const { count, error } = await supabaseAdmin.from("meldingen").delete({ count: "exact" }).lt("created_at", grens);
  if (tabelOntbreekt(error)) return { beschikbaar: false, verwijderd: 0 };
  if (error) throw error;
  return { beschikbaar: true, verwijderd: count ?? 0 };
}
