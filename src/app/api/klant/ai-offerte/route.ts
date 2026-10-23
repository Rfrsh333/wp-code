import { NextRequest, NextResponse } from "next/server";
import { getKlantSession } from "@/lib/portal-auth";
import { checkRedisRateLimit, apiRateLimit, getClientIP } from "@/lib/rate-limit-redis";
import { captureRouteError } from "@/lib/sentry-utils";
import { kiesUurtarief, tariefBereik } from "@/lib/pricing/ondergrens";
import { haalTariefOverzicht } from "@/lib/pricing/tarief-overzicht";

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

  const klant = await getKlantSession(request);
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

    // Zelfde prijsbron als de aanvraag-route: de suggestie mag niet onder de ondergrens liggen
    // die de aanvraag daarna afdwingt (voorheen vroeg de prompt om 12-18 euro).
    const tarieven = await haalTariefOverzicht("/api/klant/ai-offerte");
    const bereik = tariefBereik(tarieven);
    const tariefInstructie = bereik
      ? `number (uurtarief voor de klant in euro, minimaal ${bereik.min.toFixed(2)} en maximaal ${bereik.max.toFixed(2)}; basistarieven: ${tarieven
          .map((t) => `${t.functie} ${t.basis.toFixed(2)}`)
          .join(", ")})`
      : "number (uurtarief voor de klant in euro) of null";

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": anthropicKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        // claude-3-5-sonnet-20241022 is uitgefaseerd (requests faalden).
        model: "claude-sonnet-5-5",
        // Sonnet 5.5 denkt standaard (adaptief) en dat telt mee in max_tokens; 1024 kapte het
        // antwoord soms af vóór de JSON.
        max_tokens: 4000,
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
  "uurtarief_suggestie": ${tariefInstructie}
}`
        }],
      }),
    });

    if (!response.ok) {
      throw new Error("AI API error");
    }

    const data = await response.json();
    // Bij nieuwere modellen kan de eerste content-block een (lege) thinking-block zijn:
    // zoek het tekstblok i.p.v. blind content[0].text te lezen. Weigering = geen offerte.
    if (data.stop_reason === "refusal") throw new Error("AI weigerde de aanvraag");
    if (data.stop_reason === "max_tokens") throw new Error("AI-antwoord afgekapt (max_tokens)");
    const aiText: string = (data.content || []).find((b: { type?: string }) => b.type === "text")?.text ?? "";
    // Model zet JSON soms in een ```json-blok; pak het eerste {...}-object.
    const jsonTekst = aiText.slice(aiText.indexOf("{"), aiText.lastIndexOf("}") + 1);
    const parsed = JSON.parse(jsonTekst);

    const uurtarief = kiesUurtarief(parsed.uurtarief_suggestie, parsed.functie, tarieven);
    if (uurtarief == null) throw new Error("Geen uurtarief beschikbaar voor de offerte");
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
