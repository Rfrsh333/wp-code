import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { getKlantSession } from "@/lib/portal-auth";
import { captureRouteError } from "@/lib/sentry-utils";
import { INGEPLAND_STATUSSEN } from "@/lib/dienst-status";
import { nlVandaag } from "@/lib/nl-tijd";

export async function POST(request: NextRequest) {
  const klant = await getKlantSession(request);
  if (!klant) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { medewerker_id?: string; dienst_id?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Ongeldige request body" }, { status: 400 });
  }

  const { medewerker_id, dienst_id } = body;
  if (!medewerker_id || typeof medewerker_id !== "string") {
    return NextResponse.json({ error: "Ongeldige QR-code: medewerker_id ontbreekt" }, { status: 400 });
  }

  const today = nlVandaag();

  // Alleen diensten van VANDAAG: voorheen telde alles vanaf vandaag mee (ongesorteerd), waardoor
  // een scan vandaag kon inchecken op een dienst van volgende week. Met dienst_id: die dienst,
  // mits vandaag.
  let query = supabaseAdmin
    .from("dienst_aanmeldingen")
    .select(`
      id,
      status,
      check_in_at,
      medewerker_id,
      dienst:diensten!inner(id, klant_id, datum, start_tijd, eind_tijd, locatie, functie)
    `)
    .eq("medewerker_id", medewerker_id)
    .in("status", [...INGEPLAND_STATUSSEN])
    .eq("dienst.klant_id", klant.id)
    .eq("dienst.datum", today);

  if (dienst_id) {
    query = query.eq("dienst.id", dienst_id);
  }

  const { data: aanmeldingen, error: fetchError } = await query;

  if (fetchError) {
    captureRouteError(fetchError, { route: "/api/klant/checkin", action: "POST" });
    // console.error("[CHECKIN] Supabase error:", fetchError);
    return NextResponse.json({ error: "Database fout" }, { status: 500 });
  }

  if (!aanmeldingen || aanmeldingen.length === 0) {
    return NextResponse.json({ error: "Geen ingeplande dienst vandaag voor deze medewerker" }, { status: 404 });
  }

  // Als er meerdere diensten zijn en geen specifieke dienst_id is opgegeven, return de lijst
  if (aanmeldingen.length > 1 && !dienst_id) {
    // Haal medewerker info op
    const { data: medewerker } = await supabaseAdmin
      .from("medewerkers")
      .select("naam, functie, profile_photo_url")
      .eq("id", medewerker_id)
      .single();

    const diensten = aanmeldingen.map(a => {
      const d = Array.isArray(a.dienst) ? a.dienst[0] : a.dienst;
      return {
        dienst_id: d.id,
        aanmelding_id: a.id,
        datum: d.datum,
        start_tijd: d.start_tijd,
        eind_tijd: d.eind_tijd,
        locatie: d.locatie,
        functie: d.functie,
        check_in_at: a.check_in_at,
      };
    }).sort((x, y) => String(x.start_tijd).localeCompare(String(y.start_tijd)));

    return NextResponse.json({
      status: "multiple_diensten",
      medewerker: medewerker ? {
        naam: medewerker.naam,
        functie: medewerker.functie,
        profile_photo_url: medewerker.profile_photo_url,
      } : null,
      diensten,
    });
  }

  // Pak de eerste (of enige) aanmelding
  const aanmelding = aanmeldingen[0];
  const dienst = Array.isArray(aanmelding.dienst) ? aanmelding.dienst[0] : aanmelding.dienst;

  // Al ingecheckt?
  if (aanmelding.check_in_at) {
    // Haal medewerker info op
    const { data: medewerker } = await supabaseAdmin
      .from("medewerkers")
      .select("naam, functie, profile_photo_url")
      .eq("id", medewerker_id)
      .single();

    return NextResponse.json({
      status: "al_ingecheckt",
      check_in_at: aanmelding.check_in_at,
      medewerker: medewerker ? {
        naam: medewerker.naam,
        functie: medewerker.functie,
        profile_photo_url: medewerker.profile_photo_url,
      } : null,
      dienst: dienst ? {
        datum: dienst.datum,
        start_tijd: dienst.start_tijd,
        eind_tijd: dienst.eind_tijd,
        locatie: dienst.locatie,
        functie: dienst.functie,
      } : null,
    }, { status: 409 });
  }

  // Check in
  const now = new Date().toISOString();
  const { error: updateError } = await supabaseAdmin
    .from("dienst_aanmeldingen")
    .update({ check_in_at: now })
    .eq("id", aanmelding.id);

  if (updateError) {
    captureRouteError(updateError, { route: "/api/klant/checkin", action: "POST" });
    // console.error("[CHECKIN] Update error:", updateError);
    return NextResponse.json({ error: "Check-in mislukt" }, { status: 500 });
  }

  // Haal medewerker info op
  const { data: medewerker } = await supabaseAdmin
    .from("medewerkers")
    .select("naam, functie, profile_photo_url")
    .eq("id", medewerker_id)
    .single();

  return NextResponse.json({
    status: "ingecheckt",
    check_in_at: now,
    medewerker: medewerker ? {
      naam: medewerker.naam,
      functie: medewerker.functie,
      profile_photo_url: medewerker.profile_photo_url,
    } : null,
    dienst: dienst ? {
      datum: dienst.datum,
      start_tijd: dienst.start_tijd,
      eind_tijd: dienst.eind_tijd,
      locatie: dienst.locatie,
      functie: dienst.functie,
    } : null,
  });
}

export async function GET(request: NextRequest) {
  const klant = await getKlantSession(request);
  if (!klant) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const today = nlVandaag();

  const { data: checkins, error } = await supabaseAdmin
    .from("dienst_aanmeldingen")
    .select(`
      id,
      check_in_at,
      medewerker:medewerkers(naam, functie, profile_photo_url),
      dienst:diensten!inner(datum, start_tijd, eind_tijd, locatie, functie, klant_id)
    `)
    .not("check_in_at", "is", null)
    .eq("dienst.klant_id", klant.id)
    .eq("dienst.datum", today)
    .order("check_in_at", { ascending: false });

  if (error) {
    captureRouteError(error, { route: "/api/klant/checkin", action: "GET" });
    // console.error("[CHECKIN] GET error:", error);
    return NextResponse.json({ error: "Laden mislukt" }, { status: 500 });
  }

  const result = (checkins || []).map((c) => {
    const medewerker = Array.isArray(c.medewerker) ? c.medewerker[0] : c.medewerker;
    const dienst = Array.isArray(c.dienst) ? c.dienst[0] : c.dienst;
    return {
      id: c.id,
      check_in_at: c.check_in_at,
      medewerker_naam: medewerker?.naam || "Onbekend",
      medewerker_functie: medewerker?.functie,
      medewerker_foto: medewerker?.profile_photo_url,
      dienst_start: dienst?.start_tijd,
      dienst_eind: dienst?.eind_tijd,
      dienst_locatie: dienst?.locatie,
      dienst_functie: dienst?.functie,
    };
  });

  return NextResponse.json({ checkins: result });
}
