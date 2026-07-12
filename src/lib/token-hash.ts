import crypto from "crypto";

/**
 * SHA-256-hash van een token voor opslag at rest.
 *
 * Reset-/activatietokens worden per e-mail in plaintext verstuurd, maar in de database
 * alleen als hash bewaard. Zo levert een database-lek geen direct bruikbare tokens op
 * (voorheen stonden ze plaintext en waren ze meteen inzetbaar voor reset/takeover).
 * De hash is deterministisch, dus bij verificatie kan de inkomende token opnieuw gehasht
 * en opgezocht worden.
 */
export function hashToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}
