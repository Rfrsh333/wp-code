import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { getMedewerkerSession } from "@/lib/portal-auth";
import { captureRouteError } from "@/lib/sentry-utils";
import { meldAan } from "@/lib/medewerker/aanmelden";

export async function POST(request: NextRequest) {
  try {
    const medewerker = await getMedewerkerSession(request);
    if (!medewerker) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { dienst_id } = await request.json();

    if (!dienst_id) {
      return NextResponse.json({ error: "Dienst ID is verplicht" }, { status: 400 });
    }

    // Haal aanmelding op voor verificatie
    const { data: aanmelding, error: aanmeldError } = await supabaseAdmin
      .from("dienst_aanmeldingen")
      .select("id, status, dienst_id")
      .eq("dienst_id", dienst_id)
      .eq("medewerker_id", medewerker.id)
      .eq("status", "uitgenodigd")
      .maybeSingle();

    if (aanmeldError || !aanmelding) {
      return NextResponse.json({ error: "Aanmelding niet gevonden of al verwerkt" }, { status: 404 });
    }

    // Uitnodiging aannemen = direct ingepland: zelfde controles als aanmelden (verlopen documenten,
    // capaciteit) en daarna de bezetting herberekenen.
    const resultaat = await meldAan(medewerker.id, dienst_id, "bevestigd", { bestaandeAanmeldingId: aanmelding.id });
    if (!resultaat.ok) {
      return NextResponse.json({ error: resultaat.error }, { status: resultaat.status });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    captureRouteError(error, { route: "/api/medewerker/diensten/accept", action: "POST" });
    // console.error("Accept dienst error:", error);
    return NextResponse.json({ error: "Er ging iets mis" }, { status: 500 });
  }
}
