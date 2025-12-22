import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { verifyAdmin } from "@/lib/admin-auth";
import { verifyTOTP } from "@/lib/two-factor";

/**
 * POST /api/admin/2fa/enable
 * Enable 2FA door eerste code te verifiëren
 */
export async function POST(request: NextRequest) {
  const { isAdmin, email } = await verifyAdmin(request);

  if (!isAdmin || !email) {
    console.warn(`[SECURITY] Unauthorized 2FA enable attempt`);
    return NextResponse.json(
      { error: "Unauthorized - Admin access required" },
      { status: 403 }
    );
  }

  try {
    const { code } = await request.json();

    if (!code || code.length !== 6) {
      return NextResponse.json(
        { error: "Invalid verification code" },
        { status: 400 }
      );
    }

    // Haal TOTP secret op
    const { data: twoFactor, error } = await supabaseAdmin
      .from("admin_2fa")
      .select("totp_secret, enabled")
      .eq("email", email)
      .single();

    if (error || !twoFactor || !twoFactor.totp_secret) {
      return NextResponse.json(
        { error: "2FA not setup. Run setup first." },
        { status: 400 }
      );
    }

    if (twoFactor.enabled) {
      return NextResponse.json(
        { error: "2FA already enabled" },
        { status: 400 }
      );
    }

    // Verifieer de code
    const isValid = verifyTOTP(code, twoFactor.totp_secret);

    if (!isValid) {
      console.warn(`[SECURITY] Invalid 2FA enable attempt for ${email}`);
      return NextResponse.json(
        { error: "Invalid verification code" },
        { status: 400 }
      );
    }

    // Enable 2FA
    const { error: updateError } = await supabaseAdmin
      .from("admin_2fa")
      .update({
        enabled: true,
        enabled_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("email", email);

    if (updateError) {
      console.error("2FA enable error:", updateError);
      return NextResponse.json(
        { error: "Failed to enable 2FA" },
        { status: 500 }
      );
    }

    console.log(`[SECURITY] 2FA enabled for admin: ${email}`);

    return NextResponse.json({
      success: true,
      message: "2FA enabled successfully",
    });
  } catch (error) {
    console.error("2FA enable error:", error);
    return NextResponse.json(
      { error: "Failed to enable 2FA" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/admin/2fa/enable
 * Disable 2FA (moet wachtwoord + current code opgeven)
 */
export async function DELETE(request: NextRequest) {
  const { isAdmin, email } = await verifyAdmin(request);

  if (!isAdmin || !email) {
    console.warn(`[SECURITY] Unauthorized 2FA disable attempt`);
    return NextResponse.json(
      { error: "Unauthorized - Admin access required" },
      { status: 403 }
    );
  }

  try {
    const { code } = await request.json();

    if (!code || code.length !== 6) {
      return NextResponse.json(
        { error: "Invalid verification code" },
        { status: 400 }
      );
    }

    // Haal 2FA data op
    const { data: twoFactor, error } = await supabaseAdmin
      .from("admin_2fa")
      .select("totp_secret, enabled")
      .eq("email", email)
      .single();

    if (error || !twoFactor || !twoFactor.enabled) {
      return NextResponse.json(
        { error: "2FA not enabled" },
        { status: 400 }
      );
    }

    // Verifieer current code
    const isValid = verifyTOTP(code, twoFactor.totp_secret);

    if (!isValid) {
      console.warn(`[SECURITY] Invalid 2FA disable attempt for ${email}`);
      return NextResponse.json(
        { error: "Invalid verification code" },
        { status: 400 }
      );
    }

    // Disable 2FA (verwijder secret maar bewaar record)
    const { error: updateError } = await supabaseAdmin
      .from("admin_2fa")
      .update({
        enabled: false,
        totp_secret: null,
        backup_codes: null,
        updated_at: new Date().toISOString(),
      })
      .eq("email", email);

    if (updateError) {
      console.error("2FA disable error:", updateError);
      return NextResponse.json(
        { error: "Failed to disable 2FA" },
        { status: 500 }
      );
    }

    console.log(`[SECURITY] 2FA disabled for admin: ${email}`);

    return NextResponse.json({
      success: true,
      message: "2FA disabled successfully",
    });
  } catch (error) {
    console.error("2FA disable error:", error);
    return NextResponse.json(
      { error: "Failed to disable 2FA" },
      { status: 500 }
    );
  }
}
