import { NextRequest, NextResponse } from "next/server";
import { verifyAdmin, hasRequiredAdminRole } from "@/lib/admin-auth";
import { checkRedisRateLimit, getClientIP, aiRateLimit } from "@/lib/rate-limit-redis";
import { generatePlanningSuggestie } from "@/lib/agents/dienst-planner";
import { isOpenAIConfigured } from "@/lib/openai";

export async function POST(request: NextRequest) {
  const { isAdmin, email } = await verifyAdmin(request);
  if (!isAdmin) {
    console.warn(`[SECURITY] Unauthorized AI planning attempt by: ${email || "unknown"}`);
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
    const { klant_naam, locatie, datum, functie, start_tijd, eind_tijd } = await request.json();

    if (!klant_naam || !locatie || !datum || !functie) {
      return NextResponse.json(
        { error: "klant_naam, locatie, datum en functie zijn vereist" },
        { status: 400 }
      );
    }

    const suggestie = await generatePlanningSuggestie({
      klant_naam,
      locatie,
      datum,
      functie,
      start_tijd,
      eind_tijd,
    });

    return NextResponse.json(suggestie);
  } catch (error) {
    console.error("AI planning error:", error);
    return NextResponse.json({ error: "Planning suggestie mislukt" }, { status: 500 });
  }
}
