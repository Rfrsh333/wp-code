/**
 * KvK- en btw-nummer van een zzp'er normaliseren en controleren (puur, getest in
 * tests/unit/zzp-gegevens.spec.ts). Gebruikt door het inschrijfformulier (B11), het profiel en
 * de checklist vóór reageren (B1). Het IBAN staat in lib/medewerker/iban.ts.
 */

/** Alleen cijfers (spaties, punten en streepjes eruit). */
export function normaliseerKvkNummer(invoer: string | null | undefined): string {
  return (invoer ?? "").replace(/[\s.\-]/g, "");
}

/** Een KvK-nummer is precies 8 cijfers. */
export function isGeldigKvkNummer(invoer: string | null | undefined): boolean {
  return /^\d{8}$/.test(normaliseerKvkNummer(invoer));
}

/** Hoofdletters, zonder spaties, punten en streepjes. */
export function normaliseerBtwNummer(invoer: string | null | undefined): string {
  return (invoer ?? "").replace(/[\s.\-]/g, "").toUpperCase();
}

/**
 * Nederlands btw-nummer: NL + 9 cijfers + B + 2 cijfers (zoals het btw-id). Ook zzp'ers met de
 * kleineondernemersregeling (KOR) hebben een btw-id, dus de KOR is geen reden om het weg te laten.
 */
export function isGeldigBtwNummer(invoer: string | null | undefined): boolean {
  return /^NL\d{9}B\d{2}$/.test(normaliseerBtwNummer(invoer));
}
