import { supabaseAdmin } from "@/lib/supabase";
import { isOntbrekendeKolom, leesMetKolomFallback, schrijfMetKolomFallback, type DbFout } from "@/lib/db-kolom-fallback";
import { captureRouteError } from "@/lib/sentry-utils";
import { nlVandaag } from "@/lib/nl-tijd";
import { sessieVerwijderenAan } from "@/lib/id-check/config";
import { haalDiditBeslissing, templateBewaard, verwijderDiditSessie, type DiditSessie } from "@/lib/id-check/didit-api";
import {
  CONTROLERECORD_KOLOMMEN,
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
import { controlerecordVelden, GEWERKTE_AANMELDING_STATUSSEN, idBewaarTot, type VideocallRecord } from "@/lib/id-check/controlerecord";

/**
 * DB-kant van de ID-controle (tabel `id_verificaties`, migraties 20261024_id_verificaties_didit.sql
 * en 20261024_id_controlerecord_wav.sql). De regels staan puur in lib/id-check/regels.ts en
 * lib/id-check/controlerecord.ts.
 *
 * Per controle bewaren we het controlerecord (juridisch advies, Wav): naam en geboortedatum zoals op
 * het document, nationaliteit, documentsoort, documentnummer, vervaldatum, uitslag, wie en wanneer.
 * Nooit het persoonsnummer/BSN, adres, beelden of de ruwe payload. `medewerker_id` wordt null als
 * het account verdwijnt; het record blijft tot `bewaar_tot` (retentie-cron).
 *
 * Zolang de tweede migratie niet gedraaid is, schrijft alles zonder de recordkolommen
 * (CONTROLERECORD_KOLOMMEN, via schrijfMetKolomFallback): dan werkt de controle zoals vóór het advies.
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
  /** null als het account van de werknemer is verwijderd (het record blijft bestaan). */
  medewerker_id: string | null;
  methode: "didit" | "videocall" | "kopie";
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

/** Kolommen die er ook vóór 20261024_id_controlerecord_wav.sql al waren (lezen werkt dus altijd). */
const KOLOMMEN =
  "id, medewerker_id, methode, didit_session_id, didit_sessienummer, didit_status, status, beslissing, beslist_door, beslist_op, reden, handmatig_redenen, vervaldatum, eer, naam_komt_overeen, documentsoort, uitgifteland, medewerker_document_id, laatste_event_id, sessie_verwijderd_op, aangemaakt_op, bijgewerkt_op";

/** Schrijven met de recordkolommen; ontbreken die (migratie nog niet gedraaid), dan zonder. */
function schrijf<R>(data: Record<string, unknown>, actie: (data: Record<string, unknown>) => PromiseLike<{ data: R | null; error: DbFout }>) {
  return schrijfMetKolomFallback<R>(data, CONTROLERECORD_KOLOMMEN, actie);
}

// --- Bewaartermijn (Wav) ---------------------------------------------------------------------------

/**
 * Datum van de laatste dienst (ingepland of voltooid, tot en met vandaag) van een medewerker, of null.
 * Sorteert op de dienstdatum zelf, dus één rij, ook bij duizenden diensten.
 */
export async function haalLaatsteDienstDatum(medewerkerId: string, vandaag = nlVandaag()): Promise<string | null> {
  const { data, error } = await supabaseAdmin
    .from("diensten")
    .select("datum, dienst_aanmeldingen!inner(medewerker_id, status)")
    .eq("dienst_aanmeldingen.medewerker_id", medewerkerId)
    .in("dienst_aanmeldingen.status", [...GEWERKTE_AANMELDING_STATUSSEN])
    .lte("datum", vandaag)
    .order("datum", { ascending: false })
    .limit(1);
  if (error) throw Object.assign(new Error(error.message ?? "Databasefout"), { code: error.code });
  const datum = (data?.[0] as { datum?: string | null } | undefined)?.datum ?? null;
  return datum ? datum.slice(0, 10) : null;
}

/**
 * Bewaar-tot voor het controlerecord van deze medewerker: 31-12 van (jaar laatste dienst + 5), zonder
 * diensten vanaf het jaar van `beslisdatum`. Lukt het opzoeken niet, dan vanaf de beslisdatum (de
 * retentie-cron rekent elke nacht opnieuw).
 */
export async function bewaarTotVoorMedewerker(medewerkerId: string | null, beslisdatum = nlVandaag()): Promise<string> {
  if (!medewerkerId) return idBewaarTot({ laatsteDienst: null, beslisdatum });
  try {
    return idBewaarTot({ laatsteDienst: await haalLaatsteDienstDatum(medewerkerId), beslisdatum });
  } catch (fout) {
    captureRouteError(fout, { route: ROUTE, action: "LAATSTE_DIENST" });
    return idBewaarTot({ laatsteDienst: null, beslisdatum });
  }
}

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

export type GoedkeurResultaat = { ok: true; documentId: string } | { ok: false; reden: "al_beslist" | "geen_account" };

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
  const medewerkerId = input.rij.medewerker_id;
  // Account verwijderd terwijl de controle openstond: niets meer goed te keuren.
  if (!medewerkerId) return { ok: false, reden: "geen_account" };
  const nu = new Date().toISOString();
  // De webhook rekende de termijn al uit (verificatieUpdateNaBeoordeling); anders nu.
  const bewaarTot = typeof input.update.bewaar_tot === "string" ? input.update.bewaar_tot : await bewaarTotVoorMedewerker(medewerkerId);
  const { data: geclaimd, error } = await schrijf(
    {
      ...input.update,
      status: "goedgekeurd",
      beslissing: "goedgekeurd",
      beslist_door: input.beoordeeldDoor.slice(0, 200),
      beslist_op: nu,
      vervaldatum: input.vervaldatum,
      bewaar_tot: bewaarTot,
      bijgewerkt_op: nu,
    },
    (data) =>
      supabaseAdmin
        .from(TABEL)
        .update(data)
        .eq("id", input.rij.id)
        .not("status", "in", "(goedgekeurd,afgewezen)")
        .select("id")
        .maybeSingle(),
  );
  if (error) gooi(error);
  if (!geclaimd) return { ok: false, reden: "al_beslist" };

  const { data: document, error: docFout } = await supabaseAdmin
    .from("medewerker_documenten")
    .insert(
      idBewijsRijZonderBestand({
        medewerkerId,
        vervaldatum: input.vervaldatum,
        methode: input.rij.methode === "didit" ? "didit" : "videocall",
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

/**
 * Afwijzen door een mens (nooit automatisch). `update` = extra recordvelden (videocall). Ook een
 * afgewezen controle krijgt een bewaartermijn: het record bevat persoonsgegevens.
 */
export async function wijsAf(input: {
  id: string;
  medewerkerId: string | null;
  reden: string;
  door: string;
  update?: Record<string, unknown>;
}): Promise<"ok" | "al_beslist"> {
  const nu = new Date().toISOString();
  const { data, error } = await schrijf(
    {
      ...(input.update ?? {}),
      status: "afgewezen",
      beslissing: "afgewezen",
      beslist_door: input.door.slice(0, 200),
      beslist_op: nu,
      reden: input.reden.slice(0, 2000),
      bewaar_tot: await bewaarTotVoorMedewerker(input.medewerkerId),
      bijgewerkt_op: nu,
    },
    (data) =>
      supabaseAdmin
        .from(TABEL)
        .update(data)
        .eq("id", input.id)
        .not("status", "in", "(goedgekeurd,afgewezen)")
        .select("id")
        .maybeSingle(),
  );
  if (error) gooi(error);
  return data ? "ok" : "al_beslist";
}

/** Een controle op id (voor de admin-acties). */
export async function haalIdCheck(id: string): Promise<IdVerificatieRij | null> {
  return haalOpId(id);
}

/**
 * Admin: "ID gecontroleerd via videocall" (advies punt 2). Gebruikt het openstaande videocall-verzoek
 * van de medewerker, of maakt er een (er kan er maar één tegelijk openstaan), en legt het record vast:
 * naam, geboortedatum, nationaliteit, documentsoort, documentnummer, vervaldatum en uitslag; datum en
 * beoordelaar automatisch. Controleer de invoer eerst met controleerVideocallInvoer (niet-EER kan
 * niet worden goedgekeurd).
 */
export type VideocallResultaat =
  | { ok: true; uitkomst: "goedgekeurd"; documentId: string }
  | { ok: true; uitkomst: "afgewezen" | "kopie_nodig" }
  | { ok: false; reden: "al_beslist" | "geen_account" };

export async function beslisViaVideocall(input: {
  medewerkerId: string;
  record: VideocallRecord;
  door: string;
}): Promise<VideocallResultaat> {
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
  const verzoekId = rij.id;

  const { record } = input;
  const velden = controlerecordVelden({
    naam: record.naam,
    geboortedatum: record.geboortedatum,
    nationaliteit: record.nationaliteit,
    documentsoort: record.documentsoort,
    documentnummer: record.documentnummer,
    vervaldatum: record.vervaldatum,
    // Zonder bewaarTot: keurGoed en wijsAf rekenen de termijn zelf uit (laatste dienst).
  });

  if (record.uitslag === "afgewezen") {
    const uitkomst = await wijsAf({
      id: rij.id,
      medewerkerId: input.medewerkerId,
      reden: record.reden ?? "Afgewezen na videocall",
      door: input.door,
      update: { ...velden, handmatig_redenen: [] },
    });
    return uitkomst === "ok" ? { ok: true, uitkomst: "afgewezen" } : { ok: false, reden: "al_beslist" };
  }

  if (record.uitslag === "kopie_nodig") {
    // Buiten de EER: de videocall volstaat niet (Wav art. 15). De controle blijft open bij de admin
    // (handmatig, reden kopie_nodig) en de werknemer mag zijn ID uploaden (kopieNodig).
    const nu = new Date().toISOString();
    const { data, error } = await schrijf(
      {
        ...velden,
        status: "handmatig",
        handmatig_redenen: ["kopie_nodig"],
        reden: record.reden,
        bewaar_tot: await bewaarTotVoorMedewerker(input.medewerkerId),
        bijgewerkt_op: nu,
      },
      (data) =>
        supabaseAdmin
          .from(TABEL)
          .update(data)
          .eq("id", verzoekId)
          .eq("status", "videocall_gevraagd")
          .select("id")
          .maybeSingle(),
    );
    if (error) gooi(error);
    return data ? { ok: true, uitkomst: "kopie_nodig" } : { ok: false, reden: "al_beslist" };
  }

  const resultaat = await keurGoed({
    rij: { ...rij, methode: "videocall" },
    update: { ...velden, reden: record.reden, handmatig_redenen: [] },
    vervaldatum: record.vervaldatum,
    beoordeeldDoor: input.door,
    opmerking: record.reden,
  });
  return resultaat.ok ? { ok: true, uitkomst: "goedgekeurd", documentId: resultaat.documentId } : resultaat;
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
 * Sessie bij Didit verwijderen en `sessie_verwijderd_op` zetten. Logt `face_retention_outcome` uit
 * het antwoord (alleen dat veld); meldt Didit dat er toch een gezichtstemplate is bewaard, dan ook
 * naar Sentry. `privacyErasure` bij het verwijderen van een account (AVG-verwijderverzoek), met
 * een eigen referentie zonder persoonsgegevens. Gooit bij een fout.
 */
export async function verwijderDiditSessieVanRecord(input: {
  verificatieId: string;
  sessionId: string;
  privacyErasure?: boolean;
}): Promise<void> {
  const variant = input.privacyErasure ? "privacy_erasure" : "operational_session_delete";
  const resultaat = await verwijderDiditSessie(
    input.sessionId,
    input.privacyErasure ? { privacyErasure: true, instructionId: `toptalent-avg-${input.verificatieId}` } : {},
  );
  console.info(`[didit] sessie ${resultaat.uitkomst} (${variant}), face_retention_outcome=${resultaat.faceRetentionOutcome ?? "onbekend"}`);
  if (templateBewaard(resultaat.faceRetentionOutcome)) {
    captureRouteError(new Error("Didit meldt face_retention_outcome=retained_with_user terwijl wij retain_face_embeddings=false vragen"), {
      route: ROUTE,
      action: "DIDIT_TEMPLATE",
    });
  }
  await supabaseAdmin.from(TABEL).update({ sessie_verwijderd_op: new Date().toISOString() }).eq("id", input.verificatieId);
}

/**
 * Na een definitieve beslissing de sessie bij Didit verwijderen (beelden weg), tenzij
 * DIDIT_SESSIE_VERWIJDEREN=0. Fouten gaan naar Sentry; een volgende webhook of beslissing probeert
 * het opnieuw zolang `sessie_verwijderd_op` leeg is.
 */
export async function verwijderSessieNaBeslissing(verificatieId: string, sessionId: string | null): Promise<void> {
  if (!sessionId || !sessieVerwijderenAan()) return;
  try {
    await verwijderDiditSessieVanRecord({ verificatieId, sessionId });
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

  // Account verwijderd terwijl de sessie liep: niets meer te beoordelen.
  if (!rij.medewerker_id) return { code: "genegeerd" };

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
  const update = verificatieUpdateNaBeoordeling({
    beoordeling,
    diditStatus,
    eventId,
    nu,
    // Ook bij "handmatig": het record bevat dan al persoonsgegevens. Bij de beslissing opnieuw.
    bewaarTot: await bewaarTotVoorMedewerker(rij.medewerker_id),
  });

  if (beoordeling.status === "handmatig") {
    const { error } = await schrijf(update, (data) =>
      supabaseAdmin
        .from(TABEL)
        .update(data)
        .eq("id", rij.id)
        .not("status", "in", "(goedgekeurd,afgewezen)"),
    );
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

export type AdminIdCheck = IdVerificatieRij & {
  /** Naam en nationaliteit zoals op het document (null vóór migratie 20261024_id_controlerecord_wav). */
  naam?: string | null;
  nationaliteit?: string | null;
  medewerker: { naam: string | null; email: string | null; geboortedatum: string | null } | null;
};

/**
 * Controles die een mens moet beoordelen (handmatig of videocall gevraagd), oudste eerst. Zonder
 * account (verwijderd terwijl de controle openstond) valt er niets te beoordelen: die niet.
 */
export async function haalOpenIdChecks(): Promise<AdminIdCheck[]> {
  const { data, error } = await leesMetKolomFallback((metRecord) =>
    supabaseAdmin
      .from(TABEL)
      .select(`${KOLOMMEN}${metRecord ? ", naam, nationaliteit" : ""}, medewerker:medewerkers!medewerker_id(naam, email, geboortedatum)`)
      .in("status", [...OPEN_VOOR_ADMIN])
      .not("medewerker_id", "is", null)
      .order("aangemaakt_op", { ascending: true })
      .limit(200),
  );
  if (error) gooi(error);
  return ((data ?? []) as unknown as (IdVerificatieRij & { medewerker: unknown })[]).map((r) => {
    const m = Array.isArray(r.medewerker) ? r.medewerker[0] : r.medewerker;
    return { ...r, medewerker: (m as AdminIdCheck["medewerker"]) ?? null };
  });
}
