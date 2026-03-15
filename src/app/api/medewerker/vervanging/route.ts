import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { cookies } from "next/headers";
import { sendMedewerkerShiftConfirmationEmail } from "@/lib/medewerker-shift-email";

async function getMedewerker() {
  const cookieStore = await cookies();
  const session = cookieStore.get("medewerker_session");
  if (!session) return null;
  const { verifyMedewerkerSession } = await import("@/lib/session");
  return verifyMedewerkerSession(session.value);
}

// POST — initieer vervangingsverzoek
export async function POST(request: NextRequest) {
  const medewerker = await getMedewerker();
  if (!medewerker) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { dienst_id } = await request.json();

  // Controleer aanmelding
  const { data: aanmelding } = await supabaseAdmin
    .from("dienst_aanmeldingen")
    .select("id, status, dienst:diensten(datum, start_tijd, status)")
    .eq("dienst_id", dienst_id)
    .eq("medewerker_id", medewerker.id)
    .eq("status", "geaccepteerd")
    .single();

  if (!aanmelding) {
    return NextResponse.json({ error: "Geen geaccepteerde aanmelding gevonden" }, { status: 404 });
  }

  const dienst = Array.isArray(aanmelding.dienst) ? aanmelding.dienst[0] : aanmelding.dienst;
  if (!dienst) {
    return NextResponse.json({ error: "Dienst niet gevonden" }, { status: 404 });
  }

  // Server-side 48u check
  const dienstStart = new Date(`${dienst.datum}T${dienst.start_tijd}`);
  const urenTotStart = (dienstStart.getTime() - Date.now()) / (1000 * 60 * 60);

  if (urenTotStart > 48) {
    return NextResponse.json({ error: "Dienst is meer dan 48u weg — gebruik de gewone annuleeroptie" }, { status: 400 });
  }

  if (urenTotStart <= 0) {
    return NextResponse.json({ error: "Dienst is al begonnen" }, { status: 400 });
  }

  // Maak vervangingsverzoek aan
  await supabaseAdmin.from("dienst_vervangingen").insert({
    dienst_id,
    originele_medewerker_id: medewerker.id,
    status: "open",
    vervalt_op: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
  });

  // Update aanmelding status
  await supabaseAdmin
    .from("dienst_aanmeldingen")
    .update({ status: "vervanging_gezocht" })
    .eq("id", aanmelding.id);

  // Zet dienst terug naar open
  if (dienst.status === "vol") {
    await supabaseAdmin
      .from("diensten")
      .update({ status: "open" })
      .eq("id", dienst_id);
  }

  return NextResponse.json({ success: true });
}

// PATCH — originele medewerker accepteert/weigert vervanger
export async function PATCH(request: NextRequest) {
  const medewerker = await getMedewerker();
  if (!medewerker) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { vervanging_id, actie, vervanger_aanmelding_id } = await request.json();

  // Verifieer dat medewerker de originele medewerker is
  const { data: vervanging } = await supabaseAdmin
    .from("dienst_vervangingen")
    .select("id, dienst_id, originele_medewerker_id, status")
    .eq("id", vervanging_id)
    .eq("originele_medewerker_id", medewerker.id)
    .single();

  if (!vervanging) {
    return NextResponse.json({ error: "Vervangingsverzoek niet gevonden" }, { status: 404 });
  }

  if (actie === "accepteer") {
    // Update vervanging
    await supabaseAdmin
      .from("dienst_vervangingen")
      .update({
        status: "geaccepteerd",
        vervanger_id: null, // wordt via aanmelding bijgehouden
        beantwoord_op: new Date().toISOString(),
      })
      .eq("id", vervanging_id);

    // Vervanger aanmelding → geaccepteerd
    await supabaseAdmin
      .from("dienst_aanmeldingen")
      .update({ vervanging_voor: vervanging_id, status: "geaccepteerd" })
      .eq("id", vervanger_aanmelding_id);

    // Originele aanmelding → vervangen
    await supabaseAdmin
      .from("dienst_aanmeldingen")
      .update({ status: "vervangen" })
      .eq("dienst_id", vervanging.dienst_id)
      .eq("medewerker_id", medewerker.id)
      .eq("status", "vervanging_gezocht");

    // Check of dienst weer vol moet
    const { data: dienstInfo } = await supabaseAdmin
      .from("diensten")
      .select("id, aantal_nodig")
      .eq("id", vervanging.dienst_id)
      .single();

    if (dienstInfo) {
      const { count } = await supabaseAdmin
        .from("dienst_aanmeldingen")
        .select("id", { count: "exact", head: true })
        .eq("dienst_id", vervanging.dienst_id)
        .eq("status", "geaccepteerd");

      if (count !== null && count >= (dienstInfo.aantal_nodig || 1)) {
        await supabaseAdmin
          .from("diensten")
          .update({ status: "vol" })
          .eq("id", vervanging.dienst_id);
      }
    }

    // Bevestigingsmail naar vervanger
    const { data: fullVervanger } = await supabaseAdmin
      .from("dienst_aanmeldingen")
      .select(`
        id,
        medewerker:medewerkers(naam, email),
        dienst:diensten(klant_naam, locatie, datum, start_tijd, eind_tijd, functie, notities)
      `)
      .eq("id", vervanger_aanmelding_id)
      .single();

    const mw = Array.isArray(fullVervanger?.medewerker) ? fullVervanger?.medewerker[0] : fullVervanger?.medewerker;
    const d = Array.isArray(fullVervanger?.dienst) ? fullVervanger?.dienst[0] : fullVervanger?.dienst;

    if (mw?.email && d) {
      await sendMedewerkerShiftConfirmationEmail({
        medewerkerNaam: mw.naam,
        medewerkerEmail: mw.email,
        functie: d.functie,
        datum: d.datum,
        startTijd: d.start_tijd,
        eindTijd: d.eind_tijd,
        locatie: d.locatie,
        klantNaam: d.klant_naam,
        kledingvoorschrift: d.notities,
      });
    }

    return NextResponse.json({ success: true });
  }

  if (actie === "weiger") {
    // Vervanger aanmelding afwijzen
    await supabaseAdmin
      .from("dienst_aanmeldingen")
      .update({ status: "afgewezen" })
      .eq("id", vervanger_aanmelding_id);

    return NextResponse.json({ success: true });
  }

  return NextResponse.json({ error: "Onbekende actie" }, { status: 400 });
}
