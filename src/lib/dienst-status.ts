/**
 * Statussen van `dienst_aanmeldingen` die betekenen: "deze medewerker staat ingepland".
 *
 * - `geaccepteerd`: klant (of admin) heeft een aanmelding geaccepteerd
 * - `bevestigd`: medewerker heeft een uitnodiging/spoeddienst aangenomen, of admin heeft ingepland
 *
 * Beide tellen overal mee: rooster, check-in, bezetting, beoordelen, uren, favorieten.
 * Voorheen keek elk scherm naar maar één van de twee, waardoor diensten wegvielen.
 */
export const INGEPLAND_STATUSSEN = ["geaccepteerd", "bevestigd"] as const;

export function isIngepland(status: string | null | undefined): boolean {
  return (INGEPLAND_STATUSSEN as readonly string[]).includes(status ?? "");
}
