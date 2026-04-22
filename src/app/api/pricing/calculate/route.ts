import { NextRequest, NextResponse } from "next/server";
import { calculatePrice } from "@/lib/pricing/smart-pricing";
import { captureRouteError } from "@/lib/sentry-utils";

// GET /api/pricing/calculate?functie=bediening&datum=2026-03-14&urenPerWeek=25
// Publieke route - berekent dynamisch tarief
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const functie = searchParams.get("functie");
  const datum = searchParams.get("datum");
  const urenPerWeek = searchParams.get("urenPerWeek");
  const loyaltyTier = searchParams.get("loyaltyTier");
  const isLastMinute = searchParams.get("lastMinute") === "true";

  if (!functie || !datum) {
    return NextResponse.json(
      { error: "functie en datum zijn verplicht" },
      { status: 400 }
    );
  }

  // Valideer datum
  const dateObj = new Date(datum);
  if (isNaN(dateObj.getTime())) {
    return NextResponse.json({ error: "Ongeldige datum" }, { status: 400 });
  }

  try {
    const result = await calculatePrice({
      functie,
      datum,
      urenPerWeek: urenPerWeek ? parseInt(urenPerWeek) : undefined,
      loyaltyTier: loyaltyTier || undefined,
      isLastMinute,
    });

    return NextResponse.json(result, {
      headers: { "Cache-Control": "public, max-age=60, stale-while-revalidate=120" },
    });
  } catch (error) {
    captureRouteError(error, { route: "/api/pricing/calculate", action: "GET" });
    // console.error("Pricing calculate error:", error);
    return NextResponse.json({ error: "Fout bij berekenen tarief" }, { status: 500 });
  }
}
