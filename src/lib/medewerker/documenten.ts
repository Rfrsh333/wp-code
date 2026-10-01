/**
 * Gedeeld tussen de documenten-API en de Documenten-pagina (geen server-imports).
 */

export const DOCUMENT_TYPES = [
  { value: "id_bewijs", label: "ID-bewijs / paspoort", vervaldatum: true },
  { value: "werkvergunning", label: "Werkvergunning (TWV)", vervaldatum: true },
  { value: "verblijfsvergunning", label: "Verblijfsvergunning", vervaldatum: true },
  { value: "vsh", label: "Verklaring Sociale Hygiëne (VSH)", vervaldatum: false },
  { value: "vog", label: "VOG", vervaldatum: false },
  { value: "kvk", label: "KVK-uittreksel", vervaldatum: false },
  { value: "loonheffingsverklaring", label: "Loonheffingsverklaring", vervaldatum: false },
  { value: "contract", label: "Contract", vervaldatum: false },
  { value: "overig", label: "Overig", vervaldatum: false },
] as const;

export type DocumentType = (typeof DOCUMENT_TYPES)[number]["value"];

export function isDocumentType(v: unknown): v is DocumentType {
  return typeof v === "string" && DOCUMENT_TYPES.some((t) => t.value === v);
}

export function documentTypeLabel(type: string | null | undefined): string {
  return DOCUMENT_TYPES.find((t) => t.value === type)?.label ?? (type || "Document");
}

/**
 * Vercel weigert request bodies boven ~4,5 MB vóórdat de route draait; met multipart-overhead
 * is 4 MB per bestand de eerlijke grens.
 */
export const MAX_DOCUMENT_BYTES = 4 * 1024 * 1024;

const MIME_NAAR_EXT: Record<string, string> = {
  "application/pdf": "pdf",
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/heic": "heic",
  "image/heif": "heic",
};

const EXT_NAAR_MIME: Record<string, string> = {
  pdf: "application/pdf",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  heic: "image/heic",
  heif: "image/heif",
};

/** Voor `<input accept>`. */
export const DOCUMENT_ACCEPT = ".pdf,.jpg,.jpeg,.png,.heic,.heif,application/pdf,image/jpeg,image/png,image/heic,image/heif";

export const DOCUMENT_HINT = "PDF, JPG, PNG of HEIC, maximaal 4 MB";

/**
 * Bepaal type + extensie van een upload. iOS levert HEIC soms zonder MIME-type aan;
 * dan beslist de extensie. Geeft null bij een niet-toegestaan bestand.
 */
export function bepaalDocumentFormaat(bestand: { name: string; type: string }): { mime: string; ext: string } | null {
  const mime = (bestand.type || "").toLowerCase();
  if (MIME_NAAR_EXT[mime]) return { mime, ext: MIME_NAAR_EXT[mime] };
  if (mime && mime !== "application/octet-stream") return null;
  const ext = bestand.name.split(".").pop()?.toLowerCase() ?? "";
  const viaExt = EXT_NAAR_MIME[ext];
  return viaExt ? { mime: viaExt, ext: MIME_NAAR_EXT[viaExt] } : null;
}

/** Foutmelding voor de gebruiker, of null als het bestand mag. */
export function valideerDocument(bestand: { name: string; type: string; size: number }): string | null {
  if (!bestand.size) return "Het bestand is leeg";
  if (bestand.size > MAX_DOCUMENT_BYTES) return "Bestand is te groot (maximaal 4 MB)";
  if (!bepaalDocumentFormaat(bestand)) return "Alleen PDF, JPG, PNG of HEIC is toegestaan";
  return null;
}

/** Zoals de Documenten-pagina een document toont (API-respons). */
export interface MedewerkerDocument {
  id: string;
  document_type: string;
  file_name: string;
  file_size: number | null;
  uploaded_at: string;
  expiry_date: string | null;
  review_status: string | null;
  /** Kortlevende signed URL (privé bucket); null als die niet kon worden gemaakt. */
  url: string | null;
}
