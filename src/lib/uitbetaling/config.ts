import { isGeldigIban, normaliseerIban } from "@/lib/medewerker/iban";
import type { AdminRole } from "@/lib/admin-auth";

/**
 * Instellingen voor uitbetalen met zelffacturering. Alles uit env; niets hardcoded.
 *
 * - ZELFFACTURERING_ACTIEF=1     zet de functie aan (checklistpunt, akkoord geven, ronde aanmaken).
 *                                Zonder: geen nieuw checklistpunt, geen ronde, UI toont "binnenkort".
 * - TOPTALENT_IBAN               rekening waarvan TopTalent uitbetaalt (debiteur in het SEPA-bestand).
 * - TOPTALENT_BIC                optioneel; zonder BIC staat er "NOTPROVIDED" (mag binnen de EER).
 * - TOPTALENT_REKENINGNAAM       tenaamstelling van die rekening.
 * - UITBETAAL_TERMIJN_WERKDAGEN  "binnen X werkdagen nadat de werkgever heeft betaald" (akkoordtekst
 *                                en "uiterlijk uitbetalen" in de admin). Geen standaardwaarde: die
 *                                stelt Rachid vast. Zonder deze waarde kan niemand akkoord geven.
 */

/** Wie uitbetalingen mag zien en aanmaken: dezelfde rollen als de andere geld-routes in de code
 *  (facturen genereren/versturen/betaald, boetes): owner en finance. */
export const UITBETALING_ROLLEN: AdminRole[] = ["owner", "finance"];

export function isZelffactureringActief(): boolean {
  return process.env.ZELFFACTURERING_ACTIEF === "1";
}

/** X in "binnen X werkdagen nadat de werkgever betaald heeft", of null als niet ingesteld. */
export function uitbetaalTermijnWerkdagen(): number | null {
  const ruw = (process.env.UITBETAAL_TERMIJN_WERKDAGEN ?? "").trim();
  if (!/^\d{1,2}$/.test(ruw)) return null;
  const n = Number(ruw);
  return n >= 1 && n <= 60 ? n : null;
}

export type BankConfig =
  | { ok: true; naam: string; iban: string; bic: string | null }
  | { ok: false; fouten: string[] };

/** De TopTalent-rekening voor het SEPA-bestand. Geeft de fouten terug (zonder het IBAN te tonen). */
export function bankConfig(): BankConfig {
  const fouten: string[] = [];
  const iban = normaliseerIban(process.env.TOPTALENT_IBAN ?? "");
  const naam = (process.env.TOPTALENT_REKENINGNAAM ?? "").trim();
  const bic = (process.env.TOPTALENT_BIC ?? "").replace(/\s+/g, "").toUpperCase() || null;
  if (!iban) fouten.push("TOPTALENT_IBAN is niet ingesteld");
  else if (!isGeldigIban(iban)) fouten.push("TOPTALENT_IBAN is geen geldig IBAN");
  if (!naam) fouten.push("TOPTALENT_REKENINGNAAM is niet ingesteld");
  if (bic && !/^[A-Z]{6}[A-Z2-9][A-NP-Z0-9]([A-Z0-9]{3})?$/.test(bic)) fouten.push("TOPTALENT_BIC is geen geldige BIC");
  if (fouten.length > 0) return { ok: false, fouten };
  return { ok: true, naam, iban, bic };
}

/** Private bucket voor zelffacturen (PDF) en SEPA-bestanden (migratie 20261024). */
export const UITBETALING_BUCKET = "uitbetalingen";
/** Signed URL's voor PDF's zijn kort geldig. */
export const PDF_URL_SECONDEN = 5 * 60;
