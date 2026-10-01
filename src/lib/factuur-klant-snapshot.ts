/**
 * Klant-NAW vastleggen op de factuur (snapshot bij aanmaken). Een factuur moet de gegevens tonen
 * zoals ze op het moment van factureren waren, ook als de klant later zijn adres wijzigt of zijn
 * account verwijdert (dan worden contactpersoon/e-mail geanonimiseerd).
 *
 * Kolommen: klant_naam en klant_email bestonden al; de rest komt uit
 * supabase/migrations/20261002_review_fixes.sql. Zonder die migratie wordt opnieuw ingevoegd
 * zonder de nieuwe kolommen (zie SNAPSHOT_KOLOMMEN_NIEUW) en vallen PDF en mail per veld terug op
 * de live klantgegevens. Pure functies; geen database-imports.
 */

export type KlantNawBron = {
  bedrijfsnaam?: string | null;
  contactpersoon?: string | null;
  email?: string | null;
  adres?: string | null;
  postcode?: string | null;
  stad?: string | null;
  kvk_nummer?: string | null;
  btw_nummer?: string | null;
};

export type FactuurKlantSnapshot = {
  klant_naam: string | null;
  klant_email: string | null;
  klant_contactpersoon: string | null;
  klant_adres: string | null;
  klant_postcode: string | null;
  klant_stad: string | null;
  klant_kvk_nummer: string | null;
  klant_btw_nummer: string | null;
};

/** Kolommen die pas met 20261002_review_fixes.sql bestaan (weglaten bij 42703/PGRST204). */
export const SNAPSHOT_KOLOMMEN_NIEUW = [
  "klant_contactpersoon",
  "klant_adres",
  "klant_postcode",
  "klant_stad",
  "klant_kvk_nummer",
  "klant_btw_nummer",
] as const;

/** Klantvelden voor de snapshot; adres/KvK-kolommen kunnen ontbreken (dan KLANT_NAW_BASIS). */
export const KLANT_NAW_VOL = "bedrijfsnaam, contactpersoon, email, adres, postcode, stad, kvk_nummer, btw_nummer";
export const KLANT_NAW_BASIS = "bedrijfsnaam, contactpersoon, email";

const tekst = (v: unknown): string | null => (typeof v === "string" && v.trim() ? v.trim() : null);

/** Geanonimiseerd e-mailadres van een verwijderd account (zie api/klant/account/verwijderen). */
export function isGeanonimiseerdEmail(email: string | null | undefined): boolean {
  return !!email && /@verwijderd\.invalid$/i.test(email);
}

export function maakKlantSnapshot(klant: KlantNawBron): FactuurKlantSnapshot {
  return {
    klant_naam: tekst(klant.bedrijfsnaam),
    klant_email: tekst(klant.email),
    klant_contactpersoon: tekst(klant.contactpersoon),
    klant_adres: tekst(klant.adres),
    klant_postcode: tekst(klant.postcode),
    klant_stad: tekst(klant.stad),
    klant_kvk_nummer: tekst(klant.kvk_nummer),
    klant_btw_nummer: tekst(klant.btw_nummer),
  };
}

/** Rij zonder de nieuwe snapshotkolommen (voor de herhaling zonder migratie). */
export function zonderNieuweSnapshotKolommen<T extends Record<string, unknown>>(rij: T): T {
  const kopie: Record<string, unknown> = { ...rij };
  for (const k of SNAPSHOT_KOLOMMEN_NIEUW) delete kopie[k];
  return kopie as T;
}

export function isOntbrekendeKolomFout(error: { code?: string } | null | undefined): boolean {
  return !!error && (error.code === "42703" || error.code === "PGRST204");
}

/**
 * NAW zoals op de factuur te tonen: per veld de snapshot, anders de live klantgegevens (oude
 * facturen zonder backfill of migratie nog niet gedraaid).
 */
export function factuurKlantNaw(
  factuur: Partial<Record<keyof FactuurKlantSnapshot, unknown>>,
  live: KlantNawBron | null | undefined,
): Required<{ [K in keyof KlantNawBron]: string | null }> {
  const kies = (snap: unknown, l: unknown) => tekst(snap) ?? tekst(l);
  return {
    bedrijfsnaam: kies(factuur.klant_naam, live?.bedrijfsnaam),
    contactpersoon: kies(factuur.klant_contactpersoon, live?.contactpersoon),
    email: kies(factuur.klant_email, live?.email),
    adres: kies(factuur.klant_adres, live?.adres),
    postcode: kies(factuur.klant_postcode, live?.postcode),
    stad: kies(factuur.klant_stad, live?.stad),
    kvk_nummer: kies(factuur.klant_kvk_nummer, live?.kvk_nummer),
    btw_nummer: kies(factuur.klant_btw_nummer, live?.btw_nummer),
  };
}

/**
 * Ontvanger van de factuurmail: het huidige adres van de klant (kan na het factureren gewijzigd
 * zijn), behalve als het account geanonimiseerd is; dan het adres van de snapshot.
 */
export function factuurOntvanger(
  factuur: Partial<Record<keyof FactuurKlantSnapshot, unknown>>,
  live: KlantNawBron | null | undefined,
): string | null {
  const liveEmail = tekst(live?.email);
  if (liveEmail && !isGeanonimiseerdEmail(liveEmail)) return liveEmail;
  const snap = tekst(factuur.klant_email);
  return snap && !isGeanonimiseerdEmail(snap) ? snap : null;
}
