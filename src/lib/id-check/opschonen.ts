import { supabaseAdmin } from "@/lib/supabase";
import { leesMetKolomFallback, schrijfMetKolomFallback } from "@/lib/db-kolom-fallback";
import { logAuditEvent } from "@/lib/audit-log";
import type { AdminRole } from "@/lib/admin-auth";
import { nlDatum } from "@/lib/nl-tijd";
import { documentOpslagPad, MEDEWERKER_DOCUMENTEN_BUCKET } from "@/lib/medewerker/documenten";
import { haalLaatsteDienstDatum, IdCheckMigratieOntbreekt, isMigratieFout } from "@/lib/id-check/db";
import { idBewijsZonderBestandNaam } from "@/lib/id-check/regels";
import {
  beslisOpschoning,
  controleerOpschoonInvoer,
  idBewaarTot,
  isVolledigRecord,
  OPSCHOON_REDENEN,
  opschoonRecordNodig,
  opschoonRecordRij,
  type OpschoonBeslissing,
  type OpschoonBron,
} from "@/lib/id-check/controlerecord";

/**
 * Opschonen van oude ID-kopieën (juridisch advies punt 4, 24-10-2026). De regels staan puur in
 * lib/id-check/controlerecord.ts (beslisOpschoning); dit is de DB- en Storage-kant voor
 * api/admin/id-kopieen.
 *
 * - Inventaris: alle `medewerker_documenten` id_bewijs met een bestand en alle `kandidaat_documenten`
 *   type id, met status en of de werknemer al een volledig controlerecord heeft.
 * - Opschonen: eerst (zo nodig) het controlerecord, dan het bestand uit Storage, dan de documentregel.
 *   Valt een stap uit, dan kan de admin het opnieuw proberen: een bestand dat al weg is telt als weg.
 * - Opschoonlog: elke actie in `audit_log` (actie id_kopie_opgeschoond): wie, wanneer, welke regel,
 *   verwijderd of bewaard en waarom. Geen naam, geboortedatum of documentnummer in de log.
 */

const KANDIDAAT_BUCKET = process.env.SUPABASE_DOCUMENTS_BUCKET || "kandidaat-documenten";
export const OPSCHOON_ACTIE = "id_kopie_opgeschoond";
export const BEKIJK_ACTIE = "id_kopie_bekeken";

export class OpschoonFout extends Error {
  constructor(
    message: string,
    public readonly status: number,
  ) {
    super(message);
    this.name = "OpschoonFout";
  }
}

export type OpschoonRecordInfo = { methode: string; beslist_op: string | null; volledig: boolean } | null;

export type OpschoonItem = {
  sleutel: string;
  bron: OpschoonBron;
  document_id: string;
  medewerker_id: string | null;
  inschrijving_id: string | null;
  /** Naam en geboortedatum uit het profiel/de inschrijving (voor de weergave en om voor te vullen). */
  naam: string | null;
  email: string | null;
  geboortedatum: string | null;
  document_status: string | null;
  goedgekeurd: boolean;
  vervaldatum: string | null;
  geupload_op: string | null;
  onboarding_status: string | null;
  /** Medewerkerkopie, of een kandidaat die werknemer werd. */
  werknemer: boolean;
  status: "te_doen" | "bewaard";
  bewaar_tot: string | null;
  /** Nieuwste goedgekeurde controlerecord van de werknemer. */
  record: OpschoonRecordInfo;
  record_nodig: boolean;
  werknemer_heeft_eigen_kopie: boolean;
};

export type OpschoonLogRegel = {
  id: string;
  created_at: string;
  actor_email: string | null;
  summary: string;
  metadata: Record<string, unknown> | null;
};

type MedewerkerDocRij = {
  id: string;
  medewerker_id: string;
  file_path: string | null;
  file_url: string | null;
  review_status: string | null;
  reviewed_at: string | null;
  uploaded_at: string | null;
  expiry_date: string | null;
  verificatie_methode: string | null;
  bewaar_tot: string | null;
  medewerker?: unknown;
};

type KandidaatDocRij = {
  id: string;
  inschrijving_id: string;
  type: string;
  bestand_pad: string | null;
  status: string | null;
  reviewed_at: string | null;
  uploaded_at: string | null;
  bewaar_tot: string | null;
  vervaldatum?: string | null;
  inschrijving?: unknown;
};

type Inschrijving = {
  voornaam: string | null;
  tussenvoegsel: string | null;
  achternaam: string | null;
  email: string | null;
  geboortedatum: string | null;
  medewerker_id: string | null;
  onboarding_status: string | null;
};

const MW_KOLOMMEN =
  "id, medewerker_id, file_path, file_url, review_status, reviewed_at, uploaded_at, expiry_date, verificatie_methode, bewaar_tot";
const KD_KOLOMMEN = "id, inschrijving_id, type, bestand_pad, status, reviewed_at, uploaded_at, bewaar_tot";
const INSCHRIJVING = "inschrijving:inschrijvingen!inschrijving_id(voornaam, tussenvoegsel, achternaam, email, geboortedatum, medewerker_id, onboarding_status)";

function enkel<T>(waarde: unknown): T | null {
  const w = Array.isArray(waarde) ? waarde[0] : waarde;
  return (w as T | undefined) ?? null;
}

function kandidaatNaam(i: Inschrijving | null): string | null {
  if (!i) return null;
  const naam = [i.voornaam, i.tussenvoegsel, i.achternaam].map((d) => (d ?? "").trim()).filter(Boolean).join(" ");
  return naam || null;
}

function datumNl(tijdstip: string | null | undefined): string | null {
  if (!tijdstip) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(tijdstip)) return tijdstip;
  const d = new Date(tijdstip);
  return Number.isNaN(d.getTime()) ? null : nlDatum(d);
}

/** Gooit IdCheckMigratieOntbreekt als 20261024_id_controlerecord_wav.sql nog niet gedraaid is. */
async function controleerMigratie(): Promise<void> {
  const { error } = await supabaseAdmin.from("id_verificaties").select("id, bewaar_tot, documentnummer").limit(1);
  if (error && isMigratieFout(error)) throw new IdCheckMigratieOntbreekt();
  if (error) throw Object.assign(new Error(error.message ?? "Databasefout"), { code: error.code });
}

/** Nieuwste goedgekeurde controlerecords per medewerker. */
async function haalRecords(medewerkerIds: readonly string[]): Promise<Map<string, NonNullable<OpschoonRecordInfo>>> {
  const perMedewerker = new Map<string, NonNullable<OpschoonRecordInfo>>();
  for (let i = 0; i < medewerkerIds.length; i += 100) {
    const blok = medewerkerIds.slice(i, i + 100);
    const { data, error } = await supabaseAdmin
      .from("id_verificaties")
      .select("medewerker_id, methode, status, beslist_op, naam, geboortedatum, nationaliteit, documentsoort, vervaldatum")
      .in("medewerker_id", blok)
      .eq("status", "goedgekeurd")
      .order("beslist_op", { ascending: false });
    if (error) throw Object.assign(new Error(error.message ?? "Databasefout"), { code: error.code });
    for (const r of (data ?? []) as {
      medewerker_id: string;
      methode: string;
      status: string;
      beslist_op: string | null;
      naam: string | null;
      geboortedatum: string | null;
      nationaliteit: string | null;
      documentsoort: string | null;
      vervaldatum: string | null;
    }[]) {
      const volledig = isVolledigRecord(r);
      const huidig = perMedewerker.get(r.medewerker_id);
      // Een volledig record gaat voor; anders het nieuwste.
      if (!huidig || (volledig && !huidig.volledig)) {
        perMedewerker.set(r.medewerker_id, { methode: r.methode, beslist_op: r.beslist_op, volledig });
      }
    }
  }
  return perMedewerker;
}

async function haalMedewerkerKopieen(filter?: { documentId?: string; medewerkerId?: string }) {
  let query = supabaseAdmin
    .from("medewerker_documenten")
    .select(`${MW_KOLOMMEN}, medewerker:medewerkers!medewerker_id(naam, email, geboortedatum)`)
    .eq("document_type", "id_bewijs")
    .or("file_path.not.is.null,file_url.not.is.null");
  if (filter?.documentId) query = query.eq("id", filter.documentId);
  if (filter?.medewerkerId) query = query.eq("medewerker_id", filter.medewerkerId);
  const { data, error } = await query.order("uploaded_at", { ascending: true }).limit(1000);
  if (error) throw Object.assign(new Error(error.message ?? "Databasefout"), { code: error.code });
  return (data ?? []) as MedewerkerDocRij[];
}

async function haalKandidaatKopieen(documentId?: string) {
  const { data, error } = await leesMetKolomFallback((metVervaldatum) => {
    let query = supabaseAdmin
      .from("kandidaat_documenten")
      .select(`${KD_KOLOMMEN}${metVervaldatum ? ", vervaldatum" : ""}, ${INSCHRIJVING}`)
      .eq("type", "id");
    if (documentId) query = query.eq("id", documentId);
    return query.order("uploaded_at", { ascending: true }).limit(1000);
  });
  if (error) throw Object.assign(new Error(error.message ?? "Databasefout"), { code: error.code });
  return (data ?? []) as unknown as KandidaatDocRij[];
}

/** Bestaan deze medewerkers nog? (inschrijvingen.medewerker_id kan naar een verwijderd account wijzen) */
async function bestaandeMedewerkers(ids: readonly string[]): Promise<Set<string>> {
  const bestaand = new Set<string>();
  for (let i = 0; i < ids.length; i += 100) {
    const { data, error } = await supabaseAdmin.from("medewerkers").select("id").in("id", ids.slice(i, i + 100));
    if (error) throw Object.assign(new Error(error.message ?? "Databasefout"), { code: error.code });
    for (const m of (data ?? []) as { id: string }[]) bestaand.add(m.id);
  }
  return bestaand;
}

function medewerkerItem(d: MedewerkerDocRij, record: OpschoonRecordInfo): OpschoonItem {
  const m = enkel<{ naam: string | null; email: string | null; geboortedatum: string | null }>(d.medewerker);
  const goedgekeurd = d.review_status === "goedgekeurd";
  const bewaard = d.verificatie_methode === "kopie_wav";
  return {
    sleutel: `medewerker:${d.id}`,
    bron: "medewerker",
    document_id: d.id,
    medewerker_id: d.medewerker_id,
    inschrijving_id: null,
    naam: m?.naam ?? null,
    email: m?.email ?? null,
    geboortedatum: m?.geboortedatum ?? null,
    document_status: d.review_status,
    goedgekeurd,
    vervaldatum: d.expiry_date,
    geupload_op: d.uploaded_at,
    onboarding_status: null,
    werknemer: true,
    status: bewaard ? "bewaard" : "te_doen",
    bewaar_tot: d.bewaar_tot,
    record,
    record_nodig: opschoonRecordNodig({ werknemer: true, goedgekeurd, heeftVolledigRecord: !!record?.volledig }),
    werknemer_heeft_eigen_kopie: true,
  };
}

function kandidaatItem(
  k: KandidaatDocRij,
  context: { medewerkerId: string | null; record: OpschoonRecordInfo; eigenKopie: boolean },
): OpschoonItem {
  const i = enkel<Inschrijving>(k.inschrijving);
  const werknemer = !!context.medewerkerId;
  const goedgekeurd = k.status === "goedgekeurd";
  return {
    sleutel: `kandidaat:${k.id}`,
    bron: "kandidaat",
    document_id: k.id,
    medewerker_id: context.medewerkerId,
    inschrijving_id: k.inschrijving_id,
    naam: kandidaatNaam(i),
    email: i?.email ?? null,
    geboortedatum: i?.geboortedatum ?? null,
    document_status: k.status,
    goedgekeurd,
    vervaldatum: k.vervaldatum ?? null,
    geupload_op: k.uploaded_at,
    onboarding_status: i?.onboarding_status ?? null,
    werknemer,
    status: k.bewaar_tot ? "bewaard" : "te_doen",
    bewaar_tot: k.bewaar_tot,
    record: context.record,
    record_nodig: opschoonRecordNodig({ werknemer, goedgekeurd, heeftVolledigRecord: !!context.record?.volledig }),
    werknemer_heeft_eigen_kopie: context.eigenKopie,
  };
}

/** Inventaris + opschoonlog. */
export async function haalOpschoonOverzicht(): Promise<{ items: OpschoonItem[]; log: OpschoonLogRegel[] }> {
  await controleerMigratie();
  const [medewerkerDocs, kandidaatDocs] = await Promise.all([haalMedewerkerKopieen(), haalKandidaatKopieen()]);

  const gekoppeld = [
    ...new Set(
      kandidaatDocs.map((k) => enkel<Inschrijving>(k.inschrijving)?.medewerker_id).filter((id): id is string => !!id),
    ),
  ];
  const bestaand = await bestaandeMedewerkers(gekoppeld);
  const medewerkerIds = [...new Set([...medewerkerDocs.map((d) => d.medewerker_id), ...bestaand])];
  const records = await haalRecords(medewerkerIds);
  const metEigenKopie = new Set(medewerkerDocs.map((d) => d.medewerker_id));

  const items: OpschoonItem[] = [
    ...medewerkerDocs.map((d) => medewerkerItem(d, records.get(d.medewerker_id) ?? null)),
    ...kandidaatDocs.map((k) => {
      const id = enkel<Inschrijving>(k.inschrijving)?.medewerker_id ?? null;
      const medewerkerId = id && bestaand.has(id) ? id : null;
      return kandidaatItem(k, {
        medewerkerId,
        record: medewerkerId ? (records.get(medewerkerId) ?? null) : null,
        eigenKopie: !!medewerkerId && metEigenKopie.has(medewerkerId),
      });
    }),
  ];

  const { data: log, error } = await supabaseAdmin
    .from("audit_log")
    .select("id, created_at, actor_email, summary, metadata")
    .eq("action", OPSCHOON_ACTIE)
    .order("created_at", { ascending: false })
    .limit(200);
  if (error) throw Object.assign(new Error(error.message ?? "Databasefout"), { code: error.code });

  return { items, log: (log ?? []) as OpschoonLogRegel[] };
}

// --- Eén regel ------------------------------------------------------------------------------------

type Regel =
  | { bron: "medewerker"; doc: MedewerkerDocRij; item: OpschoonItem; pad: string | null }
  | { bron: "kandidaat"; doc: KandidaatDocRij; item: OpschoonItem; pad: string | null };

async function haalRegel(bron: OpschoonBron, documentId: string): Promise<Regel> {
  if (bron === "medewerker") {
    const [doc] = await haalMedewerkerKopieen({ documentId });
    if (!doc) throw new OpschoonFout("Deze kopie bestaat niet (meer); misschien is hij al opgeschoond", 404);
    const records = await haalRecords([doc.medewerker_id]);
    const item = medewerkerItem(doc, records.get(doc.medewerker_id) ?? null);
    return { bron, doc, item, pad: documentOpslagPad(doc) };
  }
  const [doc] = await haalKandidaatKopieen(documentId);
  if (!doc) throw new OpschoonFout("Deze kopie bestaat niet (meer); misschien is hij al opgeschoond", 404);
  const gekoppeld = enkel<Inschrijving>(doc.inschrijving)?.medewerker_id ?? null;
  const medewerkerId = gekoppeld && (await bestaandeMedewerkers([gekoppeld])).has(gekoppeld) ? gekoppeld : null;
  const records = medewerkerId ? await haalRecords([medewerkerId]) : new Map();
  const eigenKopie = medewerkerId ? (await haalMedewerkerKopieen({ medewerkerId })).length > 0 : false;
  const item = kandidaatItem(doc, { medewerkerId, record: medewerkerId ? (records.get(medewerkerId) ?? null) : null, eigenKopie });
  return { bron, doc, item, pad: doc.bestand_pad || null };
}

/** Kortlevende link (5 minuten) om de kopie een laatste keer te bekijken; komt in de audit-log. */
export async function bekijkKopie(input: {
  bron: OpschoonBron;
  documentId: string;
  door: string | undefined;
  rol: AdminRole | undefined;
}): Promise<string> {
  const regel = await haalRegel(input.bron, input.documentId);
  if (!regel.pad) throw new OpschoonFout("Het bestand staat niet in de opslag van TopTalent", 409);
  const bucket = regel.bron === "medewerker" ? MEDEWERKER_DOCUMENTEN_BUCKET : KANDIDAAT_BUCKET;
  const { data, error } = await supabaseAdmin.storage.from(bucket).createSignedUrl(regel.pad, 5 * 60);
  if (error || !data?.signedUrl) throw new OpschoonFout("Het bestand kon niet worden geopend", 502);
  await logAuditEvent({
    actorEmail: input.door,
    actorRole: input.rol,
    action: BEKIJK_ACTIE,
    targetTable: regel.bron === "medewerker" ? "medewerker_documenten" : "kandidaat_documenten",
    targetId: input.documentId,
    summary: "ID-kopie bekeken bij het opschonen",
    metadata: { bron: input.bron },
  });
  return data.signedUrl;
}

export type OpschoonResultaat = {
  beslissing: OpschoonBeslissing;
  uitleg: string;
  record_id: string | null;
  bewaar_tot: string | null;
  opslag: "verwijderd" | "niet_gevonden" | "bewaard";
};

/** Foutcode 23514 (check-constraint) betekent hier: de nieuwe waarden zijn nog niet toegestaan. */
function isConstraintFout(fout: { code?: string | null } | null): boolean {
  return fout?.code === "23514";
}

/**
 * Eén kopie opschonen. `invoer` = wat de admin invulde (documentsoort, nationaliteit, vervaldatum,
 * en bij een record naam, geboortedatum en documentnummer) plus `bsn_zichtbaar` voor de log.
 */
export async function schoonKopieOp(input: {
  bron: OpschoonBron;
  documentId: string;
  invoer: Record<string, unknown>;
  door: string;
  rol: AdminRole | undefined;
  vandaag: string;
}): Promise<OpschoonResultaat> {
  await controleerMigratie();
  const regel = await haalRegel(input.bron, input.documentId);
  const { item } = regel;
  if (item.status === "bewaard") throw new OpschoonFout("Deze kopie is al beoordeeld en bewaard volgens de Wav", 409);
  if (regel.bron === "medewerker" && regel.doc.verificatie_methode) {
    throw new OpschoonFout("Deze kopie is al opgeschoond", 409);
  }

  const controle = controleerOpschoonInvoer(input.invoer, { werknemer: item.werknemer, recordNodig: item.record_nodig }, input.vandaag);
  if (!controle.ok) throw new OpschoonFout(controle.fout, 400);
  const waarden = controle.waarden;

  const beslissing = beslisOpschoning({
    bron: item.bron,
    werknemer: item.werknemer,
    eer: waarden ? waarden.eer : null,
    goedgekeurd: item.goedgekeurd,
    heeftVolledigRecord: !!item.record?.volledig,
    werknemerHeeftEigenKopie: item.werknemer_heeft_eigen_kopie,
  });

  // Bewaartermijnen: het record vanaf vandaag, een bewaarde kopie vanaf de goedkeuring/upload (zoals
  // de retentie-cron ze elke nacht opnieuw uitrekent), beide met de laatste dienst.
  const laatsteDienst = item.medewerker_id ? await haalLaatsteDienstDatum(item.medewerker_id, input.vandaag) : null;
  const recordBewaarTot = idBewaarTot({ laatsteDienst, beslisdatum: input.vandaag });
  const kopieBewaarTot = idBewaarTot({
    laatsteDienst,
    beslisdatum: datumNl(regel.doc.reviewed_at ?? regel.doc.uploaded_at) ?? input.vandaag,
  });
  const nu = new Date().toISOString();

  // 1. Controlerecord (eerst: valt het bestand straks weg, dan staat het record er al).
  let recordId: string | null = null;
  if (beslissing.record && waarden && item.medewerker_id) {
    const { data, error } = await supabaseAdmin
      .from("id_verificaties")
      .insert(
        opschoonRecordRij({
          medewerkerId: item.medewerker_id,
          medewerkerDocumentId: regel.bron === "medewerker" && beslissing.rij === "houden" ? regel.doc.id : null,
          waarden,
          door: input.door,
          nu,
          bewaarTot: recordBewaarTot,
          kopieGoedgekeurdOp: regel.doc.reviewed_at,
        }),
      )
      .select("id")
      .single();
    if (isConstraintFout(error) || isMigratieFout(error)) throw new IdCheckMigratieOntbreekt();
    if (error || !data) throw Object.assign(new Error(error?.message ?? "Controlerecord opslaan mislukt"), { code: error?.code });
    recordId = (data as { id: string }).id;
  }

  // 2. Bestand uit Storage.
  let opslag: OpschoonResultaat["opslag"] = "bewaard";
  if (beslissing.kopie === "verwijderen") {
    if (!regel.pad) {
      throw new OpschoonFout(
        "Het opslagpad van deze kopie is onbekend (externe link). Verwijder het bestand handmatig en neem contact op met de beheerder.",
        409,
      );
    }
    const bucket = regel.bron === "medewerker" ? MEDEWERKER_DOCUMENTEN_BUCKET : KANDIDAAT_BUCKET;
    const { data, error } = await supabaseAdmin.storage.from(bucket).remove([regel.pad]);
    if (error) throw new OpschoonFout("Het bestand kon niet uit de opslag worden verwijderd. Probeer het opnieuw.", 502);
    opslag = (data ?? []).length > 0 ? "verwijderd" : "niet_gevonden";
  }

  // 3. Documentregel.
  let bewaarTot: string | null = null;
  if (regel.bron === "medewerker") {
    if (beslissing.rij === "verwijderen") {
      const { error } = await supabaseAdmin.from("medewerker_documenten").delete().eq("id", regel.doc.id);
      if (error) throw Object.assign(new Error(error.message ?? "Documentregel verwijderen mislukt"), { code: error.code });
    } else {
      bewaarTot = kopieBewaarTot;
      const update: Record<string, unknown> =
        beslissing.kopie === "verwijderen"
          ? {
              file_path: null,
              file_url: null,
              file_size: null,
              file_name: idBewijsZonderBestandNaam("kopie_verwijderd"),
              verificatie_methode: "kopie_verwijderd",
              expiry_date: waarden?.vervaldatum ?? regel.doc.expiry_date,
              bewaar_tot: bewaarTot,
            }
          : { verificatie_methode: "kopie_wav", expiry_date: waarden?.vervaldatum ?? regel.doc.expiry_date, bewaar_tot: bewaarTot };
      const { error } = await supabaseAdmin
        .from("medewerker_documenten")
        .update(update)
        .eq("id", regel.doc.id)
        .is("verificatie_methode", null);
      if (isConstraintFout(error)) throw new IdCheckMigratieOntbreekt();
      if (error) throw Object.assign(new Error(error.message ?? "Documentregel bijwerken mislukt"), { code: error.code });
    }
  } else if (beslissing.rij === "verwijderen") {
    const { error } = await supabaseAdmin.from("kandidaat_documenten").delete().eq("id", regel.doc.id);
    if (error) throw Object.assign(new Error(error.message ?? "Documentregel verwijderen mislukt"), { code: error.code });
  } else {
    bewaarTot = kopieBewaarTot;
    const { error } = await schrijfMetKolomFallback(
      { bewaar_tot: bewaarTot, vervaldatum: waarden?.vervaldatum ?? null },
      ["vervaldatum"],
      (data) => supabaseAdmin.from("kandidaat_documenten").update(data).eq("id", regel.doc.id),
    );
    if (error) throw Object.assign(new Error(error.message ?? "Documentregel bijwerken mislukt"), { code: error.code });
  }

  // 4. Opschoonlog.
  const uitleg = OPSCHOON_REDENEN[beslissing.reden];
  await logAuditEvent({
    actorEmail: input.door,
    actorRole: input.rol,
    action: OPSCHOON_ACTIE,
    targetTable: regel.bron === "medewerker" ? "medewerker_documenten" : "kandidaat_documenten",
    targetId: regel.doc.id,
    summary: beslissing.kopie === "verwijderen" ? "ID-kopie verwijderd" : "ID-kopie bewaard volgens de Wav",
    metadata: {
      bron: regel.bron,
      document_id: regel.doc.id,
      medewerker_id: item.medewerker_id,
      inschrijving_id: item.inschrijving_id,
      resultaat: beslissing.kopie === "verwijderen" ? "verwijderd" : "bewaard",
      reden: beslissing.reden,
      uitleg,
      eer: waarden ? waarden.eer : null,
      nationaliteit: waarden?.nationaliteit ?? null,
      documentsoort: waarden?.documentsoort ?? null,
      bsn_zichtbaar: input.invoer.bsn_zichtbaar === true,
      documentregel: beslissing.rij === "verwijderen" ? "verwijderd" : beslissing.kopie === "verwijderen" ? "zonder_bestand" : "met_kopie",
      opslag,
      controlerecord_id: recordId,
      bewaar_tot: bewaarTot,
    },
  });

  return { beslissing, uitleg, record_id: recordId, bewaar_tot: bewaarTot, opslag };
}
