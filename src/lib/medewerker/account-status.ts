/**
 * Wat een medewerker met een bepaalde accountstatus mag (pure regels, getest in
 * tests/unit/medewerker-account-status.spec.ts).
 *
 * B5: web- en app-login gaven bij elke status behalve `actief` "Ongeldige inloggegevens". Een
 * gepauzeerde medewerker (openstaande boete) kon daardoor niet inloggen om de boete te betalen,
 * en wie al ingelogd was werd bij de eerste 401 uitgelogd. Nu:
 * - `actief`: gewoon inloggen;
 * - `gepauzeerd`: inloggen mag, maar alleen status, boete en betalen werken. Andere portaal-API's
 *   geven 403 met code `account_gepauzeerd` (geen 401, dus geen automatisch uitloggen);
 * - andere statussen (`inactief`, …): eerlijke melding dat het account niet actief is.
 * Deze meldingen verschijnen alleen na een juist wachtwoord, dus ze verraden geen accounts.
 */

export const ACCOUNT_GEPAUZEERD_CODE = "account_gepauzeerd";
export const ACCOUNT_NIET_ACTIEF_CODE = "account_niet_actief";

/** Response-header waarmee de browser een 403 van een gepauzeerd account herkent. */
export const ACCOUNT_STATUS_HEADER = "x-account-status";

/** Pagina die een gepauzeerde medewerker in het webportaal te zien krijgt. */
export const GEPAUZEERD_PAGINA = "/medewerker/gepauzeerd";

export const GEPAUZEERD_MELDING =
  "Je account is gepauzeerd. Je kunt nu alleen je status bekijken en een openstaande boete betalen. Daarna kun je weer diensten bekijken en je aanmelden.";

export const NIET_ACTIEF_MELDING =
  "Je account is niet actief. Neem contact op met TopTalent (info@toptalentjobs.nl of +31 6 17889189) als je weer aan de slag wilt.";

export type LoginToegang =
  | { soort: "actief" }
  | { soort: "gepauzeerd"; code: typeof ACCOUNT_GEPAUZEERD_CODE; melding: string }
  | { soort: "geweigerd"; code: typeof ACCOUNT_NIET_ACTIEF_CODE; melding: string };

/** Wat de login doet bij deze status (nadat het wachtwoord al klopte). */
export function loginToegang(status: string | null | undefined): LoginToegang {
  if (status === "actief") return { soort: "actief" };
  if (status === "gepauzeerd") {
    return { soort: "gepauzeerd", code: ACCOUNT_GEPAUZEERD_CODE, melding: GEPAUZEERD_MELDING };
  }
  return { soort: "geweigerd", code: ACCOUNT_NIET_ACTIEF_CODE, melding: NIET_ACTIEF_MELDING };
}

/** Mag deze status een wachtwoord-resetmail krijgen? Ook gepauzeerd: anders kan hij nooit betalen. */
export function magWachtwoordResetten(status: string | null | undefined): boolean {
  return status === "actief" || status === "gepauzeerd";
}
