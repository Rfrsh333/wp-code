import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get("token");

    if (!token) {
      return NextResponse.json({ error: "Token vereist" }, { status: 400 });
    }

    // 🚀 Optimized: Direct O(1) database lookup
    const { data: matchedKandidaat } = await supabaseAdmin
      .from("inschrijvingen")
      .select("id, voornaam, achternaam, uitbetalingswijze, onboarding_portal_token_expires_at")
      .eq("onboarding_portal_token", token)
      .single();

    if (!matchedKandidaat) {
      return NextResponse.json({ error: "Ongeldige of verlopen link" }, { status: 403 });
    }

    // Check if token is expired
    const expiresAt = new Date(matchedKandidaat.onboarding_portal_token_expires_at);
    if (expiresAt < new Date()) {
      return NextResponse.json({ error: "Link is verlopen" }, { status: 403 });
    }

    // Fetch already uploaded documents
    const { data: documents } = await supabaseAdmin
      .from("kandidaat_documenten")
      .select("document_type, file_name, file_size")
      .eq("inschrijving_id", matchedKandidaat.id);

    return NextResponse.json({
      kandidaat: {
        voornaam: matchedKandidaat.voornaam,
        achternaam: matchedKandidaat.achternaam,
        uitbetalingswijze: matchedKandidaat.uitbetalingswijze,
      },
      uploaded_documents: documents || [],
    });
  } catch (error) {
    console.error("Validate token error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
