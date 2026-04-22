import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { verifyMedewerkerSession } from "@/lib/session";
import { captureRouteError } from "@/lib/sentry-utils";

export async function POST(request: NextRequest) {
  try {
    const sessionCookie = request.cookies.get("medewerker_session");
    if (!sessionCookie) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const medewerker = await verifyMedewerkerSession(sessionCookie.value);
    if (!medewerker) {
      return NextResponse.json({ error: "Invalid session" }, { status: 401 });
    }

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
      .single();

    if (aanmeldError || !aanmelding) {
      return NextResponse.json({ error: "Aanmelding niet gevonden of al verwerkt" }, { status: 404 });
    }

    // Update status naar bevestigd
    const { error: updateError } = await supabaseAdmin
      .from("dienst_aanmeldingen")
      .update({ status: "bevestigd" })
      .eq("id", aanmelding.id);

    if (updateError) {
      captureRouteError(updateError, { route: "/api/medewerker/diensten/accept", action: "POST" });
      // console.error("Accept dienst error:", updateError);
      return NextResponse.json({ error: "Accepteren mislukt" }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    captureRouteError(error, { route: "/api/medewerker/diensten/accept", action: "POST" });
    // console.error("Accept dienst error:", error);
    return NextResponse.json({ error: "Er ging iets mis" }, { status: 500 });
  }
}
