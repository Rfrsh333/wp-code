import { bepaalDocumentFormaat, MAX_DOCUMENT_BYTES } from "@/lib/medewerker/documenten";

/**
 * Vertaling tussen de live tabel `kandidaat_documenten` en de vormen die de
 * frontends verwachten.
 *
 * Achtergrond: er bestonden twee migraties voor deze tabel. Live draait de
 * Nederlandse variant (`type, bestandsnaam, bestand_pad, mime_type,
 * bestand_grootte, status ∈ ontvangen|goedgekeurd|afgekeurd, notitie`), maar
 * het kandidaat-portaal en het admin-documentenmodal waren geschreven tegen
 * de Engelse variant (`document_type, file_name, file_path, file_size,
 * review_status ∈ in_review|approved|rejected, review_notes`). Elke query met
 * die kolommen faalde, dus uploads en reviews werkten niet.
 *
 * De database blijft leidend; de routes mappen naar de oude veldnamen zodat de
 * bestaande schermen ongewijzigd blijven werken.
 */

export const KANDIDAAT_DOCUMENT_STATUSSEN = ["ontvangen", "goedgekeurd", "afgekeurd"] as const;
export type KandidaatDocumentStatus = (typeof KANDIDAAT_DOCUMENT_STATUSSEN)[number];

export type ReviewStatus = "in_review" | "approved" | "rejected";

/** Documenttypes die een kandidaat zelf via de uploadlink mag aanleveren. */
export const KANDIDAAT_UPLOAD_TYPES = ["id", "cv", "kvk", "overig"] as const;
export type KandidaatUploadType = (typeof KANDIDAAT_UPLOAD_TYPES)[number];

/**
 * Alle types die een kandidaatdocument kan hebben (admin-upload en typecorrectie, B6).
 * Labels zijn wat kandidaat en admin te zien krijgen.
 */
export const KANDIDAAT_DOCUMENT_TYPES = [
  { value: "id", label: "ID-bewijs (paspoort of ID-kaart)" },
  { value: "cv", label: "CV" },
  { value: "kvk", label: "KvK-uittreksel" },
  { value: "btw", label: "Btw-nummer / btw-bewijs" },
  { value: "certificaat", label: "Certificaat" },
  { value: "contract", label: "Contract" },
  { value: "bankbewijs", label: "Bankbewijs" },
  { value: "overig", label: "Overig" },
] as const;
export type KandidaatDocumentType = (typeof KANDIDAAT_DOCUMENT_TYPES)[number]["value"];

export function isKandidaatDocumentType(waarde: unknown): waarde is KandidaatDocumentType {
  return typeof waarde === "string" && KANDIDAAT_DOCUMENT_TYPES.some((t) => t.value === waarde);
}

export function isKandidaatUploadType(waarde: unknown): waarde is KandidaatUploadType {
  return typeof waarde === "string" && (KANDIDAAT_UPLOAD_TYPES as readonly string[]).includes(waarde);
}

export function kandidaatDocumentLabel(type: string | null | undefined): string {
  return KANDIDAAT_DOCUMENT_TYPES.find((t) => t.value === type)?.label ?? (type || "Document");
}

/** Vanaf deze grootte comprimeert de uploadpagina een foto eerst in de browser. */
export const COMPRIMEER_VANAF_BYTES = 1.5 * 1024 * 1024;

export type UploadPlan =
  | { soort: "direct" }
  /** `verplicht`: zonder compressie wordt het bestand geweigerd (te groot) of is het HEIC. */
  | { soort: "comprimeren"; verplicht: boolean }
  | { soort: "fout"; melding: string };

/**
 * B7: wat de uploadpagina met een bestand doet. Vercel weigert request bodies boven ~4,5 MB
 * vóórdat de route draait (413), dus de grens is 4 MB (zoals bij medewerkerdocumenten).
 * Foto's worden in de browser verkleind tot JPEG; HEIC (iPhone) ook, zodat de admin het kan
 * openen. Lukt verkleinen niet, dan gaat een HEIC tot 4 MB ongewijzigd mee (de server
 * accepteert HEIC) en volgt bij een te groot bestand een nette melding.
 */
export function kandidaatUploadPlan(bestand: { name: string; type: string; size: number }): UploadPlan {
  if (!bestand.size) return { soort: "fout", melding: "Het bestand is leeg." };
  const formaat = bepaalDocumentFormaat(bestand);
  if (!formaat) return { soort: "fout", melding: "Alleen PDF, JPG, PNG of HEIC is toegestaan." };

  const teGroot = bestand.size > MAX_DOCUMENT_BYTES;
  if (formaat.mime === "application/pdf") {
    return teGroot
      ? { soort: "fout", melding: "Deze PDF is te groot (maximaal 4 MB). Verklein de PDF of maak een foto van het document." }
      : { soort: "direct" };
  }
  if (formaat.ext === "heic") return { soort: "comprimeren", verplicht: teGroot };
  if (teGroot) return { soort: "comprimeren", verplicht: true };
  if (bestand.size > COMPRIMEER_VANAF_BYTES) return { soort: "comprimeren", verplicht: false };
  return { soort: "direct" };
}

/** Melding na een mislukte upload; ook als het antwoord geen JSON is (413/502 van Vercel). */
export function uploadFoutmelding(status: number, body: unknown): string {
  if (status === 413) return "Dit bestand is te groot om te versturen (maximaal 4 MB). Maak een kleinere foto of verklein de PDF.";
  const fout = body && typeof body === "object" ? (body as { error?: unknown }).error : undefined;
  if (typeof fout === "string" && fout) return fout;
  if (status === 403) return "Je uploadlink is ongeldig of verlopen. Vraag ons om een nieuwe link.";
  return "Uploaden lukte niet. Probeer het opnieuw, of mail je document naar info@toptalentjobs.nl.";
}

/** Kolommen die we standaard selecteren (live schema). */
export const KANDIDAAT_DOCUMENT_KOLOMMEN =
  "id, inschrijving_id, type, bestandsnaam, bestand_pad, mime_type, bestand_grootte, status, notitie, reviewed_at, uploaded_at";

export interface KandidaatDocumentRij {
  id: string;
  inschrijving_id: string;
  type: string;
  bestandsnaam: string;
  bestand_pad: string;
  mime_type: string | null;
  bestand_grootte: number | null;
  status: string;
  notitie: string | null;
  reviewed_at: string | null;
  uploaded_at: string;
}

export function statusNaarReview(status: string | null | undefined): ReviewStatus {
  if (status === "goedgekeurd") return "approved";
  if (status === "afgekeurd") return "rejected";
  return "in_review";
}

export function reviewNaarStatus(review: ReviewStatus): KandidaatDocumentStatus {
  if (review === "approved") return "goedgekeurd";
  if (review === "rejected") return "afgekeurd";
  return "ontvangen";
}

export function isKandidaatDocumentStatus(waarde: unknown): waarde is KandidaatDocumentStatus {
  return typeof waarde === "string" && (KANDIDAAT_DOCUMENT_STATUSSEN as readonly string[]).includes(waarde);
}

/**
 * Admin-response: de live kolommen (voor AdminDashboard) plus de oude
 * aliasnamen (voor KandidaatDocumentenModal).
 */
export function naarAdminDocument(rij: KandidaatDocumentRij) {
  return {
    ...rij,
    document_type: rij.type,
    file_name: rij.bestandsnaam,
    file_path: rij.bestand_pad,
    file_size: rij.bestand_grootte ?? 0,
    review_status: statusNaarReview(rij.status),
    review_notes: rij.notitie,
  };
}

/** Documenten die een kandidaat moet aanleveren: ID en CV, en bij zzp ook het KvK-uittreksel. */
export function verplichteKandidaatDocumenten(uitbetalingswijze: string | null | undefined): KandidaatUploadType[] {
  return uitbetalingswijze === "zzp" ? ["id", "cv", "kvk"] : ["id", "cv"];
}

/** Zijn alle verplichte documenten door een admin goedgekeurd? "Ontvangen" telt niet (B2, B16). */
export function alleVerplichteGoedgekeurd(
  documenten: readonly { type: string; status: string | null }[],
  uitbetalingswijze: string | null | undefined,
): boolean {
  return verplichteKandidaatDocumenten(uitbetalingswijze).every((type) =>
    documenten.some((d) => d.type === type && d.status === "goedgekeurd"),
  );
}

/**
 * Onboardingstatussen waarin "alle documenten goedgekeurd" de kandidaat op `goedgekeurd` zet.
 * Bewust niet `nieuw`/`in_beoordeling` (de intake is dan nog niet rond) en niet later.
 */
export const DOCUMENTFASE_STATUSSEN = ["documenten_opvragen", "wacht_op_kandidaat"] as const;
