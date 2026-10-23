/**
 * E-mailadressen: één vorm voor opslaan en zoeken (pure regels, getest in
 * tests/unit/email-normalisatie.spec.ts).
 *
 * Achtergrond (B4): de inschrijving bewaarde het adres zoals het werd getypt ("Jan@Gmail.com"),
 * terwijl login, app-login en wachtwoord-reset zochten op `email = lower(invoer)`. Zo'n
 * medewerker kon nooit inloggen en kreeg geen resetmail. Nieuwe adressen gaan nu klein de
 * database in, en zoeken gebeurt hoofdletterongevoelig zodat ook oude rijen werken.
 */

/** Getrimd en in kleine letters; lege string bij geen tekst. */
export function normaliseerEmail(email: unknown): string {
  return typeof email === "string" ? email.trim().toLowerCase() : "";
}

/** Escape `\`, `%` en `_`, zodat `ilike` letterlijk vergelijkt (alleen hoofdletters negeert). */
export function ilikeLetterlijk(waarde: string): string {
  return waarde.replace(/[\\%_]/g, (teken) => `\\${teken}`);
}

/**
 * Patroon voor `.ilike("email", …)` dat precies dit adres vindt, los van hoofdletters.
 * null als dat niet veilig kan: PostgREST leest `*` als wildcard; zoek dan exact (`eq`).
 */
export function emailIlikePatroon(email: string): string | null {
  const schoon = normaliseerEmail(email);
  if (!schoon || schoon.includes("*")) return null;
  return ilikeLetterlijk(schoon);
}

/**
 * Kies uit de rijen die hoofdletterongevoelig matchen de juiste: bij voorkeur het adres dat al
 * genormaliseerd is opgeslagen, anders de eerste. `dubbel` meldt dat er meer accounts zijn die
 * alleen in hoofdletters verschillen (dat moet de migratie 20261023 eerst rechtzetten).
 */
export function kiesEmailMatch<T extends { email?: string | null }>(
  rijen: readonly T[],
  email: string,
): { rij: T | null; dubbel: boolean } {
  const doel = normaliseerEmail(email);
  const passend = rijen.filter((r) => normaliseerEmail(r.email) === doel);
  if (passend.length === 0) return { rij: null, dubbel: false };
  const exact = passend.find((r) => r.email === doel);
  return { rij: exact ?? passend[0], dubbel: passend.length > 1 };
}
