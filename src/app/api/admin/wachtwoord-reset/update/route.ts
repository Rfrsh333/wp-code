import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { isAdminEmail } from "@/lib/admin-auth";
import { checkRedisRateLimit, getClientIP, loginRateLimit } from "@/lib/rate-limit-redis";
import { captureRouteError } from "@/lib/sentry-utils";

export async function POST(request: NextRequest) {
  const clientIP = getClientIP(request);
  const rateLimit = await checkRedisRateLimit(`admin-reset-update:${clientIP}`, loginRateLimit);

  if (!rateLimit.success) {
    return NextResponse.json(
      { error: "Te veel verzoeken. Probeer het later opnieuw." },
      { status: 429 }
    );
  }

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

    // SECURITY: Verifieer het JWT token via Supabase auth.getUser()
    // Dit valideert de signature in plaats van handmatig decoderen
    const { data: { user: verifiedUser }, error: authError } = await supabaseAdmin.auth.getUser(access_token);

    if (authError || !verifiedUser) {
      console.warn("[WACHTWOORD RESET] Token verificatie mislukt:", authError?.message);
      return NextResponse.json(
        { error: "Ongeldige of verlopen resetlink. Vraag een nieuwe aan." },
        { status: 401 }
      );
    }

    const userId = verifiedUser.id;
    const userEmail = verifiedUser.email;

    // Verify it's an admin email
    if (userEmail && !isAdminEmail(userEmail)) {
      return NextResponse.json(
        { error: "Dit account is geen admin account" },
        { status: 403 }
      );
    }

    // User is already verified via getUser(), use the verified data
    const userData = { user: verifiedUser };

    // Update password using admin client
    const { data: updateData, error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
      userId,
      { password }
    );

    if (updateError) {
      captureRouteError(updateError, { route: "/api/admin/wachtwoord-reset/update", action: "POST" });
      // console.error("[WACHTWOORD RESET] Password update failed:", updateError.message);
      return NextResponse.json(
        { error: "Wachtwoord bijwerken mislukt. Probeer het opnieuw." },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    captureRouteError(error, { route: "/api/admin/wachtwoord-reset/update", action: "POST" });
    // console.error("[WACHTWOORD RESET] Error:", error);
    return NextResponse.json(
      { error: "Er ging iets mis" },
      { status: 500 }
    );
  }
}
