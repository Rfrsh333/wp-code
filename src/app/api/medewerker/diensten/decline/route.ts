import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { getMedewerkerSession } from "@/lib/portal-auth";
import { captureRouteError } from "@/lib/sentry-utils";

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
      // Zonder unieke index kunnen er dubbele rijen zijn: neem de nieuwste i.p.v. te falen.
      .order("aangemeld_at", { ascending: false, nullsFirst: false })
      .limit(1)
      .maybeSingle();

    if (aanmeldError || !aanmelding) {
      return NextResponse.json({ error: "Aanmelding niet gevonden of al verwerkt" }, { status: 404 });
    }

    // Update status naar afgewezen
    const { error: updateError } = await supabaseAdmin
      .from("dienst_aanmeldingen")
      .update({ status: "afgewezen" })
      .eq("id", aanmelding.id)
      .eq("status", "uitgenodigd");

    if (updateError) {
      captureRouteError(updateError, { route: "/api/medewerker/diensten/decline", action: "POST" });
      // console.error("Decline dienst error:", updateError);
      return NextResponse.json({ error: "Afwijzen mislukt" }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    captureRouteError(error, { route: "/api/medewerker/diensten/decline", action: "POST" });
    // console.error("Decline dienst error:", error);
    return NextResponse.json({ error: "Er ging iets mis" }, { status: 500 });
  }
}
