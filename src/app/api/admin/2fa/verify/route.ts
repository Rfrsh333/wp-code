import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { verifyTOTP, verifyBackupCode } from "@/lib/two-factor";

/**
 * POST /api/admin/2fa/verify
 * Verifieer 2FA code tijdens login (kan ook backup code zijn)
 */
export async function POST(request: NextRequest) {
  try {
    const { email, code, isBackupCode = false } = await request.json();

    if (!email || !code) {
      return NextResponse.json(
        { error: "Email and code required" },
        { status: 400 }
      );
    }

    // Haal 2FA data op
    const { data: twoFactor, error } = await supabaseAdmin
      .from("admin_2fa")
      .select("totp_secret, enabled, backup_codes")
      .eq("email", email)
      .single();

    if (error || !twoFactor || !twoFactor.enabled) {
      console.warn(`[SECURITY] 2FA verify attempt for non-2FA user: ${email}`);
      return NextResponse.json(
        { error: "2FA not enabled" },
        { status: 400 }
      );
    }

    let isValid = false;

    // Backup code verificatie
    if (isBackupCode) {
      if (!twoFactor.backup_codes || twoFactor.backup_codes.length === 0) {
        return NextResponse.json(
          { error: "No backup codes available" },
          { status: 400 }
        );
      }

      const result = await verifyBackupCode(code, twoFactor.backup_codes);

      if (result.valid) {
        // Verwijder gebruikte backup code
        const newBackupCodes = [...twoFactor.backup_codes];
        newBackupCodes.splice(result.usedIndex, 1);

        await supabaseAdmin
          .from("admin_2fa")
          .update({
            backup_codes: newBackupCodes,
            updated_at: new Date().toISOString(),
          })
          .eq("email", email);

        console.log(`[SECURITY] Backup code used for ${email}. ${newBackupCodes.length} codes remaining.`);
        isValid = true;
      }
    }
    // TOTP verificatie
    else {
      if (!twoFactor.totp_secret) {
        return NextResponse.json(
          { error: "2FA not properly setup" },
          { status: 400 }
        );
      }

      isValid = verifyTOTP(code, twoFactor.totp_secret);
    }

    if (!isValid) {
      console.warn(`[SECURITY] Invalid 2FA code for ${email}`);
      return NextResponse.json(
        { error: "Invalid verification code" },
        { status: 401 }
      );
    }

    console.log(`[SECURITY] 2FA verified successfully for ${email}`);

    return NextResponse.json({
      success: true,
      verified: true,
    });
  } catch (error) {
    console.error("2FA verify error:", error);
    return NextResponse.json(
      { error: "Verification failed" },
      { status: 500 }
    );
  }
}
