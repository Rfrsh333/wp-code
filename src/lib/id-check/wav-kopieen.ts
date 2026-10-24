import { supabaseAdmin } from "@/lib/supabase";
import { captureRouteError } from "@/lib/sentry-utils";
import type { AdminRole } from "@/lib/admin-auth";
import { nlDatum, nlVandaag } from "@/lib/nl-tijd";
import { documentOpslagPad, MEDEWERKER_DOCUMENTEN_BUCKET } from "@/lib/medewerker/documenten";
import { haalLaatsteDienstDatum, isMigratieFout } from "@/lib/id-check/db";
import { wavKopieBewaarTot } from "@/lib/id-check/controlerecord";
import {
  isWavDocument,
  WAV_KOPIE_LINK_SECONDEN,
  wavKopieenOverzicht,
  type WavBewaardDocumentRij,
  type WavBewaardRij,
  type WavDocumentRij,
  type WavKopieBron,
  type WavKopieItem,
} from "@/lib/id-check/wav-kopieen-overzicht";
import { isWavVergunning, WAV_VERGUNNINGEN } from "@/lib/medewerker/bestanden-bij-verwijderen";

/**
 * DB- en opslagkant van Admin → Medewerkers → Wav-kopieën (regels in
 * lib/id-check/wav-kopieen-overzicht): ID-kopieën en werk- of verblijfsvergunningen van werknemers
 * van buiten de EER/Zwitserland. Alleen lezen en een kortlevende link; elke keer openen komt in de
 * audit-log (actie wav_kopie_geopend: wie, wanneer, welk document).
 */

const ROUTE = "lib/id-check/wav-kopieen";
export const OPEN_ACTIE = "wav_kopie_geopend";

export class WavKopieFout extends Error {
  constructor(
    message: string,
    public readonly status: number,
  ) {
    super(message);
    this.name = "WavKopieFout";
  }
}

const DOC_KOLOMMEN =
  "id, medewerker_id, document_type, file_path, file_url, verificatie_methode, review_status, reviewed_at, expiry_date, uploaded_at, bewaar_tot";

function gooi(fout: { message?: string; code?: string }): never {
  throw Object.assign(new Error(fout.message ?? "Databasefout"), { code: fout.code });
}

function blokken<T>(lijst: readonly T[], grootte = 100): T[][] {
  const uit: T[][] = [];
  for (let i = 0; i < lijst.length; i += grootte) uit.push(lijst.slice(i, i + grootte));
  return uit;
}

function datumNl(tijdstip: string | null | undefined): string | null {
  if (!tijdstip) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(tijdstip)) return tijdstip;
  const d = new Date(tijdstip);
  return Number.isNaN(d.getTime()) ? null : nlDatum(d);
}

/** Controles per medewerker, nieuwste eerst (alleen eer en status). Zonder tabel: leeg. */
async function haalControles(medewerkerIds: readonly string[]): Promise<Map<string, { eer: boolean | null; status: string | null }[]>> {
  const perMedewerker = new Map<string, { eer: boolean | null; status: string | null }[]>();
  for (const blok of blokken(medewerkerIds)) {
    const { data, error } = await supabaseAdmin
      .from("id_verificaties")
      .select("medewerker_id, eer, status, aangemaakt_op")
      .in("medewerker_id", blok)
      .order("aangemaakt_op", { ascending: false });
    if (error) {
      if (isMigratieFout(error)) return perMedewerker;
      gooi(error);
    }
    for (const r of (data ?? []) as { medewerker_id: string; eer: boolean | null; status: string | null }[]) {
      perMedewerker.set(r.medewerker_id, [...(perMedewerker.get(r.medewerker_id) ?? []), { eer: r.eer, status: r.status }]);
    }
  }
  return perMedewerker;
}

/** Bestaande medewerkers (id → naam). */
async function haalMedewerkers(ids: readonly string[]): Promise<Map<string, string | null>> {
  const namen = new Map<string, string | null>();
  for (const blok of blokken(ids)) {
    const { data, error } = await supabaseAdmin.from("medewerkers").select("id, naam").in("id", blok);
    if (error) gooi(error);
    for (const m of (data ?? []) as { id: string; naam: string | null }[]) namen.set(m.id, m.naam);
  }
  return namen;
}

/**
 * Bewaar-tot van de kopieën van bestaande accounts zoals die nu zou gelden: 31-12 van (jaar laatste
 * dienst + 5), nooit eerder dan de datum op de rij (wavKopieBewaarTot). Lukt het opzoeken niet, dan
 * de datum op de rij.
 */
async function huidigeBewaarTot(docs: readonly (WavDocumentRij & { reviewed_at?: string | null })[]): Promise<Map<string, string>> {
  const vandaag = nlVandaag();
  const ids = [...new Set(docs.map((d) => d.medewerker_id))];
  const laatste = new Map<string, string | null>();
  for (const blok of blokken(ids, 5)) {
    const datums = await Promise.all(
      blok.map((id) =>
        haalLaatsteDienstDatum(id, vandaag).catch((fout) => {
          captureRouteError(fout, { route: ROUTE, action: "LAATSTE_DIENST" });
          return undefined;
        }),
      ),
    );
    blok.forEach((id, i) => {
      if (datums[i] !== undefined) laatste.set(id, datums[i] as string | null);
    });
  }
  const uitkomst = new Map<string, string>();
  for (const d of docs) {
    if (!laatste.has(d.medewerker_id)) continue;
    uitkomst.set(
      d.id,
      wavKopieBewaarTot({
        laatsteDienst: laatste.get(d.medewerker_id) ?? null,
        beslisdatum: datumNl(d.reviewed_at ?? d.uploaded_at) ?? vandaag,
        huidig: d.bewaar_tot,
      }),
    );
  }
  return uitkomst;
}

/**
 * De lijst. `ontbrekend` = migraties die nog niet gedraaid zijn (dan ontbreken de bewaarde stukken
 * van verwijderde accounts uit die tabel).
 */
export async function haalWavKopieen(): Promise<{ migratie: boolean; ontbrekend: string[]; items: WavKopieItem[] }> {
  const ontbrekend: string[] = [];
  const bewaardRes = await supabaseAdmin
    .from("id_wav_kopieen")
    .select("id, medewerker_id, naam, bestand_pad, vervaldatum, geupload_op, bewaar_tot")
    .order("geupload_op", { ascending: false })
    .limit(5000);
  if (bewaardRes.error) {
    if (!isMigratieFout(bewaardRes.error)) gooi(bewaardRes.error);
    ontbrekend.push("20261024_id_wav_kopieen.sql");
  }
  const bewaard = (bewaardRes.error ? [] : (bewaardRes.data ?? [])) as WavBewaardRij[];

  const documentRes = await supabaseAdmin
    .from("bewaarde_documenten")
    .select("id, medewerker_id, document_type, naam, bestand_pad, geupload_op, bewaar_tot")
    .in("document_type", [...WAV_VERGUNNINGEN])
    .order("geupload_op", { ascending: false })
    .limit(5000);
  if (documentRes.error) {
    if (!isMigratieFout(documentRes.error)) gooi(documentRes.error);
    ontbrekend.push("20261024_documenten_nawerk.sql");
  }
  const bewaardeDocumenten = (documentRes.error ? [] : (documentRes.data ?? [])) as WavBewaardDocumentRij[];

  const docRes = await supabaseAdmin
    .from("medewerker_documenten")
    .select(DOC_KOLOMMEN)
    .in("document_type", ["id_bewijs", ...WAV_VERGUNNINGEN])
    .or("file_path.not.is.null,file_url.not.is.null")
    .limit(5000);
  if (docRes.error) gooi(docRes.error);
  const documenten = (docRes.data ?? []) as (WavDocumentRij & { reviewed_at: string | null })[];

  const docMedewerkers = [...new Set(documenten.map((d) => d.medewerker_id))];
  const controles = await haalControles(docMedewerkers);
  const medewerkers = await haalMedewerkers([
    ...new Set(
      [...docMedewerkers, ...bewaard.map((b) => b.medewerker_id), ...bewaardeDocumenten.map((b) => b.medewerker_id)].filter(
        (id): id is string => !!id,
      ),
    ),
  ]);
  const wav = documenten.filter((d) => isWavDocument(d, controles.get(d.medewerker_id) ?? []));
  const bewaarTot = await huidigeBewaarTot(wav);

  return {
    migratie: ontbrekend.length === 0,
    ontbrekend,
    items: wavKopieenOverzicht({ bewaard, bewaardeDocumenten, documenten: wav, controles, medewerkers, bewaarTot }),
  };
}

/**
 * Kortlevende link (5 minuten) naar één Wav-kopie of vergunning. Alleen voor een document dat in de
 * lijst staat (zelfde selectie), en alleen als het openen in de audit-log is vastgelegd.
 */
export async function openWavKopie(input: {
  bron: WavKopieBron;
  id: string;
  door: string | undefined;
  rol: AdminRole | undefined;
}): Promise<string> {
  let pad: string | null = null;
  let medewerkerId: string | null = null;
  let accountBestaat = false;

  if (input.bron === "bewaard") {
    const { data, error } = await supabaseAdmin.from("id_wav_kopieen").select("id, medewerker_id, bestand_pad").eq("id", input.id).maybeSingle();
    if (error) {
      if (isMigratieFout(error)) throw new WavKopieFout("Migratie 20261024_id_wav_kopieen.sql ontbreekt", 503);
      gooi(error);
    }
    const rij = data as { medewerker_id: string | null; bestand_pad: string } | null;
    if (!rij) throw new WavKopieFout("Deze kopie bestaat niet (meer); misschien is de bewaartermijn voorbij", 404);
    pad = rij.bestand_pad;
    medewerkerId = rij.medewerker_id;
    accountBestaat = !!medewerkerId && (await haalMedewerkers([medewerkerId])).has(medewerkerId);
  } else if (input.bron === "bewaard_document") {
    const { data, error } = await supabaseAdmin
      .from("bewaarde_documenten")
      .select("id, medewerker_id, document_type, bucket, bestand_pad")
      .eq("id", input.id)
      .maybeSingle();
    if (error) {
      if (isMigratieFout(error)) throw new WavKopieFout("Migratie 20261024_documenten_nawerk.sql ontbreekt", 503);
      gooi(error);
    }
    const rij = data as { medewerker_id: string | null; document_type: string; bucket: string; bestand_pad: string } | null;
    // Alleen vergunningen: loonheffingsverklaring en contract horen niet in dit scherm.
    if (!rij || !isWavVergunning(rij.document_type)) {
      throw new WavKopieFout("Dit document bestaat niet (meer); misschien is de bewaartermijn voorbij", 404);
    }
    if (rij.bucket !== MEDEWERKER_DOCUMENTEN_BUCKET) throw new WavKopieFout("Het bestand staat niet in de opslag van TopTalent", 409);
    pad = rij.bestand_pad;
    medewerkerId = rij.medewerker_id;
    accountBestaat = !!medewerkerId && (await haalMedewerkers([medewerkerId])).has(medewerkerId);
  } else {
    const { data, error } = await supabaseAdmin.from("medewerker_documenten").select(DOC_KOLOMMEN).eq("id", input.id).maybeSingle();
    if (error) gooi(error);
    const doc = data as WavDocumentRij | null;
    if (!doc) throw new WavKopieFout("Dit document bestaat niet (meer)", 404);
    const controles = await haalControles([doc.medewerker_id]);
    if (!isWavDocument(doc, controles.get(doc.medewerker_id) ?? [])) {
      throw new WavKopieFout("Dit document is geen Wav-kopie of vergunning", 404);
    }
    pad = documentOpslagPad(doc);
    medewerkerId = doc.medewerker_id;
    accountBestaat = true;
  }
  if (!pad) throw new WavKopieFout("Het bestand staat niet in de opslag van TopTalent", 409);

  const { data: link, error: linkFout } = await supabaseAdmin.storage.from(MEDEWERKER_DOCUMENTEN_BUCKET).createSignedUrl(pad, WAV_KOPIE_LINK_SECONDEN);
  if (linkFout || !link?.signedUrl) {
    if (linkFout) captureRouteError(linkFout, { route: ROUTE, action: "LINK" });
    throw new WavKopieFout("Het bestand kon niet worden geopend", 502);
  }

  // Eerst vastleggen, dan pas de link geven: geen openen zonder regel in de audit-log.
  const { error: logFout } = await supabaseAdmin.from("audit_log").insert({
    actor_email: input.door || null,
    actor_role: input.rol || null,
    action: OPEN_ACTIE,
    target_table: { bewaard: "id_wav_kopieen", bewaard_document: "bewaarde_documenten", medewerker: "medewerker_documenten" }[input.bron],
    target_id: input.id,
    summary: "Wav-kopie of vergunning geopend",
    metadata: { bron: input.bron, medewerker_id: medewerkerId, account_bestaat: accountBestaat },
  });
  if (logFout) {
    captureRouteError(logFout, { route: ROUTE, action: "AUDIT_LOG" });
    throw new WavKopieFout("Het openen kon niet worden vastgelegd. Probeer het opnieuw.", 500);
  }
  return link.signedUrl;
}
