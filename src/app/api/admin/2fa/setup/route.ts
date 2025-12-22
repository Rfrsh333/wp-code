import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { verifyAdmin } from "@/lib/admin-auth";
import {
  generateTOTPSecret,
  generateQRCode,
  generateBackupCodes,
  hashBackupCodes,
} from "@/lib/two-factor";

/**
 * GET /api/admin/2fa/setup
 * Genereer nieuwe TOTP secret en QR code voor admin
 */
export async function GET(request: NextRequest) {
  const { isAdmin, email } = await verifyAdmin(request);

  if (!isAdmin || !email) {
    console.warn(`[SECURITY] Unauthorized 2FA setup attempt`);
    return NextResponse.json(
      { error: "Unauthorized - Admin access required" },
      { status: 403 }
    );
  }

  try {
    // Genereer TOTP secret
    const secret = generateTOTPSecret();

    // Genereer QR code
    const qrCodeDataUrl = await generateQRCode(email, secret);

    // Genereer backup codes
    const backupCodes = generateBackupCodes(10);

    // Hash backup codes voor opslag
    const hashedBackupCodes = await hashBackupCodes(backupCodes);

    // Sla secret en hashed backup codes op (maar nog niet enabled)
    const { error } = await supabaseAdmin
      .from("admin_2fa")
      .upsert({
        email,
        totp_secret: secret,
        backup_codes: hashedBackupCodes,
        enabled: false, // Wordt pas true na verificatie
        updated_at: new Date().toISOString(),
      }, {
        onConflict: "email"
      });

    if (error) {
      console.error("2FA setup database error:", error);
      return NextResponse.json(
        { error: "Failed to setup 2FA" },
        { status: 500 }
      );
    }

    // Return QR code en plain backup codes (alleen deze keer!)
    return NextResponse.json({
      qrCode: qrCodeDataUrl,
      secret, // Voor manual entry
      backupCodes, // Plain codes - gebruiker moet deze opslaan!
    });
  } catch (error) {
    console.error("2FA setup error:", error);
    return NextResponse.json(
      { error: "Failed to setup 2FA" },
      { status: 500 }
    );
  }
}
