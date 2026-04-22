import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifyKlantSession } from "@/lib/session";
import { checkRedisRateLimit, apiRateLimit, getClientIP } from "@/lib/rate-limit-redis";
import { captureRouteError } from "@/lib/sentry-utils";

async function getKlant() {
  const cookieStore = await cookies();
  const session = cookieStore.get("klant_session");
  if (!session) return null;
  return await verifyKlantSession(session.value);
}

export async function POST(request: NextRequest) {
  // Rate limiting: voorkom misbruik van AI endpoint
  const ip = getClientIP(request);
  const rateLimitResult = await checkRedisRateLimit(`ai-offerte:${ip}`, apiRateLimit);
  if (!rateLimitResult.success) {
    return NextResponse.json(
      { error: "Te veel verzoeken. Probeer het over een minuut opnieuw." },
      { status: 429 }
    );
  }

  const klant = await getKlant();
  if (!klant) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { beschrijving } = await request.json();
  if (!beschrijving || typeof beschrijving !== "string" || beschrijving.length > 5000) {
    return NextResponse.json({ error: "Beschrijving vereist (max 5000 tekens)" }, { status: 400 });
  }

  try {
    const anthropicKey = process.env.ANTHROPIC_API_KEY;
    if (!anthropicKey) {
      return NextResponse.json({ error: "AI niet geconfigureerd" }, { status: 500 });
    }

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": anthropicKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-3-5-sonnet-20241022",
        max_tokens: 1024,
        messages: [{
          role: "user",
          content: `Analyseer deze horeca personeel aanvraag en extraheer de informatie. Return alleen valid JSON zonder extra tekst.

Beschrijving: ${beschrijving}

Return format:
{
  "functie": "bediening|bar|keuken|afwas",
  "aantal": number,
  "datum": "YYYY-MM-DD" of null,
  "start_tijd": "HH:MM" of null,
  "eind_tijd": "HH:MM" of null,
  "uren_geschat": number,
  "locatie": "string" of null,
  "bijzonderheden": "string" of null,
  "uurtarief_suggestie": number (tussen 12-18 euro)
}`
        }],
      }),
    });

    if (!response.ok) {
      throw new Error("AI API error");
    }

    const data = await response.json();
    const aiText = data.content[0].text;
    const parsed = JSON.parse(aiText);

    const uurtarief = parsed.uurtarief_suggestie || 14;
    const uren = parsed.uren_geschat || 6;
    const totaalKosten = parsed.aantal * uurtarief * uren * 1.04;

    return NextResponse.json({
      success: true,
      offerte: {
        ...parsed,
        uurtarief,
        uren_totaal: parsed.aantal * uren,
        kosten_subtotaal: totaalKosten,
        kosten_btw: totaalKosten * 0.21,
        kosten_totaal: totaalKosten * 1.21,
      },
    });
  } catch (error) {
    captureRouteError(error, { route: "/api/klant/ai-offerte", action: "POST" });
    // console.error("AI offerte error:", error);
    return NextResponse.json({ error: "AI verwerking mislukt" }, { status: 500 });
  }
}
