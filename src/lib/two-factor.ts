import { authenticator } from "otplib";
import QRCode from "qrcode";
import crypto from "crypto";
import bcrypt from "bcryptjs";

/**
 * Genereer een nieuwe TOTP secret
 */
export function generateTOTPSecret(): string {
  return authenticator.generateSecret();
}

/**
 * Genereer QR code data URL voor authenticator app
 */
export async function generateQRCode(email: string, secret: string): Promise<string> {
  const otpauth = authenticator.keyuri(
    email,
    "TopTalent Jobs Admin",
    secret
  );

  return await QRCode.toDataURL(otpauth);
}

/**
 * Verifieer een TOTP token
 */
export function verifyTOTP(token: string, secret: string): boolean {
  try {
    return authenticator.verify({ token, secret });
  } catch (error) {
    console.error("TOTP verification error:", error);
    return false;
  }
}

/**
 * Genereer backup codes (10 stuks, 8 karakters elk)
 */
export function generateBackupCodes(count: number = 10): string[] {
  const codes: string[] = [];

  for (let i = 0; i < count; i++) {
    // Genereer 8-character code (4 bytes = 8 hex chars)
    const code = crypto.randomBytes(4).toString("hex").toUpperCase();
    codes.push(code);
  }

  return codes;
}

/**
 * Hash backup codes voor opslag in database
 */
export async function hashBackupCodes(codes: string[]): Promise<string[]> {
  const hashed: string[] = [];

  for (const code of codes) {
    const hash = await bcrypt.hash(code, 10);
    hashed.push(hash);
  }

  return hashed;
}

/**
 * Verifieer een backup code tegen een hashed code
 */
export async function verifyBackupCode(
  plainCode: string,
  hashedCodes: string[]
): Promise<{ valid: boolean; usedIndex: number }> {
  for (let i = 0; i < hashedCodes.length; i++) {
    const isValid = await bcrypt.compare(plainCode, hashedCodes[i]);
    if (isValid) {
      return { valid: true, usedIndex: i };
    }
  }

  return { valid: false, usedIndex: -1 };
}
