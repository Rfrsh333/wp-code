import { NextRequest, NextResponse } from "next/server";
import { checkRedisRateLimit, getClientIP, loginRateLimit } from "@/lib/rate-limit-redis";
import { isAdminEmail } from "@/lib/admin-auth";
import { supabaseAdmin } from "@/lib/supabase";
import { verifyTOTP, verifyBackupCode } from "@/lib/two-factor";
import { loginSchema, formatZodErrors } from "@/lib/validations";

export async function POST(request: NextRequest) {
  const clientIP = getClientIP(request);

  // Rate limiting check
  const rateLimit = await checkRedisRateLimit(`admin-login:${clientIP}`, loginRateLimit);

  if (!rateLimit.success) {
    console.warn(`[ADMIN LOGIN] Rate limit exceeded for IP: ${clientIP}`);
    return NextResponse.json(
      {
        error: "Te veel inlogpogingen. Probeer het later opnieuw."
      },
      {
        status: 429,
        headers: {
          "Retry-After": String(Math.max(1, Math.ceil((rateLimit.reset - Date.now()) / 1000))),
        },
      }
    );
  }

  try {
    const body = await request.json();
    const { email, password, twoFactorCode, isBackupCode = false } = body;

    // Zod validatie
    const parsed = loginSchema.safeParse({ email, wachtwoord: password });
    if (!parsed.success) {
      return NextResponse.json({ error: formatZodErrors(parsed.error) }, { status: 400 });
    }

    // Gebruik supabaseAdmin (service role key) voor login verificatie
    // omdat NEXT_PUBLIC_SUPABASE_ANON_KEY op Vercel onbetrouwbaar kan zijn
    const { data, error } = await supabaseAdmin.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      // Log mislukte poging met Supabase error details
      console.warn(`[ADMIN LOGIN] Failed attempt for email: ${email} from IP: ${clientIP} - Error: ${error.message}`);
      return NextResponse.json(
        { error: "Ongeldige inloggegevens", debug: error.message },
        { status: 401 }
      );
    }

    // Check of gebruiker een admin is
    if (!isAdminEmail(email)) {
      console.warn(`[ADMIN LOGIN] Unauthorized access attempt by non-admin: ${email} from IP: ${clientIP}`);

      // Sign out de gebruiker direct
      await supabaseAdmin.auth.signOut();

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
      await supabaseAdmin.auth.signOut();

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
          await supabaseAdmin.auth.signOut();
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
        await supabaseAdmin.auth.signOut();
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
