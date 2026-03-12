import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { supabaseAdmin } from "@/lib/supabase";

export async function POST(request: NextRequest) {
  try {
    const { access_token, refresh_token, password } = await request.json();

    if (!access_token || !refresh_token || !password) {
      return NextResponse.json(
        { error: "access_token, refresh_token en password zijn verplicht" },
        { status: 400 }
      );
    }

    if (password.length < 8) {
      return NextResponse.json(
        { error: "Wachtwoord moet minimaal 8 tekens zijn" },
        { status: 400 }
      );
    }

    // Verify the recovery token by creating a temporary client and setting the session
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

    const tempClient = createClient(supabaseUrl, supabaseKey, {
      auth: { persistSession: false, detectSessionInUrl: false },
    });

    const { data: sessionData, error: sessionError } = await tempClient.auth.setSession({
      access_token,
      refresh_token,
    });

    if (sessionError || !sessionData.user) {
      console.error("[WACHTWOORD RESET] Session verification failed:", sessionError?.message);
      return NextResponse.json(
        { error: "Ongeldige of verlopen resetlink. Vraag een nieuwe aan." },
        { status: 401 }
      );
    }

    // Update password using admin client
    const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
      sessionData.user.id,
      { password }
    );

    if (updateError) {
      console.error("[WACHTWOORD RESET] Password update failed:", updateError.message);
      return NextResponse.json(
        { error: "Wachtwoord bijwerken mislukt. Probeer het opnieuw." },
        { status: 500 }
      );
    }

    console.log(`[WACHTWOORD RESET] Password updated for user: ${sessionData.user.email}`);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[WACHTWOORD RESET] Error:", error);
    return NextResponse.json(
      { error: "Er ging iets mis" },
      { status: 500 }
    );
  }
}
