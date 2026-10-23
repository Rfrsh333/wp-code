/**
 * Schrijven naar een tabel terwijl een migratie misschien nog niet gedraaid is.
 *
 * Postgres geeft 42703 ("column … does not exist"), PostgREST PGRST204 ("Could not find the
 * '…' column"). Alleen kolommen die de aanroeper expliciet als optioneel opgeeft worden dan
 * weggelaten en de schrijfactie wordt opnieuw geprobeerd; een ontbrekende kernkolom blijft een
 * fout. Zelfde aanpak als api/klant/account/verwijderen, hier herbruikbaar gemaakt.
 * De pure functies hebben geen imports en zijn los testbaar (tests/unit/db-kolom-fallback.spec.ts).
 */

export type DbFout = { code?: string | null; message?: string | null } | null | undefined;

export function isOntbrekendeKolom(fout: DbFout): boolean {
  return !!fout && (fout.code === "42703" || fout.code === "PGRST204");
}

/** Naam van de ontbrekende kolom uit de foutmelding, of null. */
export function ontbrekendeKolom(fout: DbFout): string | null {
  if (!isOntbrekendeKolom(fout)) return null;
  const m = /'([a-z0-9_]+)' column|column "?(?:[a-z0-9_]+\.)?([a-z0-9_]+)"?/i.exec(fout?.message || "");
  return m?.[1] || m?.[2] || null;
}

type SchrijfResultaat<R> = { data: R | null; error: DbFout };

/**
 * Voert `schrijf(data)` uit; ontbreekt een van de `optioneel`-kolommen, dan zonder die kolom
 * opnieuw. Geeft ook terug welke kolommen zijn weggelaten (voor logging of een waarschuwing).
 */
export async function schrijfMetKolomFallback<R>(
  data: Record<string, unknown>,
  optioneel: readonly string[],
  schrijf: (data: Record<string, unknown>) => PromiseLike<SchrijfResultaat<R>>,
): Promise<SchrijfResultaat<R> & { weggelaten: string[] }> {
  let huidig = { ...data };
  const weggelaten: string[] = [];
  for (let poging = 0; poging <= optioneel.length; poging++) {
    const resultaat = await schrijf(huidig);
    const kolom = ontbrekendeKolom(resultaat.error);
    if (!kolom || !optioneel.includes(kolom) || !(kolom in huidig)) {
      return { ...resultaat, weggelaten };
    }
    const rest = { ...huidig };
    delete rest[kolom];
    huidig = rest;
    weggelaten.push(kolom);
  }
  return { data: null, error: { code: "42703", message: "Te veel ontbrekende kolommen" }, weggelaten };
}

/**
 * Lezen met kolommen die een migratie misschien nog niet heeft toegevoegd: eerst `lees(true)`
 * (met de nieuwe kolommen); geeft dat 42703/PGRST204, dan opnieuw met `lees(false)` (zonder).
 * `nieuweKolommen` zegt welke van de twee het antwoord is.
 */
export async function leesMetKolomFallback<R>(
  lees: (metNieuweKolommen: boolean) => PromiseLike<SchrijfResultaat<R>>,
): Promise<SchrijfResultaat<R> & { nieuweKolommen: boolean }> {
  const eerste = await lees(true);
  if (!isOntbrekendeKolom(eerste.error)) return { ...eerste, nieuweKolommen: true };
  const tweede = await lees(false);
  return { ...tweede, nieuweKolommen: false };
}
