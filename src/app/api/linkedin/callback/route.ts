import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { exchangeCodeForTokens } from "@/lib/linkedin/token-manager";
import { LinkedInClient } from "@/lib/linkedin/client";
import { sendTelegramAlert } from "@/lib/telegram";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const error = searchParams.get("error");
  const errorDescription = searchParams.get("error_description");

  const adminUrl = process.env.NEXT_PUBLIC_SITE_URL || "";

  if (error) {
    console.error(`[LinkedIn OAuth] Error: ${error} - ${errorDescription}`);
    return NextResponse.redirect(
      `${adminUrl}/admin?tab=linkedin&error=${encodeURIComponent(errorDescription || error)}`
    );
  }

  if (!code) {
    return NextResponse.redirect(
      `${adminUrl}/admin?tab=linkedin&error=${encodeURIComponent("Geen autorisatiecode ontvangen")}`
    );
  }

  try {
    // Exchange code for tokens
    const tokens = await exchangeCodeForTokens(code);
    if (!tokens) {
      return NextResponse.redirect(
        `${adminUrl}/admin?tab=linkedin&error=${encodeURIComponent("Token exchange mislukt")}`
      );
    }

    // Get profile info
    const client = new LinkedInClient(tokens.access_token, "");
    const profile = await client.getProfile();

    // Deactivate existing connections
    await supabaseAdmin
      .from("linkedin_connections")
      .update({ is_active: false, updated_at: new Date().toISOString() })
      .eq("is_active", true);

    // Store new connection
    const { error: dbError } = await supabaseAdmin
      .from("linkedin_connections")
      .upsert(
        {
          user_email: "admin@toptalentjobs.nl", // Will be overridden by actual admin email
          linkedin_person_id: profile.id,
          access_token: tokens.access_token,
          refresh_token: tokens.refresh_token || null,
          token_expires_at: new Date(Date.now() + tokens.expires_in * 1000).toISOString(),
          refresh_token_expires_at: tokens.refresh_token_expires_in
            ? new Date(Date.now() + tokens.refresh_token_expires_in * 1000).toISOString()
            : null,
          scopes: tokens.scope?.split(" ") || [],
          profile_name: profile.name,
          profile_image_url: profile.picture || null,
          is_active: true,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_email" }
      );

    if (dbError) {
      console.error("[LinkedIn OAuth] DB error:", dbError);
      return NextResponse.redirect(
        `${adminUrl}/admin?tab=linkedin&error=${encodeURIComponent("Database fout bij opslaan")}`
      );
    }

    await sendTelegramAlert(
      `🔗 <b>LinkedIn gekoppeld</b>\nProfiel: ${profile.name}\nToken geldig tot: ${new Date(Date.now() + tokens.expires_in * 1000).toLocaleDateString("nl-NL")}`
    );

    return NextResponse.redirect(`${adminUrl}/admin?tab=linkedin&success=connected`);
  } catch (err) {
    console.error("[LinkedIn OAuth] Callback error:", err);
    return NextResponse.redirect(
      `${adminUrl}/admin?tab=linkedin&error=${encodeURIComponent("Onverwachte fout bij koppelen")}`
    );
  }
}
