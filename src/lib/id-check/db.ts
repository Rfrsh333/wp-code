import { supabaseAdmin } from "@/lib/supabase";
import { isOntbrekendeKolom, type DbFout } from "@/lib/db-kolom-fallback";
import { captureRouteError } from "@/lib/sentry-utils";
import { nlVandaag } from "@/lib/nl-tijd";
import { sessieVerwijderenAan } from "@/lib/id-check/config";
import { haalDiditBeslissing, verwijderDiditSessie, type DiditSessie } from "@/lib/id-check/didit-api";
import {
  DIDIT_BESLIST,
  beoordeelDiditUitslag,
  idBewijsRijZonderBestand,
  idVerificatieUitBeslissing,
  isDefinitief,
  OPEN_VOOR_ADMIN,
  statusZonderBeslissing,
  verificatieUpdateNaBeoordeling,
  type IdCheckStatus,
} from "@/lib/id-check/regels";

/**
 * DB-kant van de ID-controle (tabel `id_verificaties`, migratie 20261024_id_verificaties_didit.sql).
 * De regels staan puur in lib/id-check/regels.ts.
 *
 * In deze tabel staan bewust GEEN naam, geboortedatum, documentnummer, persoonsnummer/BSN, adres of
 * beelden: alleen de uitslag en de velden uit `verificatieUpdateNaBeoordeling`.
 */

const TABEL = "id_verificaties";
const ROUTE = "lib/id-check/db";

/** Tabel of kolom ontbreekt (migratie nog niet gedraaid). */
export function isMigratieFout(fout: DbFout): boolean {
  return !!fout && (isOntbrekendeKolom(fout) || fout.code === "42P01" || fout.code === "PGRST205");
}

export class IdCheckMigratieOntbreekt extends Error {
  constructor() {
    super("Migratie 20261024_id_verificaties_didit.sql is nog niet gedraaid");
    this.name = "IdCheckMigratieOntbreekt";
  }
}

function gooi(fout: DbFout & object): never {
  if (isMigratieFout(fout)) throw new IdCheckMigratieOntbreekt();
  throw Object.assign(new Error(fout.message ?? "Databasefout"), { code: fout.code });
}

export type IdVerificatieRij = {
  id: string;
  medewerker_id: string;
  methode: "didit" | "videocall";
  didit_session_id: string | null;
  didit_sessienummer: number | null;
  didit_status: string | null;
  status: IdCheckStatus;
  beslissing: "goedgekeurd" | "afgewezen" | null;
  beslist_door: string | null;
  beslist_op: string | null;
  reden: string | null;
  handmatig_redenen: string[] | null;
  vervaldatum: string | null;
  eer: boolean | null;
  naam_komt_overeen: boolean | null;
  documentsoort: string | null;
  uitgifteland: string | null;
  medewerker_document_id: string | null;
  laatste_event_id: string | null;
  sessie_verwijderd_op: string | null;
  aangemaakt_op: string;
  bijgewerkt_op: string;
};

const KOLOMMEN =
  "id, medewerker_id, methode, didit_session_id, didit_sessienummer, didit_status, status, beslissing, beslist_door, beslist_op, reden, handmatig_redenen, vervaldatum, eer, naam_komt_overeen, documentsoort, uitgifteland, medewerker_document_id, laatste_event_id, sessie_verwijderd_op, aangemaakt_op, bijgewerkt_op";

/** De nieuwste ID-controle van een medewerker, of null. */
export async function haalLaatsteIdCheck(medewerkerId: string): Promise<IdVerificatieRij | null> {
  const { data, error } = await supabaseAdmin
    .from(TABEL)
    .select(KOLOMMEN)
    .eq("medewerker_id", medewerkerId)
    .order("aangemaakt_op", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) gooi(error);
  return (data as IdVerificatieRij | null) ?? null;
}

async function haalOpId(id: string): Promise<IdVerificatieRij | null> {
  const { data, error } = await supabaseAdmin.from(TABEL).select(KOLOMMEN).eq("id", id).maybeSingle();
  if (error) gooi(error);
  return (data as IdVerificatieRij | null) ?? null;
}

async function haalOpSessie(sessionId: string): Promise<IdVerificatieRij | null> {
  const { data, error } = await supabaseAdmin.from(TABEL).select(KOLOMMEN).eq("didit_session_id", sessionId).maybeSingle();
  if (error) gooi(error);
  return (data as IdVerificatieRij | null) ?? null;
}

/** Sessie opslaan na het aanmaken bij Didit. Bestaat hij al (Didit hergebruikte een lopende sessie), dan niets. */
export async function slaSessieOp(medewerkerId: string, sessie: DiditSessie): Promise<void> {
  const nu = new Date().toISOString();
  const { error } = await supabaseAdmin.from(TABEL).upsert(
    {
      medewerker_id: medewerkerId,
      methode: "didit",
      didit_session_id: sessie.sessionId,
      didit_sessienummer: sessie.sessienummer,
      didit_status: sessie.status.slice(0, 40),
      status: statusZonderBeslissing(sessie.status) ?? "gestart",
      aangemaakt_op: nu,
      bijgewerkt_op: nu,
    },
    { onConflict: "didit_session_id", ignoreDuplicates: true },
  );
  if (error) gooi(error);
}

// --- Goedkeuren / afwijzen -------------------------------------------------------------------------

export type GoedkeurResultaat = { ok: true; documentId: string } | { ok: false; reden: "al_beslist" };

/**
 * Zet een controle op goedgekeurd en maak de `medewerker_documenten`-rij (id_bewijs, goedgekeurd,
 * vervaldatum, zonder bestand). Eerst een voorwaardelijke update (alleen als er nog niet beslist is),
 * zodat twee gelijktijdige webhooks of twee admins nooit twee documenten maken.
 * Mislukt het document, dan gaat de controle terug naar "handmatig" en volgt er een fout.
 */
export async function keurGoed(input: {
  rij: Pick<IdVerificatieRij, "id" | "medewerker_id" | "methode">;
  update: Record<string, unknown>;
  vervaldatum: string | null;
  beoordeeldDoor: string;
  opmerking?: string | null;
}): Promise<GoedkeurResultaat> {
  const nu = new Date().toISOString();
  const { data: geclaimd, error } = await supabaseAdmin
    .from(TABEL)
    .update({
      ...input.update,
      status: "goedgekeurd",
      beslissing: "goedgekeurd",
      beslist_door: input.beoordeeldDoor.slice(0, 200),
      beslist_op: nu,
      vervaldatum: input.vervaldatum,
      bijgewerkt_op: nu,
    })
    .eq("id", input.rij.id)
    .not("status", "in", "(goedgekeurd,afgewezen)")
    .select("id")
    .maybeSingle();
  if (error) gooi(error);
  if (!geclaimd) return { ok: false, reden: "al_beslist" };

  const { data: document, error: docFout } = await supabaseAdmin
    .from("medewerker_documenten")
    .insert(
      idBewijsRijZonderBestand({
        medewerkerId: input.rij.medewerker_id,
        vervaldatum: input.vervaldatum,
        methode: input.rij.methode,
        beoordeeldDoor: input.beoordeeldDoor,
        nu,
        opmerking: input.opmerking ?? null,
      }),
    )
    .select("id")
    .single();

  if (docFout || !document) {
    await supabaseAdmin
      .from(TABEL)
      .update({
        status: "handmatig",
        beslissing: null,
        beslist_door: null,
        beslist_op: null,
        handmatig_redenen: ["opslaan_mislukt"],
        bijgewerkt_op: new Date().toISOString(),
      })
      .eq("id", input.rij.id);
    if (docFout) gooi(docFout);
    throw new Error("ID-bewijs kon niet worden opgeslagen");
  }

  const documentId = (document as { id: string }).id;
  const { error: koppelFout } = await supabaseAdmin.from(TABEL).update({ medewerker_document_id: documentId }).eq("id", input.rij.id);
  if (koppelFout) captureRouteError(koppelFout, { route: ROUTE, action: "KOPPEL_DOCUMENT" });
  return { ok: true, documentId };
}

/** Afwijzen door een mens (nooit automatisch). */
export async function wijsAf(input: { id: string; reden: string; door: string }): Promise<"ok" | "al_beslist"> {
  const nu = new Date().toISOString();
  const { data, error } = await supabaseAdmin
    .from(TABEL)
    .update({
      status: "afgewezen",
      beslissing: "afgewezen",
      beslist_door: input.door.slice(0, 200),
      beslist_op: nu,
      reden: input.reden.slice(0, 2000),
      bijgewerkt_op: nu,
    })
    .eq("id", input.id)
    .not("status", "in", "(goedgekeurd,afgewezen)")
    .select("id")
    .maybeSingle();
  if (error) gooi(error);
  return data ? "ok" : "al_beslist";
}

/** Een controle op id (voor de admin-acties). */
export async function haalIdCheck(id: string): Promise<IdVerificatieRij | null> {
  return haalOpId(id);
}

/**
 * Admin: "ID gecontroleerd via videocall". Gebruikt het openstaande videocall-verzoek van de
 * medewerker, of maakt er een (er kan er maar één tegelijk openstaan).
 */
export async function keurGoedViaVideocall(input: {
  medewerkerId: string;
  vervaldatum: string;
  door: string;
  opmerking?: string | null;
}): Promise<GoedkeurResultaat> {
  const zoekOpen = async () => {
    const { data, error } = await supabaseAdmin
      .from(TABEL)
      .select("id, medewerker_id, methode")
      .eq("medewerker_id", input.medewerkerId)
      .eq("status", "videocall_gevraagd")
      .limit(1)
      .maybeSingle();
    if (error) gooi(error);
    return data as Pick<IdVerificatieRij, "id" | "medewerker_id" | "methode"> | null;
  };

  let rij = await zoekOpen();
  if (!rij) {
    const nu = new Date().toISOString();
    const { data, error } = await supabaseAdmin
      .from(TABEL)
      .insert({ medewerker_id: input.medewerkerId, methode: "videocall", status: "videocall_gevraagd", aangemaakt_op: nu, bijgewerkt_op: nu })
      .select("id, medewerker_id, methode")
      .single();
    if (error?.code === "23505") rij = await zoekOpen();
    else if (error) gooi(error);
    else rij = data as Pick<IdVerificatieRij, "id" | "medewerker_id" | "methode">;
  }
  if (!rij) return { ok: false, reden: "al_beslist" };

  return keurGoed({
    rij: { ...rij, methode: "videocall" },
    update: { reden: input.opmerking ? input.opmerking.slice(0, 2000) : null, handmatig_redenen: [] },
    vervaldatum: input.vervaldatum,
    beoordeeldDoor: input.door,
    opmerking: input.opmerking ?? null,
  });
}

/** Medewerker vraagt een videocall aan. Bestaat er al een open verzoek, dan dat. */
export async function vraagVideocallAan(medewerkerId: string): Promise<{ nieuw: boolean }> {
  const nu = new Date().toISOString();
  const { error } = await supabaseAdmin
    .from(TABEL)
    .insert({ medewerker_id: medewerkerId, methode: "videocall", status: "videocall_gevraagd", aangemaakt_op: nu, bijgewerkt_op: nu });
  if (error?.code === "23505") return { nieuw: false };
  if (error) gooi(error);
  return { nieuw: true };
}

// --- Sessie bij Didit verwijderen ------------------------------------------------------------------

/**
 * Na een definitieve beslissing de sessie bij Didit verwijderen (beelden weg), tenzij
 * DIDIT_SESSIE_VERWIJDEREN=0. Fouten gaan naar Sentry; een volgende webhook of beslissing probeert
 * het opnieuw zolang `sessie_verwijderd_op` leeg is.
 */
export async function verwijderSessieNaBeslissing(verificatieId: string, sessionId: string | null): Promise<void> {
  if (!sessionId || !sessieVerwijderenAan()) return;
  try {
    await verwijderDiditSessie(sessionId);
    await supabaseAdmin.from(TABEL).update({ sessie_verwijderd_op: new Date().toISOString() }).eq("id", verificatieId);
  } catch (fout) {
    captureRouteError(fout, { route: ROUTE, action: "DIDIT_VERWIJDEREN" });
  }
}

// --- Webhook ---------------------------------------------------------------------------------------

export type DiditWebhook = {
  event_id?: unknown;
  webhook_type?: unknown;
  session_id?: unknown;
  session_kind?: unknown;
  status?: unknown;
  vendor_data?: unknown;
  decision?: unknown;
};

export type WebhookResultaat = {
  code: "genegeerd" | "dubbel" | "bijgewerkt" | "goedgekeurd" | "handmatig" | "al_beslist" | "onbekende_sessie";
  /** Sessie die na het antwoord bij Didit verwijderd moet worden. */
  verwijder?: { verificatieId: string; sessionId: string };
};

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function str(w: unknown, max = 100): string | null {
  return typeof w === "string" && w.trim() ? w.trim().slice(0, max) : null;
}

/**
 * Verwerk een (al op handtekening gecontroleerde) webhook. Idempotent: hetzelfde event twee keer, of
 * een event na een definitieve beslissing, verandert niets. De payload wordt nooit opgeslagen of
 * gelogd; alleen de velden uit de witte lijst gaan de database in.
 */
export async function verwerkDiditWebhook(body: DiditWebhook): Promise<WebhookResultaat> {
  const type = str(body.webhook_type, 60);
  if (type !== "status.updated" && type !== "data.updated") return { code: "genegeerd" };
  if (body.session_kind === "business") return { code: "genegeerd" };

  const sessionId = str(body.session_id, 100);
  const diditStatus = str(body.status, 40);
  const eventId = str(body.event_id, 100);
  const vendorData = str(body.vendor_data, 100);
  if (!sessionId || !diditStatus) return { code: "genegeerd" };

  let rij = await haalOpSessie(sessionId);
  if (!rij) {
    // Sessie die wij niet kennen (opslaan mislukte na het aanmaken, of aangemaakt in de console).
    // Alleen oppakken als vendor_data een bestaande medewerker is.
    if (!vendorData || !UUID.test(vendorData)) return { code: "onbekende_sessie" };
    const { data: medewerker } = await supabaseAdmin.from("medewerkers").select("id").eq("id", vendorData).maybeSingle();
    if (!medewerker) return { code: "onbekende_sessie" };
    await slaSessieOp(vendorData, { sessionId, sessienummer: null, url: "", status: "Not Started" });
    rij = await haalOpSessie(sessionId);
    if (!rij) return { code: "onbekende_sessie" };
  }

  if (vendorData && vendorData !== rij.medewerker_id) {
    captureRouteError(new Error("Didit-webhook: vendor_data hoort niet bij de medewerker van deze sessie"), {
      route: ROUTE,
      action: "VENDOR_DATA",
    });
    return { code: "genegeerd" };
  }

  if (eventId && rij.laatste_event_id === eventId) return { code: "dubbel" };

  if (isDefinitief(rij.status)) {
    // Al beslist. Was de sessie nog niet verwijderd, probeer dat dan opnieuw.
    return rij.sessie_verwijderd_op || !rij.didit_session_id
      ? { code: "al_beslist" }
      : { code: "al_beslist", verwijder: { verificatieId: rij.id, sessionId: rij.didit_session_id } };
  }

  const nu = new Date().toISOString();

  // Geen beslissing (gestart, bezig, verlopen).
  if (!DIDIT_BESLIST.includes(diditStatus)) {
    const nieuw = statusZonderBeslissing(diditStatus);
    // Een te laat binnenkomend "In Progress" mag een controle die al bij de admin ligt niet terugzetten;
    // alleen "Resubmitted" (Didit vraagt de medewerker iets opnieuw te doen) mag dat.
    const terugNaarBezig = rij.status === "handmatig" && (nieuw === "gestart" || nieuw === "bezig") && diditStatus !== "Resubmitted";
    const update: Record<string, unknown> = { didit_status: diditStatus, laatste_event_id: eventId, bijgewerkt_op: nu };
    if (nieuw && !terugNaarBezig) update.status = nieuw;
    const { error } = await supabaseAdmin
      .from(TABEL)
      .update(update)
      .eq("id", rij.id)
      .not("status", "in", "(goedgekeurd,afgewezen)");
    if (error) gooi(error);
    return { code: "bijgewerkt" };
  }

  // Approved / Declined / In Review: beoordelen. De beslissing zit normaal in de webhook; anders ophalen.
  let beslissing: unknown = body.decision;
  if (!beslissing) {
    try {
      beslissing = await haalDiditBeslissing(sessionId);
    } catch (fout) {
      captureRouteError(fout, { route: ROUTE, action: "BESLISSING_OPHALEN" });
      beslissing = null;
    }
  }
  const id = idVerificatieUitBeslissing(beslissing);
  beslissing = null; // niets van de payload langer vasthouden dan nodig

  const { data: medewerker } = await supabaseAdmin.from("medewerkers").select("naam").eq("id", rij.medewerker_id).maybeSingle();
  const beoordeling = beoordeelDiditUitslag({
    diditStatus,
    id,
    medewerkerNaam: (medewerker as { naam?: string | null } | null)?.naam ?? null,
    vandaag: nlVandaag(),
  });
  const update = verificatieUpdateNaBeoordeling({ beoordeling, diditStatus, eventId, nu });

  if (beoordeling.status === "handmatig") {
    const { error } = await supabaseAdmin
      .from(TABEL)
      .update(update)
      .eq("id", rij.id)
      .not("status", "in", "(goedgekeurd,afgewezen)");
    if (error) gooi(error);
    return { code: "handmatig" };
  }

  const resultaat = await keurGoed({
    rij,
    update,
    vervaldatum: beoordeling.velden.vervaldatum,
    beoordeeldDoor: String(update.beslist_door),
  });
  if (!resultaat.ok) return { code: "al_beslist" };
  return rij.didit_session_id
    ? { code: "goedgekeurd", verwijder: { verificatieId: rij.id, sessionId: rij.didit_session_id } }
    : { code: "goedgekeurd" };
}

// --- Admin-lijst -----------------------------------------------------------------------------------

export type AdminIdCheck = IdVerificatieRij & { medewerker: { naam: string | null; email: string | null } | null };

/** Controles die een mens moet beoordelen (handmatig of videocall gevraagd), oudste eerst. */
export async function haalOpenIdChecks(): Promise<AdminIdCheck[]> {
  const { data, error } = await supabaseAdmin
    .from(TABEL)
    .select(`${KOLOMMEN}, medewerker:medewerkers!medewerker_id(naam, email)`)
    .in("status", [...OPEN_VOOR_ADMIN])
    .order("aangemaakt_op", { ascending: true })
    .limit(200);
  if (error) gooi(error);
  return ((data ?? []) as unknown as (IdVerificatieRij & { medewerker: unknown })[]).map((r) => {
    const m = Array.isArray(r.medewerker) ? r.medewerker[0] : r.medewerker;
    return { ...r, medewerker: (m as AdminIdCheck["medewerker"]) ?? null };
  });
}
