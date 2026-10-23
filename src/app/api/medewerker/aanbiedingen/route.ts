import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { getMedewerkerSession } from "@/lib/portal-auth";
import { geenMedewerkerToegang } from "@/lib/medewerker/sessie-boete";
import { sendShiftReactieEmail } from "@/lib/notifications";
import { captureRouteError } from "@/lib/sentry-utils";
import { meldAan, aanmeldFoutBody } from "@/lib/medewerker/aanmelden";
import { isAanbiedingVerlopen } from "@/lib/medewerker/dienst-regels";
import { isDemoMedewerker } from "@/lib/demo";
import { GEEN_EXTRAS, haalDienstExtras } from "@/lib/medewerker/reactie-voorwaarden";
import { fotoVoorDienst } from "@/lib/sfeerfotos";
import { haalBedrijfsfotos } from "@/lib/sfeerfotos-opslag";

export async function GET(request: NextRequest) {
  const medewerker = await getMedewerkerSession(request);
  if (!medewerker) return geenMedewerkerToegang(request);

  const { data } = await supabaseAdmin
    .from("dienst_aanbiedingen")
    .select("*, dienst:diensten(klant_naam, klant_id, locatie, datum, start_tijd, eind_tijd, functie, uurtarief, afbeelding_url)")
    .eq("medewerker_id", medewerker.id)
    .order("aangeboden_at", { ascending: false })
    .limit(100);

  // Een aanbieding is 48 uur geldig (verlopen_at). Een verlopen, onbeantwoorde aanbieding
  // tonen we als "verlopen", zodat er geen Accepteren-knop meer bij staat.
  // Kledingvoorschrift en pauze bij de dienst (leeg zolang de migratie niet gedraaid is).
  // En de sfeerfoto van de dienst (dienst → bedrijfsfoto → standaard, lib/sfeerfotos.ts).
  type DienstEmbed = { klant_id?: string | null; functie?: string | null; afbeelding_url?: string | null };
  const [extras, bedrijfsfotos] = await Promise.all([
    haalDienstExtras((data || []).map((a) => a.dienst_id as string)),
    haalBedrijfsfotos((data || []).map((a) => (a.dienst as DienstEmbed | null)?.klant_id)),
  ]);
  const aanbiedingen = (data || []).map((a) => {
    const d = a.dienst as DienstEmbed | null;
    const foto = d
      ? fotoVoorDienst({ id: a.dienst_id as string, functie: d.functie, afbeelding_url: d.afbeelding_url }, d.klant_id ? bedrijfsfotos.get(d.klant_id) : null)
      : null;
    const metExtras = a.dienst ? { ...a, dienst: { ...a.dienst, ...(extras.get(a.dienst_id as string) ?? GEEN_EXTRAS), foto } } : a;
    return a.status === "aangeboden" && isAanbiedingVerlopen(a.verlopen_at) ? { ...metExtras, status: "verlopen" } : metExtras;
  });

  return NextResponse.json({ aanbiedingen });
}

export async function PATCH(request: NextRequest) {
  const medewerker = await getMedewerkerSession(request);
  if (!medewerker) return geenMedewerkerToegang(request);

  const { id, status } = await request.json();

  if (!["geaccepteerd", "afgewezen"].includes(status)) {
    return NextResponse.json({ error: "Ongeldige status" }, { status: 400 });
  }

  // Verify ownership
  const { data: aanbieding } = await supabaseAdmin
    .from("dienst_aanbiedingen")
    .select("id, dienst_id, status, verlopen_at")
    .eq("id", id)
    .eq("medewerker_id", medewerker.id)
    .maybeSingle();

  if (!aanbieding) {
    return NextResponse.json({ error: "Aanbieding niet gevonden" }, { status: 404 });
  }

  if (aanbieding.status !== "aangeboden") {
    return NextResponse.json({ error: "Deze aanbieding is al beantwoord" }, { status: 400 });
  }

  // Afwijzen mag altijd; accepteren alleen binnen de 48 uur van de aanbieding.
  if (status === "geaccepteerd" && isAanbiedingVerlopen(aanbieding.verlopen_at)) {
    return NextResponse.json({ error: "Deze aanbieding is verlopen. Kijk bij de open diensten of hij er nog bij staat." }, { status: 410 });
  }

  // Accepteren = direct ingepland. Eerst de aanmelding (capaciteit, dubbele aanmelding, verlopen
  // documenten); pas als die lukt de aanbieding op geaccepteerd. Voorheen werd de insert-fout
  // genegeerd en kon een volle dienst overboekt raken.
  if (status === "geaccepteerd") {
    const resultaat = await meldAan(medewerker.id, aanbieding.dienst_id, "geaccepteerd");
    if (!resultaat.ok) {
      return NextResponse.json(aanmeldFoutBody(resultaat), { status: resultaat.status });
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
