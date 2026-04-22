import { NextRequest, NextResponse } from "next/server";
import { verifyAdmin, hasRequiredAdminRole } from "@/lib/admin-auth";
import { checkRedisRateLimit, getClientIP, aiRateLimit } from "@/lib/rate-limit-redis";
import { supabaseAdmin } from "@/lib/supabase";
import { screenKandidaat } from "@/lib/agents/kandidaat-screening";
import { isOpenAIConfigured } from "@/lib/openai";

export async function POST(request: NextRequest) {
  const { isAdmin, email } = await verifyAdmin(request);
  if (!isAdmin) {
    console.warn(`[SECURITY] Unauthorized AI screening attempt by: ${email || "unknown"}`);
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  // Rate limiting
  const clientIP = getClientIP(request);
  const rateLimit = await checkRedisRateLimit(`ai-admin:${clientIP}`, aiRateLimit);
  if (!rateLimit.success) {
    return NextResponse.json(
      { error: "Te veel verzoeken. Probeer het later opnieuw." },
      { status: 429, headers: { "Retry-After": String(Math.max(1, Math.ceil((rateLimit.reset - Date.now()) / 1000))) } }
    );
  }

  if (!isOpenAIConfigured()) {
    return NextResponse.json({ error: "OpenAI is niet geconfigureerd" }, { status: 503 });
  }

  try {
    const { inschrijving_id } = await request.json();

    if (!inschrijving_id) {
      return NextResponse.json({ error: "inschrijving_id is vereist" }, { status: 400 });
    }

    // Haal inschrijving op
    const { data: inschrijving, error: dbError } = await supabaseAdmin
      .from("inschrijvingen")
      .select(
        "voornaam, achternaam, stad, geboortedatum, horeca_ervaring, gewenste_functies, talen, eigen_vervoer, beschikbaarheid, beschikbaar_vanaf, max_uren_per_week, uitbetalingswijze, motivatie"
      )
      .eq("id", inschrijving_id)
      .single();

    if (dbError || !inschrijving) {
      return NextResponse.json({ error: "Inschrijving niet gevonden" }, { status: 404 });
    }

    const result = await screenKandidaat(inschrijving);

    // Sla screening resultaat op
    await supabaseAdmin
      .from("inschrijvingen")
      .update({
        ai_screening_score: result.score,
        ai_screening_notes: JSON.stringify(result),
        ai_screening_date: new Date().toISOString(),
      })
      .eq("id", inschrijving_id);

    return NextResponse.json(result);
  } catch (error) {
    console.error("AI screening error:", error);
    return NextResponse.json({ error: "Screening mislukt" }, { status: 500 });
  }
}
