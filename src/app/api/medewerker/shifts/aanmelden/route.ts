import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { verifyMedewerkerSession } from "@/lib/session";

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

    // Check of dienst bestaat en beschikbaar is
    const { data: dienst, error: dienstError } = await supabaseAdmin
      .from("diensten")
      .select("id, plekken_beschikbaar, status")
      .eq("id", dienst_id)
      .single();

    if (dienstError || !dienst) {
      return NextResponse.json({ error: "Dienst niet gevonden" }, { status: 404 });
    }

    if (dienst.status !== "open") {
      return NextResponse.json({ error: "Deze dienst is niet meer open" }, { status: 400 });
    }

    if (dienst.plekken_beschikbaar <= 0) {
      return NextResponse.json({ error: "Geen plekken meer beschikbaar" }, { status: 400 });
    }

    // Check of medewerker al is aangemeld
    const { data: bestaandeAanmelding } = await supabaseAdmin
      .from("dienst_aanmeldingen")
      .select("id")
      .eq("medewerker_id", medewerker.id)
      .eq("dienst_id", dienst_id)
      .single();

    if (bestaandeAanmelding) {
      return NextResponse.json({ error: "Je bent al aangemeld voor deze dienst" }, { status: 400 });
    }

    // Maak aanmelding aan
    const { error: aanmeldError } = await supabaseAdmin
      .from("dienst_aanmeldingen")
      .insert({
        medewerker_id: medewerker.id,
        dienst_id: dienst_id,
        status: "bevestigd",
      });

    if (aanmeldError) {
      console.error("Aanmelding create error:", aanmeldError);
      return NextResponse.json({ error: "Aanmelden mislukt" }, { status: 500 });
    }

    // Update beschikbare plekken
    const { error: updateError } = await supabaseAdmin
      .from("diensten")
      .update({ plekken_beschikbaar: dienst.plekken_beschikbaar - 1 })
      .eq("id", dienst_id);

    if (updateError) {
      console.error("Update plekken error:", updateError);
      // Rollback aanmelding
      await supabaseAdmin
        .from("dienst_aanmeldingen")
        .delete()
        .eq("medewerker_id", medewerker.id)
        .eq("dienst_id", dienst_id);
      return NextResponse.json({ error: "Aanmelden mislukt" }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Aanmelden error:", error);
    return NextResponse.json({ error: "Er ging iets mis" }, { status: 500 });
  }
}
