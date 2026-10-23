import { supabaseAdmin } from "@/lib/supabase";
import { captureRouteError } from "@/lib/sentry-utils";
import { emailIlikePatroon, kiesEmailMatch, normaliseerEmail } from "@/lib/email-normalisatie";

/**
 * Zoek één rij op e-mailadres, hoofdletterongevoelig (B4). Werkt ook voor oude rijen met
 * hoofdletters zolang migratie 20261023_medewerker_email_kleine_letters nog niet gedraaid is.
 * `kolommen` moet `email` bevatten. Gooit bij een databasefout (null = echt niet gevonden).
 */
export async function zoekOpEmail<T extends { email?: string | null }>(
  tabel: "medewerkers" | "inschrijvingen",
  kolommen: string,
  email: string,
): Promise<T | null> {
  const schoon = normaliseerEmail(email);
  if (!schoon) return null;

  const patroon = emailIlikePatroon(schoon);
  const basis = supabaseAdmin.from(tabel).select(kolommen);
  const { data, error } = await (patroon ? basis.ilike("email", patroon) : basis.eq("email", schoon)).limit(5);
  // Een databasefout is geen "niet gevonden": anders maakt kandidaat → medewerker een tweede
  // account aan en meldt de login "Ongeldige inloggegevens". De aanroepers vangen dit op (500).
  if (error) {
    captureRouteError(error, { route: `zoekOpEmail:${tabel}`, action: "SELECT" });
    throw new Error(`Zoeken op e-mailadres in ${tabel} mislukt: ${error.message}`);
  }

  const { rij, dubbel } = kiesEmailMatch((data ?? []) as unknown as T[], schoon);
  // Bij medewerkers is een dubbel adres een fout (login kiest dan een account); bij
  // inschrijvingen kan het historisch voorkomen.
  if (dubbel && tabel === "medewerkers") {
    captureRouteError(new Error(`Meerdere ${tabel} met hetzelfde e-mailadres (los van hoofdletters)`), {
      route: `zoekOpEmail:${tabel}`,
      action: "DUBBEL",
    });
  }
  return rij;
}
