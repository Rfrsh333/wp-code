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
