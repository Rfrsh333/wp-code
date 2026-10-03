import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { getMedewerkerSession } from "@/lib/portal-auth";
import { sendShiftReactieEmail } from "@/lib/notifications";
import { captureRouteError } from "@/lib/sentry-utils";
import { meldAan } from "@/lib/medewerker/aanmelden";
import { isDemoMedewerker } from "@/lib/demo";

export async function GET(request: NextRequest) {
  const medewerker = await getMedewerkerSession(request);
  if (!medewerker) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data } = await supabaseAdmin
    .from("dienst_aanbiedingen")
    .select("*, dienst:diensten(klant_naam, locatie, datum, start_tijd, eind_tijd, functie, uurtarief)")
    .eq("medewerker_id", medewerker.id)
    .order("aangeboden_at", { ascending: false })
    .limit(100);

  return NextResponse.json({ aanbiedingen: data || [] });
}

export async function PATCH(request: NextRequest) {
  const medewerker = await getMedewerkerSession(request);
  if (!medewerker) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id, status } = await request.json();

  if (!["geaccepteerd", "afgewezen"].includes(status)) {
    return NextResponse.json({ error: "Ongeldige status" }, { status: 400 });
  }

  // Verify ownership
  const { data: aanbieding } = await supabaseAdmin
    .from("dienst_aanbiedingen")
    .select("id, dienst_id, status")
    .eq("id", id)
    .eq("medewerker_id", medewerker.id)
    .maybeSingle();

  if (!aanbieding) {
    return NextResponse.json({ error: "Aanbieding niet gevonden" }, { status: 404 });
  }

  if (aanbieding.status !== "aangeboden") {
    return NextResponse.json({ error: "Deze aanbieding is al beantwoord" }, { status: 400 });
  }

  // Accepteren = direct ingepland. Eerst de aanmelding (capaciteit, dubbele aanmelding, verlopen
  // documenten); pas als die lukt de aanbieding op geaccepteerd. Voorheen werd de insert-fout
  // genegeerd en kon een volle dienst overboekt raken.
  if (status === "geaccepteerd") {
    const resultaat = await meldAan(medewerker.id, aanbieding.dienst_id, "geaccepteerd");
    if (!resultaat.ok) {
      return NextResponse.json({ error: resultaat.error }, { status: resultaat.status });
    }
  }

  const { error: updateFout } = await supabaseAdmin
    .from("dienst_aanbiedingen")
    .update({ status, reactie_at: new Date().toISOString() })
    .eq("id", id)
    .eq("status", "aangeboden");
  if (updateFout) {
    captureRouteError(updateFout, { route: "/api/medewerker/aanbiedingen", action: "PATCH" });
    return NextResponse.json({ error: "Reageren mislukt" }, { status: 500 });
  }

  // Notify admin about response
  try {
    const { data: dienst } = await supabaseAdmin
      .from("diensten")
      .select("klant_naam, functie, datum")
      .eq("id", aanbieding.dienst_id)
      .single();

    // Geen mail naar TopTalent voor reacties van demo-accounts (lib/demo.ts).
    if (dienst && !(await isDemoMedewerker(medewerker.id))) {
      await sendShiftReactieEmail({
        medewerkerNaam: medewerker.naam,
        functie: dienst.functie,
        klantNaam: dienst.klant_naam,
        datum: dienst.datum,
        status: status as "geaccepteerd" | "afgewezen",
      });
    }
  } catch (emailError) {
    captureRouteError(emailError, { route: "/api/medewerker/aanbiedingen", action: "PATCH" });
    // console.error("Error sending shift reactie email:", emailError);
  }

  return NextResponse.json({ success: true });
}
