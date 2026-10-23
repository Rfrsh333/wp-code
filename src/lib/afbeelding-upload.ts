/**
 * Validatie van een geüploade foto (dienstfoto en bedrijfsfoto, bucket dienst-afbeeldingen).
 * Geen imports: los testbaar (tests/unit/sfeerfotos.spec.ts).
 *
 * - Vercel weigert een request body boven ~4,5 MB zelf, met een kale 413 zonder JSON. We
 *   controleren Content-Length vooraf, zodat de client ook lokaal en bij een ander platform een
 *   duidelijke melding krijgt (en het portaal/de app weet dat ze vóór het uploaden moeten verkleinen).
 * - Type: alleen JPG, PNG en WebP, en de eerste bytes moeten daarbij passen (het opgegeven type
 *   alleen is door de client te kiezen).
 * - Grootte: max. 500 KB, gelijk aan de bucketlimiet (supabase/migrations/20260317_dienst_afbeelding.sql).
 *   Portaal en app comprimeren vooraf.
 */

export const AFBEELDING_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;
export type AfbeeldingType = (typeof AFBEELDING_TYPES)[number];

export const AFBEELDING_MAX_BYTES = 500 * 1024;
export const VERCEL_MAX_BODY_BYTES = Math.floor(4.5 * 1024 * 1024);

export type UploadFout = { ok: false; status: 400 | 413; error: string };

const EXTENSIE: Record<AfbeeldingType, "jpg" | "png" | "webp"> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" };

/** Te grote request body (Content-Length boven de Vercel-grens), of null. */
export function controleerVerzoekGrootte(contentLength: string | null | undefined): UploadFout | null {
  const n = Number(contentLength);
  if (contentLength && Number.isFinite(n) && n > VERCEL_MAX_BODY_BYTES) {
    return { ok: false, status: 413, error: "Het bestand is te groot om te versturen (max. 4,5 MB). Kies een kleinere foto." };
  }
  return null;
}

/** Type op basis van de eerste bytes (JPEG, PNG of WebP), of null. */
export function herkenAfbeelding(bytes: Uint8Array): AfbeeldingType | null {
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return "image/jpeg";
  if (bytes.length >= 8 && [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a].every((b, i) => bytes[i] === b)) return "image/png";
  const ascii = (van: number, tot: number) => String.fromCharCode(...bytes.slice(van, tot));
  if (bytes.length >= 12 && ascii(0, 4) === "RIFF" && ascii(8, 12) === "WEBP") return "image/webp";
  return null;
}

/** Controleert type, inhoud en grootte. `bytes`: (het begin van) de bestandsinhoud. */
export function controleerAfbeelding(
  bestand: { type: string; size: number },
  bytes: Uint8Array,
): { ok: true; type: AfbeeldingType; ext: "jpg" | "png" | "webp" } | UploadFout {
  if (!(AFBEELDING_TYPES as readonly string[]).includes(bestand.type)) {
    return { ok: false, status: 400, error: "Alleen JPG, PNG of WebP afbeeldingen zijn toegestaan" };
  }
  if (bestand.size > AFBEELDING_MAX_BYTES) {
    return { ok: false, status: 400, error: "Afbeelding is te groot (max 500KB)" };
  }
  const echt = herkenAfbeelding(bytes);
  if (!echt) {
    return { ok: false, status: 400, error: "Dit bestand is geen geldige JPG-, PNG- of WebP-afbeelding" };
  }
  // Het opgegeven type mag afwijken (bv. een .png die eigenlijk JPEG is): de inhoud beslist.
  return { ok: true, type: echt, ext: EXTENSIE[echt] };
}

/**
 * Leest het bestand uit een multipart-request (veld `file`) en controleert het.
 * Geeft de inhoud terug, klaar voor Supabase Storage.
 */
export async function leesAfbeeldingUitVerzoek(
  request: Request,
): Promise<{ ok: true; buffer: Buffer; type: AfbeeldingType; ext: "jpg" | "png" | "webp" } | UploadFout> {
  const teGroot = controleerVerzoekGrootte(request.headers.get("content-length"));
  if (teGroot) return teGroot;

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return { ok: false, status: 400, error: "Geen afbeelding ontvangen" };
  }
  const file = formData.get("file");
  if (!file || typeof file === "string") {
    return { ok: false, status: 400, error: "Geen afbeelding ontvangen" };
  }
  const buffer = Buffer.from(await file.arrayBuffer());
  const controle = controleerAfbeelding({ type: file.type, size: buffer.length }, buffer.subarray(0, 16));
  if (!controle.ok) return controle;
  return { ok: true, buffer, type: controle.type, ext: controle.ext };
}
