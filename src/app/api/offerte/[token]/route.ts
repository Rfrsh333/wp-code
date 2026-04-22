import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { captureRouteError } from "@/lib/sentry-utils";

// GET /api/offerte/[token] - Public: klant bekijkt offerte via token
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;

    if (!token || token.length < 32) {
      return NextResponse.json({ error: "Ongeldige link" }, { status: 400 });
    }

    const { data: offerte, error } = await supabaseAdmin
      .from("offertes")
      .select("offerte_nummer, bedrijfsnaam, contactpersoon, locatie, geldig_tot, status, ai_introductie, tarieven, korting_percentage, totaal_bedrag, accepted_at, accepted_naam, created_at")
      .eq("token", token)
      .single();

    if (error || !offerte) {
      return NextResponse.json({ error: "Offerte niet gevonden" }, { status: 404 });
    }

    // Check geldigheid
    const isVerlopen = offerte.geldig_tot && new Date(offerte.geldig_tot) < new Date();

    return NextResponse.json({
      offerte_nummer: offerte.offerte_nummer,
      bedrijfsnaam: offerte.bedrijfsnaam,
      contactpersoon: offerte.contactpersoon,
      locatie: offerte.locatie,
      geldig_tot: offerte.geldig_tot,
      is_verlopen: isVerlopen,
      status: offerte.status,
      ai_introductie: offerte.ai_introductie,
      tarieven: offerte.tarieven,
      korting_percentage: offerte.korting_percentage,
      totaal_bedrag: offerte.totaal_bedrag,
      accepted_at: offerte.accepted_at,
      accepted_naam: offerte.accepted_naam,
      created_at: offerte.created_at,
    });
  } catch (error) {
    captureRouteError(error, { route: "/api/offerte/[token]", action: "GET" });
    // console.error("Offerte fetch error:", error);
    return NextResponse.json({ error: "Fout bij ophalen offerte" }, { status: 500 });
  }
}
