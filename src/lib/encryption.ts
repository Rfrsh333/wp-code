import crypto from "crypto";

/**
 * Application-level veldencryptie (AES-256-GCM) voor gevoelige PII zoals IBAN/BTW/BSN.
 *
 * Ontwerp voor een NIET-brekende uitrol:
 * - Zonder `FIELD_ENCRYPTION_KEY` blijft alles plaintext (geen gedragswijziging).
 * - Met sleutel: schrijven versleutelt, lezen ontsleutelt. `decryptField` accepteert
 *   óók plaintext (waarden van vóór de migratie), zodat de overgang naadloos is.
 * - Versleutelde waarden dragen het prefix `enc:v1:` zodat ze herkenbaar zijn.
 *
 * Uitrolvolgorde: (1) deze code + alle lees-/schrijfplekken deployen, (2) sleutel zetten,
 * (3) migratiescript draaien om bestaande rijen te versleutelen. Pas ná stap 2/3 zijn de
 * waarden at-rest versleuteld.
 */
const PREFIX = "enc:v1:";
const ALGO = "aes-256-gcm";
const IV_LEN = 12;
const TAG_LEN = 16;

function getKey(): Buffer | null {
  const raw = process.env.FIELD_ENCRYPTION_KEY;
  if (!raw) return null;
  const key = /^[0-9a-fA-F]{64}$/.test(raw) ? Buffer.from(raw, "hex") : Buffer.from(raw, "base64");
  if (key.length !== 32) {
    // Bewust luid falen: een verkeerd geconfigureerde sleutel is een operator-fout.
    throw new Error("FIELD_ENCRYPTION_KEY moet 32 bytes zijn (64 hex-tekens of base64).");
  }
  return key;
}

export function isEncryptionConfigured(): boolean {
  return getKey() !== null;
}

export function isEncrypted(value: unknown): value is string {
  return typeof value === "string" && value.startsWith(PREFIX);
}

/** Versleutel een veld. Zonder sleutel: geeft de plaintext terug (niet-brekend). */
export function encryptField(plaintext: string | null | undefined): string | null {
  if (plaintext == null || plaintext === "") return plaintext ?? null;
  if (isEncrypted(plaintext)) return plaintext;
  const key = getKey();
  if (!key) return plaintext;

  const iv = crypto.randomBytes(IV_LEN);
  const cipher = crypto.createCipheriv(ALGO, key, iv);
  const ciphertext = Buffer.concat([cipher.update(String(plaintext), "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return PREFIX + Buffer.concat([iv, tag, ciphertext]).toString("base64");
}

/** Ontsleutel een veld. Plaintext (pre-migratie) wordt ongewijzigd teruggegeven. */
export function decryptField(value: string | null | undefined): string | null {
  if (value == null) return null;
  if (!isEncrypted(value)) return value;
  const key = getKey();
  if (!key) return value;

  try {
    const raw = Buffer.from(value.slice(PREFIX.length), "base64");
    const iv = raw.subarray(0, IV_LEN);
    const tag = raw.subarray(IV_LEN, IV_LEN + TAG_LEN);
    const ciphertext = raw.subarray(IV_LEN + TAG_LEN);
    const decipher = crypto.createDecipheriv(ALGO, key, iv);
    decipher.setAuthTag(tag);
    return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString("utf8");
  } catch {
    // Corrupt/ongeldig: geef de ruwe waarde terug i.p.v. te crashen.
    return value;
  }
}
