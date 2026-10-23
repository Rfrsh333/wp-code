/**
 * Uitkomst van een klant-login (web /api/klant/login en app /api/app/login), puur en los
 * testbaar (tests/unit/klant-login-regels.spec.ts).
 *
 * Anti-enumeratie blijft zoals hij was: een onbekend e-mailadres, een fout wachtwoord en een
 * account zónder wachtwoord geven precies hetzelfde antwoord (en bcrypt draait altijd, tegen
 * timing). Wel staat in dat ene antwoord nu eerlijk wat je kunt doen als je nog geen wachtwoord
 * hebt. Pas als het wachtwoord klopt, zeggen we dat een account niet actief is: wie het
 * wachtwoord kent, leert daar niets nieuws mee over het bestaan van het adres.
 */

export type Aanspreekvorm = "u" | "je";

export type KlantLoginOordeel =
  | { ok: true }
  | { ok: false; status: 401 | 403; code: "ongeldige_inloggegevens" | "account_niet_actief"; error: string };

const ONGELDIG: Record<Aanspreekvorm, string> = {
  je:
    "E-mailadres of wachtwoord klopt niet. Nog geen wachtwoord, of is je account nog niet geactiveerd? " +
    "Gebruik de link uit je uitnodigingsmail of vraag via 'Wachtwoord vergeten' een nieuwe link aan.",
  u:
    "E-mailadres of wachtwoord klopt niet. Nog geen wachtwoord, of is uw account nog niet geactiveerd? " +
    "Gebruik de link uit uw uitnodigingsmail of vraag via 'Wachtwoord vergeten' een nieuwe link aan.",
};

const NIET_ACTIEF: Record<Aanspreekvorm, string> = {
  je: "Je account is niet actief. Neem contact op met TopTalent via info@toptalentjobs.nl om het weer te activeren.",
  u: "Uw account is niet actief. Neem contact op met TopTalent via info@toptalentjobs.nl om het weer te activeren.",
};

export function beoordeelKlantLogin(
  input: { gevonden: boolean; wachtwoordKlopt: boolean; status: string | null | undefined },
  vorm: Aanspreekvorm = "je",
): KlantLoginOordeel {
  if (!input.gevonden || !input.wachtwoordKlopt) {
    return { ok: false, status: 401, code: "ongeldige_inloggegevens", error: ONGELDIG[vorm] };
  }
  if (input.status !== "actief") {
    return { ok: false, status: 403, code: "account_niet_actief", error: NIET_ACTIEF[vorm] };
  }
  return { ok: true };
}
