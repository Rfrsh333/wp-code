import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { isAdminEmail } from "@/lib/admin-auth";

/**
 * Verifieert of de huidige gebruiker een admin is
 * Deze endpoint wordt aangeroepen vanuit de client met de sessie
 */
export async function POST(request: NextRequest) {
  try {
    const { session } = await request.json();

    if (!session?.access_token) {
      return NextResponse.json(
        { error: "Geen authenticatie" },
        { status: 401 }
      );
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
      console.error("[ADMIN VERIFY] Supabase configuratie ontbreekt");
      return NextResponse.json(
        { error: "Server configuratie fout" },
        { status: 500 }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Verifieer het token
    const { data: { user }, error } = await supabase.auth.getUser(session.access_token);

    if (error || !user || !user.email) {
      return NextResponse.json(
        { error: "Ongeldige sessie" },
        { status: 401 }
      );
    }

    // Check of de gebruiker een admin is
    if (!isAdminEmail(user.email)) {
      console.warn(`[ADMIN VERIFY] Non-admin user attempted access: ${user.email}`);
      return NextResponse.json(
        { error: "Geen admin rechten" },
        { status: 403 }
      );
    }

    return NextResponse.json({
      success: true,
      email: user.email,
    });
  } catch (error) {
    console.error("[ADMIN VERIFY] Error:", error);
    return NextResponse.json(
      { error: "Verificatie fout" },
      { status: 500 }
    );
  }
}
