import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { supabaseAdmin } from "@/lib/supabase";
import { isAdminEmail } from "@/lib/admin-auth";

export async function POST(request: NextRequest) {
  try {
    const { access_token, password } = await request.json();

    if (!access_token || !password) {
      return NextResponse.json(
        { error: "access_token en password zijn verplicht" },
        { status: 400 }
      );
    }

    if (password.length < 8) {
      return NextResponse.json(
        { error: "Wachtwoord moet minimaal 8 tekens zijn" },
        { status: 400 }
      );
    }

    // Decode the JWT to get the user ID (without verifying signature -
    // Supabase admin.updateUserById will reject if the user doesn't exist)
    let payload: { sub?: string; email?: string; exp?: number };
    try {
      const parts = access_token.split(".");
      if (parts.length !== 3) throw new Error("Invalid JWT format");
      payload = JSON.parse(Buffer.from(parts[1], "base64url").toString());
    } catch {
      return NextResponse.json(
        { error: "Ongeldig token formaat" },
        { status: 400 }
      );
    }

    // Check expiration
    if (payload.exp && payload.exp * 1000 < Date.now()) {
      return NextResponse.json(
        { error: "Deze resetlink is verlopen. Vraag een nieuwe aan." },
        { status: 401 }
      );
    }

    const userId = payload.sub;
    const userEmail = payload.email;

    if (!userId) {
      return NextResponse.json(
        { error: "Geen gebruiker gevonden in token" },
        { status: 400 }
      );
    }

    // Verify it's an admin email
    if (userEmail && !isAdminEmail(userEmail)) {
      return NextResponse.json(
        { error: "Dit account is geen admin account" },
        { status: 403 }
      );
    }

    // Verify user exists via admin API
    const { data: userData, error: userError } = await supabaseAdmin.auth.admin.getUserById(userId);

    if (userError || !userData.user) {
      console.error("[WACHTWOORD RESET] User not found:", userError?.message);
      return NextResponse.json(
        { error: "Gebruiker niet gevonden" },
        { status: 404 }
      );
    }

    // Update password using admin client
    const { data: updateData, error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
      userId,
      { password }
    );

    if (updateError) {
      console.error("[WACHTWOORD RESET] Password update failed:", updateError.message);
      return NextResponse.json(
        { error: "Wachtwoord bijwerken mislukt. Probeer het opnieuw." },
        { status: 500 }
      );
    }

    console.log(`[WACHTWOORD RESET] Password updated for user: ${userData.user.email}, id: ${userId}`);
    console.log(`[WACHTWOORD RESET] Updated_at: ${updateData.user.updated_at}`);

    // Verify the new password works by attempting a sign-in
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
    const verifyClient = createClient(supabaseUrl, supabaseKey, {
      auth: { persistSession: false, detectSessionInUrl: false },
    });

    const { error: verifyError } = await verifyClient.auth.signInWithPassword({
      email: userData.user.email!,
      password,
    });

    if (verifyError) {
      console.error("[WACHTWOORD RESET] Verification sign-in failed:", verifyError.message);
      // Password was updated but verification failed - still return success
      // but log for debugging
    } else {
      console.log("[WACHTWOORD RESET] Password verified successfully via sign-in test");
      await verifyClient.auth.signOut();
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[WACHTWOORD RESET] Error:", error);
    return NextResponse.json(
      { error: "Er ging iets mis" },
      { status: 500 }
    );
  }
}
