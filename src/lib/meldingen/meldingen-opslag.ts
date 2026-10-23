import { supabaseAdmin } from "@/lib/supabase";
import { captureRouteError } from "@/lib/sentry-utils";
import {
  cursorFilter,
  inBlokken,
  legeTelling,
  maakCursor,
  maakMeldingRijen,
  MELDING_CATEGORIEEN,
  telling,
  type MeldingCategorie,
  type MeldingenVraag,
  type MeldingInvoer,
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

/** Tabel (of een kolom) bestaat nog niet: migratie niet gedraaid. */
function tabelOntbreekt(fout: DbFout): boolean {
  return !!fout && ["42P01", "PGRST205", "42703", "PGRST204"].includes(fout.code ?? "");
}

// Zonder tabel faalt elke insert; dan een paar minuten niet opnieuw proberen (per serverinstantie).
const ONTBREEKT_TTL_MS = 5 * 60_000;
let ontbreektTot = 0;

const ROUTE = "lib/meldingen";
const PAGINA = 1000;
const MAX_PAGINAS = 100;

/**
 * Sla één melding op voor elke ontvanger, in blokken van 500 rijen. Gooit nooit; geeft het aantal
 * opgeslagen rijen terug. Lukt een blok niet, dan gaan de andere blokken toch door.
 */
export async function bewaarMeldingen(
  userIds: readonly string[],
  userType: MeldingUserType,
  invoer: MeldingInvoer,
): Promise<number> {
  try {
    if (ontbreektTot > Date.now()) return 0;
    const rijen = maakMeldingRijen(userIds, userType, invoer);
    let opgeslagen = 0;
    for (const blok of inBlokken(rijen)) {
      const { error } = await supabaseAdmin.from("meldingen").insert(blok);
      if (!error) {
        opgeslagen += blok.length;
        continue;
      }
      if (tabelOntbreekt(error)) {
        ontbreektTot = Date.now() + ONTBREEKT_TTL_MS;
        return opgeslagen;
      }
      captureRouteError(error, { route: ROUTE, action: "OPSLAAN" });
    }
    return opgeslagen;
  } catch (e) {
    captureRouteError(e, { route: ROUTE, action: "OPSLAAN" });
    return 0;
  }
}

/**
 * Broadcast naar iedereen van een type (sendPushToAllOfType): een melding voor alle actieve
 * accounts uit dezelfde wereld (demo blijft gescheiden), ook wie geen pushabonnement heeft.
 * Gooit nooit.
 */
export async function bewaarMeldingenVoorIedereen(
  userType: MeldingUserType,
  invoer: MeldingInvoer,
  wereld: { demo: boolean; demoIds: ReadonlySet<string> },
): Promise<number> {
  try {
    if (ontbreektTot > Date.now()) return 0;
    const tabel = userType === "medewerker" ? "medewerkers" : "klanten";
    const ids: string[] = [];
    for (let pagina = 0; pagina < MAX_PAGINAS; pagina++) {
      const van = pagina * PAGINA;
      const { data, error } = await supabaseAdmin
        .from(tabel)
        .select("id")
        .eq("status", "actief")
        .order("id", { ascending: true })
        .range(van, van + PAGINA - 1);
      if (error) {
        captureRouteError(error, { route: ROUTE, action: "ONTVANGERS" });
        return 0;
      }
      const rijen = (data ?? []) as { id: string }[];
      ids.push(...rijen.map((r) => r.id));
      if (rijen.length < PAGINA) break;
    }
    return bewaarMeldingen(
      ids.filter((id) => wereld.demoIds.has(id) === wereld.demo),
      userType,
      invoer,
    );
  } catch (e) {
    captureRouteError(e, { route: ROUTE, action: "ONTVANGERS" });
    return 0;
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
