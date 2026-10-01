import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { getMedewerkerSession } from "@/lib/portal-auth";
import { sendShiftReactieEmail } from "@/lib/notifications";
import { captureRouteError } from "@/lib/sentry-utils";

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
    .single();

  if (!aanbieding) {
    return NextResponse.json({ error: "Aanbieding niet gevonden" }, { status: 404 });
  }

  if (aanbieding.status !== "aangeboden") {
    return NextResponse.json({ error: "Deze aanbieding is al beantwoord" }, { status: 400 });
  }

  await supabaseAdmin
    .from("dienst_aanbiedingen")
    .update({ status, reactie_at: new Date().toISOString() })
    .eq("id", id);

  // If accepted, also create a dienst_aanmelding
  if (status === "geaccepteerd") {
    await supabaseAdmin.from("dienst_aanmeldingen").insert({
      dienst_id: aanbieding.dienst_id,
      medewerker_id: medewerker.id,
      status: "geaccepteerd",
    });
  }

  // Notify admin about response
  try {
    const { data: dienst } = await supabaseAdmin
      .from("diensten")
      .select("klant_naam, functie, datum")
      .eq("id", aanbieding.dienst_id)
      .single();

    if (dienst) {
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
