import { after, NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { verifyAdmin } from "@/lib/admin-auth";
import { valideerPauze, valideerDienstDuur, berekenToeslag } from "@/lib/compliance/arbeidstijden";
import { geldendeTijden, klantUurtariefVoorAanmelding, medewerkerUurtariefVoorAanmelding } from "@/lib/medewerker/reactie-regels";
import { haalDienstExtras, haalVoorwaarden } from "@/lib/medewerker/reactie-voorwaarden";
import { meldUrenBeoordeeld } from "@/lib/meldingen/uren-meldingen";

type Een<T> = T | T[] | null | undefined;
const een = <T,>(v: Een<T>): T | null => (Array.isArray(v) ? (v[0] ?? null) : (v ?? null));

export async function GET(request: NextRequest) {
  // KRITIEK: Verify admin with proper email check
  const { isAdmin, email } = await verifyAdmin(request);
  if (!isAdmin) {
    console.warn(`[SECURITY] Unauthorized uren access attempt by: ${email || 'unknown'}`);
    return NextResponse.json({ error: "Unauthorized - Admin access required" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const filter = searchParams.get("filter") || "alle";

  // Fetch aanmeldingen zonder uren (voor handmatig registreren)
  if (filter === "zonder_uren") {
    const { data: aanmeldingen } = await supabaseAdmin
      .from("dienst_aanmeldingen")
      .select("id, status, check_in_at, medewerker:medewerkers(id, naam, email), dienst:diensten(id, klant_naam, datum, start_tijd, eind_tijd, locatie, uurtarief, functie)")
      .in("status", ["bevestigd", "geaccepteerd"])
      .order("created_at", { ascending: false })
      .limit(100);

    // Filter out those that already have uren_registraties
    const aanmeldingIds = (aanmeldingen || []).map(a => a.id);
    const { data: bestaandeUren } = await supabaseAdmin
      .from("uren_registraties")
      .select("aanmelding_id")
      .in("aanmelding_id", aanmeldingIds.length > 0 ? aanmeldingIds : ["none"]);

    const urenSet = new Set((bestaandeUren || []).map(u => u.aanmelding_id));
    const zonderUren = (aanmeldingen || []).filter(a => !urenSet.has(a.id));

    // Per aanmelding de geldende tijden (vooringevuld bij handmatig registreren), pauze en tarief.
    const [voorwaarden, extras] = await Promise.all([
      haalVoorwaarden(zonderUren.map((a) => a.id)),
      haalDienstExtras(zonderUren.map((a) => een(a.dienst as Een<{ id: string }>)?.id)),
    ]);
    const metVoorwaarden = zonderUren.map((a) => {
      const dienst = een(a.dienst as Een<{ id: string; start_tijd: string; eind_tijd: string; uurtarief: number | null }>);
      const v = voorwaarden.get(a.id);
      const tijden = dienst ? geldendeTijden(dienst, v) : null;
      return {
        ...a,
        start_tijd: tijden?.start_tijd ?? null,
        eind_tijd: tijden?.eind_tijd ?? null,
        eigen_tijden: tijden?.eigen_tijden ?? false,
        pauze_minuten: dienst ? (extras.get(dienst.id)?.pauze_minuten ?? null) : null,
        klant_uurtarief: klantUurtariefVoorAanmelding(dienst?.uurtarief, v?.voorgesteld_uurtarief),
        medewerker_uurtarief: medewerkerUurtariefVoorAanmelding(dienst?.uurtarief, v?.voorgesteld_uurtarief),
      };
    });

    return NextResponse.json({ data: metVoorwaarden });
  }

  let query = supabaseAdmin
    .from("uren_registraties")
    .select("*, aanmelding:dienst_aanmeldingen(medewerker:medewerkers(naam, email), dienst:diensten(klant_naam, datum, locatie, uurtarief))")
    .order("created_at", { ascending: false });

  if (filter === "goedgekeurd") query = query.eq("status", "goedgekeurd");
  else if (filter === "klant_goedgekeurd") query = query.eq("status", "klant_goedgekeurd");
  else if (filter === "ingediend") query = query.eq("status", "ingediend");

  const { data } = await query.limit(500);
  // Tarief per aanmelding (tegenbod + € 4, anders de dienst): `klant_uurtarief` per regel.
  const voorwaarden = await haalVoorwaarden((data ?? []).map((u) => u.aanmelding_id as string));
  const metTarief = (data ?? []).map((u) => {
    const dienst = een(een(u.aanmelding as Een<{ dienst?: unknown }>)?.dienst as Een<{ uurtarief?: number | null }>);
    const tegenbod = voorwaarden.get(u.aanmelding_id as string)?.voorgesteld_uurtarief;
    return {
      ...u,
      klant_uurtarief: klantUurtariefVoorAanmelding(dienst?.uurtarief, tegenbod),
      medewerker_uurtarief: medewerkerUurtariefVoorAanmelding(dienst?.uurtarief, tegenbod),
    };
  });
  return NextResponse.json({ data: metTarief });
}

export async function POST(request: NextRequest) {
  // KRITIEK: Verify admin with proper email check
  const { isAdmin, email } = await verifyAdmin(request);
  if (!isAdmin) {
    console.warn(`[SECURITY] Unauthorized uren mutation attempt by: ${email || 'unknown'}`);
    return NextResponse.json({ error: "Unauthorized - Admin access required" }, { status: 403 });
  }

  const { action, id, status, data } = await request.json();

  if (action === "update_status") {
    const { data: urenRegistratie } = await supabaseAdmin
      .from("uren_registraties")
      .select("status, aanmelding:dienst_aanmeldingen(dienst:diensten(klant_id))")
      .eq("id", id)
      .single();

    if (!urenRegistratie) {
      return NextResponse.json({ error: "Urenregistratie niet gevonden" }, { status: 404 });
    }

    if (status === "goedgekeurd" && !["ingediend", "klant_goedgekeurd"].includes(urenRegistratie.status)) {
      return NextResponse.json({ error: "Alleen ingediende of klant goedgekeurde uren kunnen definitief worden goedgekeurd" }, { status: 400 });
    }

    const payload: { status: string; goedgekeurd_at?: string | null } = { status };
    if (status === "goedgekeurd") {
      payload.goedgekeurd_at = new Date().toISOString();
    } else if (status === "afgewezen") {
      payload.goedgekeurd_at = null;
    }

    await supabaseAdmin.from("uren_registraties").update(payload).eq("id", id);

    // Push + melding aan de medewerker (gebundeld per medewerker), na het antwoord.
    if (status === "goedgekeurd" && urenRegistratie.status !== "goedgekeurd") {
      after(() => meldUrenBeoordeeld(id, "definitief", "admin"));
    } else if (status === "afgewezen" && urenRegistratie.status !== "afgewezen") {
      after(() => meldUrenBeoordeeld(id, "afgewezen", "admin"));
    }

    if (status === "goedgekeurd") {
      const aanmelding = Array.isArray(urenRegistratie.aanmelding)
        ? urenRegistratie.aanmelding[0]
        : urenRegistratie.aanmelding;
      const dienst = Array.isArray(aanmelding?.dienst)
        ? aanmelding?.dienst[0]
        : aanmelding?.dienst;
      const klantId = dienst?.klant_id;

      if (klantId) {
        await supabaseAdmin
          .from("klanten")
          .update({ eerste_goedkeuring: new Date().toISOString().split("T")[0] })
          .eq("id", klantId)
          .is("eerste_goedkeuring", null);
      }
    }
  }

  // Admin handmatig uren registreren (voor medewerkers zonder QR check-in)
  if (action === "handmatig_registreren") {
    const { aanmelding_id, start_tijd, eind_tijd, pauze_minuten, reiskosten_km, opmerking } = data || {};

    if (!aanmelding_id || !start_tijd || !eind_tijd) {
      return NextResponse.json({ error: "Aanmelding ID, start- en eindtijd zijn verplicht" }, { status: 400 });
    }

    // Verify aanmelding exists
    const { data: aanmelding } = await supabaseAdmin
      .from("dienst_aanmeldingen")
      .select("id, medewerker_id, dienst_id, status")
      .eq("id", aanmelding_id)
      .single();

    if (!aanmelding) {
      return NextResponse.json({ error: "Aanmelding niet gevonden" }, { status: 404 });
    }

    // Check if uren already registered
    const { data: bestaand } = await supabaseAdmin
      .from("uren_registraties")
      .select("id")
      .eq("aanmelding_id", aanmelding_id)
      .maybeSingle();

    if (bestaand) {
      return NextResponse.json({ error: "Voor deze aanmelding zijn al uren geregistreerd" }, { status: 409 });
    }

    // C-14: Valideer maximale dienstduur
    const dienstDuurCheck = valideerDienstDuur(start_tijd, eind_tijd, pauze_minuten || 0);
    if (!dienstDuurCheck.geldig) {
      return NextResponse.json({ error: dienstDuurCheck.waarschuwing }, { status: 400 });
    }

    // C-15: Valideer pauze
    const pauzeCheck = valideerPauze(start_tijd, eind_tijd, pauze_minuten || 0);
    if (!pauzeCheck.geldig) {
      return NextResponse.json({ error: pauzeCheck.waarschuwing }, { status: 400 });
    }

    // Calculate hours
    const [sh, sm] = start_tijd.split(":").map(Number);
    const [eh, em] = eind_tijd.split(":").map(Number);
    let totalMin = (eh * 60 + em) - (sh * 60 + sm);
    if (totalMin <= 0) totalMin += 24 * 60; // nachtdienst
    totalMin -= (pauze_minuten || 0);
    const gewerkte_uren = Math.round(Math.max(0, totalMin / 60) * 100) / 100;

    const km = Math.max(0, Number(reiskosten_km) || 0);
    const reiskosten_bedrag = Math.round(km * 0.21 * 100) / 100;

    // C-10: Toeslagberekening
    const { data: dienstData } = await supabaseAdmin
      .from("dienst_aanmeldingen")
      .select("dienst:diensten(datum, start_tijd, eind_tijd)")
      .eq("id", aanmelding_id)
      .single();

    const dienst = Array.isArray(dienstData?.dienst) ? dienstData?.dienst[0] : dienstData?.dienst;
    const toeslag = dienst
      ? berekenToeslag(dienst.datum, start_tijd, eind_tijd)
      : { type: "geen" as const, percentage: 0, reden: "" };

    await supabaseAdmin.from("uren_registraties").insert({
      aanmelding_id,
      start_tijd,
      eind_tijd,
      pauze_minuten: pauze_minuten || 0,
      gewerkte_uren,
      reiskosten_km: km,
      reiskosten_bedrag,
      status: "ingediend",
      toeslag_type: toeslag.type !== "geen" ? toeslag.type : null,
      toeslag_percentage: toeslag.percentage,
    });

  }

  if (action === "adjust") {
    const { data: urenRegistratie } = await supabaseAdmin
      .from("uren_registraties")
      .select("status, start_tijd, eind_tijd, pauze_minuten, gewerkte_uren, reiskosten_km, reiskosten_bedrag")
      .eq("id", id)
      .single();

    if (!urenRegistratie) {
      return NextResponse.json({ error: "Urenregistratie niet gevonden" }, { status: 404 });
    }

    if (!["ingediend", "klant_goedgekeurd"].includes(urenRegistratie.status)) {
      return NextResponse.json({ error: "Deze urenregistratie kan niet meer worden aangepast" }, { status: 400 });
    }

    await supabaseAdmin.from("uren_registraties").update({
      status: "klant_aangepast",
      klant_start_tijd: data.start_tijd,
      klant_eind_tijd: data.eind_tijd,
      klant_pauze_minuten: data.pauze_minuten,
      klant_gewerkte_uren: data.gewerkte_uren,
      klant_reiskosten_km: data.reiskosten_km,
      klant_reiskosten_bedrag: data.reiskosten_bedrag,
      klant_opmerking: data.opmerking || null,
      goedgekeurd_at: null,
    }).eq("id", id);
    // De medewerker moet akkoord geven of weigeren (zelfde stap als bij een aanpassing van de werkgever).
    after(() => meldUrenBeoordeeld(id, "aangepast", "admin"));
  }

  return NextResponse.json({ success: true });
}
