import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { cookies } from "next/headers";

export async function POST(request: NextRequest) {
  try {
    // Verify medewerker session via signed JWT
    const cookieStore = await cookies();
    const session = cookieStore.get("medewerker_session");
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { verifyMedewerkerSession } = await import("@/lib/session");
    const medewerker = await verifyMedewerkerSession(session.value);
    if (!medewerker) {
      console.warn("[SECURITY] Invalid medewerker session token on shifts/aanmelden");
      return NextResponse.json({ error: "Unauthorized - Invalid session" }, { status: 401 });
    }

    const { dienst_id } = await request.json();

    if (!dienst_id) {
      return NextResponse.json({ error: "Dienst ID is verplicht" }, { status: 400 });
    }

    // Check of account gepauzeerd is
    const { data: mwStatus } = await supabaseAdmin
      .from("medewerkers")
      .select("status")
      .eq("id", medewerker.id)
      .single();

    if (mwStatus?.status === "gepauzeerd") {
      return NextResponse.json(
        { error: "Je account is gepauzeerd vanwege een openstaande boete. Neem contact op met TopTalent." },
        { status: 403 }
      );
    }

    // Check of dienst bestaat en beschikbaar is
    const { data: dienst, error: dienstError } = await supabaseAdmin
      .from("diensten")
      .select("id, plekken_beschikbaar, plekken_totaal, status")
      .eq("id", dienst_id)
      .single();

    if (dienstError || !dienst) {
      return NextResponse.json({ error: "Dienst niet gevonden" }, { status: 404 });
    }

    if (dienst.status !== "open") {
      return NextResponse.json({ error: "Deze dienst is niet meer beschikbaar" }, { status: 400 });
    }

    if (dienst.plekken_beschikbaar !== null && dienst.plekken_beschikbaar <= 0) {
      return NextResponse.json({ error: "Geen plekken meer beschikbaar" }, { status: 400 });
    }

    // Check of medewerker al is aangemeld
    const { data: bestaandeAanmelding } = await supabaseAdmin
      .from("dienst_aanmeldingen")
      .select("id")
      .eq("medewerker_id", medewerker.id)
      .eq("dienst_id", dienst_id)
      .in("status", ["aangemeld", "geaccepteerd"])
      .maybeSingle();

    if (bestaandeAanmelding) {
      return NextResponse.json({ error: "Je bent al aangemeld voor deze dienst" }, { status: 409 });
    }

    // Maak aanmelding aan
    const { error: aanmeldError } = await supabaseAdmin
      .from("dienst_aanmeldingen")
      .insert({
        medewerker_id: medewerker.id,
        dienst_id: dienst_id,
        status: "aangemeld",
      });

    if (aanmeldError) {
      console.error("[SHIFTS AANMELDEN] Insert error:", aanmeldError);
      return NextResponse.json({ error: "Aanmelden mislukt" }, { status: 500 });
    }

    // Update beschikbare plekken
    if (dienst.plekken_beschikbaar !== null && dienst.plekken_beschikbaar > 0) {
      const nieuwBeschikbaar = dienst.plekken_beschikbaar - 1;
      const { error: updateError } = await supabaseAdmin
        .from("diensten")
        .update({
          plekken_beschikbaar: nieuwBeschikbaar,
          status: nieuwBeschikbaar === 0 ? "vol" : "open",
        })
        .eq("id", dienst_id);

      if (updateError) {
        console.error("[SHIFTS AANMELDEN] Update plekken error:", updateError);
        // Don't rollback - aanmelding is created, plekken update is best-effort
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[SHIFTS AANMELDEN] Error:", error);
    return NextResponse.json({ error: "Er ging iets mis bij het aanmelden" }, { status: 500 });
  }
}
