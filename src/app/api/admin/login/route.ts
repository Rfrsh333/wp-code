import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { checkRateLimit, getClientIP } from "@/lib/rate-limit";
import { isAdminEmail } from "@/lib/admin-auth";
import { supabaseAdmin } from "@/lib/supabase";
import { verifyTOTP, verifyBackupCode } from "@/lib/two-factor";

// Strikte rate limiting voor admin login: max 5 pogingen per 15 minuten
const LOGIN_RATE_LIMIT = {
  windowMs: 15 * 60 * 1000, // 15 minuten
  maxRequests: 5,
};

export async function POST(request: NextRequest) {
  const clientIP = getClientIP(request);

  // Rate limiting check
  const rateLimit = checkRateLimit(`admin-login:${clientIP}`, LOGIN_RATE_LIMIT);

  if (!rateLimit.success) {
    console.warn(`[ADMIN LOGIN] Rate limit exceeded for IP: ${clientIP}`);
    return NextResponse.json(
      {
        error: `Te veel inlogpogingen. Probeer opnieuw over ${Math.ceil(rateLimit.resetIn! / 60)} minuten.`
      },
      { status: 429 }
    );
  }

  try {
    const { email, password, twoFactorCode, isBackupCode = false } = await request.json();

    if (!email || !password) {
      return NextResponse.json(
        { error: "E-mail en wachtwoord zijn verplicht" },
        { status: 400 }
      );
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
      console.error("[ADMIN LOGIN] Supabase configuratie ontbreekt");
      return NextResponse.json(
        { error: "Server configuratie fout" },
        { status: 500 }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      // Log mislukte poging (zonder wachtwoord)
      console.warn(`[ADMIN LOGIN] Failed attempt for email: ${email} from IP: ${clientIP}`);
      return NextResponse.json(
        { error: "Ongeldige inloggegevens" },
        { status: 401 }
      );
    }

    // Check of gebruiker een admin is
    if (!isAdminEmail(email)) {
      console.warn(`[ADMIN LOGIN] Unauthorized access attempt by non-admin: ${email} from IP: ${clientIP}`);

      // Sign out de gebruiker direct
      await supabase.auth.signOut();

      return NextResponse.json(
        { error: "Geen toegang. Alleen administrators kunnen inloggen." },
        { status: 403 }
      );
    }

    // Check of 2FA enabled is voor deze admin
    const { data: twoFactorData } = await supabaseAdmin
      .from("admin_2fa")
      .select("enabled, totp_secret, backup_codes")
      .eq("email", email)
      .single();

    const requires2FA = twoFactorData?.enabled || false;

    // Als 2FA vereist is maar geen code gegeven
    if (requires2FA && !twoFactorCode) {
      console.log(`[ADMIN LOGIN] 2FA required for ${email}`);

      // Sign out voor nu (front-end moet opnieuw posten met 2FA code)
      await supabase.auth.signOut();

      return NextResponse.json({
        success: false,
        requires2FA: true,
        message: "2FA verification required",
      });
    }

    // Als 2FA vereist is EN code is gegeven, verifieer de code
    if (requires2FA && twoFactorCode && twoFactorData) {
      let isValid = false;

      if (isBackupCode) {
        // Verifieer backup code
        if (!twoFactorData.backup_codes || twoFactorData.backup_codes.length === 0) {
          await supabase.auth.signOut();
          return NextResponse.json(
            { error: "Geen backup codes beschikbaar" },
            { status: 400 }
          );
        }

        const result = await verifyBackupCode(twoFactorCode, twoFactorData.backup_codes);

        if (result.valid) {
          // Verwijder gebruikte backup code
          const newBackupCodes = [...twoFactorData.backup_codes];
          newBackupCodes.splice(result.usedIndex, 1);

          await supabaseAdmin
            .from("admin_2fa")
            .update({ backup_codes: newBackupCodes })
            .eq("email", email);

          console.log(`[ADMIN LOGIN] Backup code used for ${email}. ${newBackupCodes.length} remaining.`);
          isValid = true;
        }
      } else {
        // Verifieer TOTP code
        isValid = verifyTOTP(twoFactorCode, twoFactorData.totp_secret);
      }

      if (!isValid) {
        console.warn(`[ADMIN LOGIN] Invalid 2FA code for ${email}`);
        await supabase.auth.signOut();
        return NextResponse.json(
          { error: "Ongeldige 2FA code" },
          { status: 401 }
        );
      }

      console.log(`[ADMIN LOGIN] 2FA verified for ${email}`);
    }

    // Log succesvolle login
    console.log(`[ADMIN LOGIN] Successful admin login for email: ${email} from IP: ${clientIP}`);

    return NextResponse.json({
      success: true,
      session: data.session,
      requires2FA: false,
    });
  } catch (error) {
    console.error("[ADMIN LOGIN] Error:", error);
    return NextResponse.json(
      { error: "Er is een fout opgetreden" },
      { status: 500 }
    );
  }
}
