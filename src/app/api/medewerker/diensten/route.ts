import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { cookies } from "next/headers";
import { calculateMedewerkerReiskosten, sanitizeKilometers } from "@/lib/reiskosten";

type UrenRegistratie = { status: string };

type UrenAanpassing = {
  id: string;
  start_tijd: string;
  eind_tijd: string;
  pauze_minuten: number;
  gewerkte_uren: number;
  reiskosten_km: number;
  reiskosten_bedrag: number;
  klant_start_tijd: string | null;
  klant_eind_tijd: string | null;
  klant_pauze_minuten: number | null;
  klant_gewerkte_uren: number | null;
  klant_reiskosten_km: number | null;
  klant_reiskosten_bedrag: number | null;
  klant_opmerking: string | null;
  aanmelding: {
    medewerker_id: string;
    dienst: { datum: string; klant_naam: string; locatie: string } | null;
  } | null;
};

export async function GET() {
  // KRITIEK: Verify signed JWT instead of trusting JSON
  const cookieStore = await cookies();
  const session = cookieStore.get("medewerker_session");
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { verifyMedewerkerSession } = await import("@/lib/session");
  const medewerker = await verifyMedewerkerSession(session.value);
  if (!medewerker) {
    console.warn("[SECURITY] Invalid medewerker session token");
    return NextResponse.json({ error: "Unauthorized - Invalid session" }, { status: 401 });
  }

  const functies = Array.isArray(medewerker.functie) ? medewerker.functie : [medewerker.functie];
  const { data: alleDiensten } = await supabaseAdmin
    .from("diensten")
    .select("id, datum, start_tijd, eind_tijd, functie, locatie, klant_naam, status, notities, aantal_nodig, uurtarief")
    .in("functie", functies)
    .in("status", ["open", "vol"])
    .gte("datum", new Date().toISOString().split("T")[0])
    .order("datum", { ascending: true })
    .limit(100);

  const { data: aanmeldingen } = await supabaseAdmin
    .from("dienst_aanmeldingen")
    .select("id, dienst_id, status, uren_registraties(status)")
    .eq("medewerker_id", medewerker.id)
    .limit(100);

  const aanmeldMap = new Map(
    aanmeldingen?.map((a) => [
      a.dienst_id,
      { id: a.id, status: a.status, uren_status: (a.uren_registraties as UrenRegistratie[])?.[0]?.status },
    ]) || []
  );

  const diensten = (alleDiensten || []).map((d) => ({
    ...d,
    aangemeld: aanmeldMap.has(d.id),
    aanmelding_id: aanmeldMap.get(d.id)?.id,
    aanmelding_status: aanmeldMap.get(d.id)?.status,
    uren_status: aanmeldMap.get(d.id)?.uren_status,
  }));

  // Klant aanpassingen
  const { data: aanpassingen } = await supabaseAdmin
    .from("uren_registraties")
    .select(`
      id, start_tijd, eind_tijd, pauze_minuten, gewerkte_uren, reiskosten_km, reiskosten_bedrag,
      klant_start_tijd, klant_eind_tijd, klant_pauze_minuten, klant_gewerkte_uren, klant_reiskosten_km, klant_reiskosten_bedrag, klant_opmerking,
      aanmelding:dienst_aanmeldingen!inner(medewerker_id, dienst:diensten(datum, klant_naam, locatie))
    `)
    .eq("status", "klant_aangepast")
    .eq("aanmelding.medewerker_id", medewerker.id);

  const mapped = (aanpassingen || []).map((u) => {
    const typedU = u as unknown as UrenAanpassing;
    return {
      id: typedU.id, start_tijd: typedU.start_tijd, eind_tijd: typedU.eind_tijd,
      pauze_minuten: typedU.pauze_minuten, gewerkte_uren: typedU.gewerkte_uren,
      reiskosten_km: typedU.reiskosten_km, reiskosten_bedrag: typedU.reiskosten_bedrag,
      klant_start_tijd: typedU.klant_start_tijd, klant_eind_tijd: typedU.klant_eind_tijd,
      klant_pauze_minuten: typedU.klant_pauze_minuten, klant_gewerkte_uren: typedU.klant_gewerkte_uren,
      klant_reiskosten_km: typedU.klant_reiskosten_km, klant_reiskosten_bedrag: typedU.klant_reiskosten_bedrag,
      klant_opmerking: typedU.klant_opmerking,
      dienst_datum: typedU.aanmelding?.dienst?.datum || "",
      klant_naam: typedU.aanmelding?.dienst?.klant_naam || "",
      locatie: typedU.aanmelding?.dienst?.locatie || "",
    };
  });

  console.log(`[MEDEWERKER DIENSTEN] Functies: ${functies}, Found ${diensten.length} diensten for ${medewerker.naam}`);
  return NextResponse.json({ diensten, aanpassingen: mapped });
}

export async function POST(request: NextRequest) {
  // KRITIEK: Verify signed JWT instead of trusting JSON
  const cookieStore = await cookies();
  const session = cookieStore.get("medewerker_session");
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { verifyMedewerkerSession } = await import("@/lib/session");
  const medewerker = await verifyMedewerkerSession(session.value);
  if (!medewerker) {
    console.warn("[SECURITY] Invalid medewerker session token");
    return NextResponse.json({ error: "Unauthorized - Invalid session" }, { status: 401 });
  }
  const { action, dienst_id, aanmelding_id, uren_id, data } = await request.json();

  if (action === "aanmelden") {
    await supabaseAdmin.from("dienst_aanmeldingen").insert({
      dienst_id,
      medewerker_id: medewerker.id,
    });
  }

  if (action === "afmelden") {
    await supabaseAdmin.from("dienst_aanmeldingen").delete()
      .eq("dienst_id", dienst_id)
      .eq("medewerker_id", medewerker.id);
  }

  if (action === "uren_indienen") {
    const { data: aanmelding } = await supabaseAdmin
      .from("dienst_aanmeldingen")
      .select("id, status, dienst:diensten(datum, eind_tijd)")
      .eq("id", aanmelding_id)
      .eq("medewerker_id", medewerker.id)
      .single();

    const dienst = Array.isArray(aanmelding?.dienst) ? aanmelding?.dienst[0] : aanmelding?.dienst;

    if (!aanmelding || !dienst) {
      return NextResponse.json({ error: "Aanmelding of dienst niet gevonden" }, { status: 404 });
    }

    if (aanmelding.status !== "geaccepteerd") {
      return NextResponse.json({ error: "Je kunt alleen uren indienen voor geaccepteerde diensten" }, { status: 400 });
    }

    const dienstEinde = new Date(`${dienst.datum}T${dienst.eind_tijd}`);
    if (dienstEinde > new Date()) {
      return NextResponse.json({ error: "Uren kunnen pas worden ingevuld nadat de eindtijd van de dienst is verstreken" }, { status: 400 });
    }

    const { data: bestaandUrenItem } = await supabaseAdmin
      .from("uren_registraties")
      .select("id")
      .eq("aanmelding_id", aanmelding_id)
      .maybeSingle();

    if (bestaandUrenItem) {
      return NextResponse.json({ error: "Voor deze dienst zijn al uren ingediend" }, { status: 409 });
    }

    await supabaseAdmin.from("uren_registraties").insert({
      aanmelding_id,
      start_tijd: data.start,
      eind_tijd: data.eind,
      pauze_minuten: data.pauze,
      gewerkte_uren: data.uren,
      reiskosten_km: sanitizeKilometers(data.reiskosten_km),
      reiskosten_bedrag: calculateMedewerkerReiskosten(data.reiskosten_km),
      status: "ingediend",
    });
  }

  if (action === "accepteer_aanpassing") {
    const { data: aanpassing } = await supabaseAdmin
      .from("uren_registraties")
      .select("klant_start_tijd, klant_eind_tijd, klant_pauze_minuten, klant_gewerkte_uren, klant_reiskosten_km, klant_reiskosten_bedrag")
      .eq("id", uren_id)
      .single();

    if (aanpassing) {
      await supabaseAdmin.from("uren_registraties").update({
        start_tijd: aanpassing.klant_start_tijd,
        eind_tijd: aanpassing.klant_eind_tijd,
        pauze_minuten: aanpassing.klant_pauze_minuten,
        gewerkte_uren: aanpassing.klant_gewerkte_uren,
        reiskosten_km: aanpassing.klant_reiskosten_km ?? 0,
        reiskosten_bedrag: aanpassing.klant_reiskosten_bedrag ?? 0,
        status: "klant_goedgekeurd",
      }).eq("id", uren_id);
    }
  }

  if (action === "weiger_aanpassing") {
    await supabaseAdmin.from("uren_registraties").update({
      status: "ingediend",
      klant_start_tijd: null, klant_eind_tijd: null,
      klant_pauze_minuten: null, klant_gewerkte_uren: null,
      klant_reiskosten_km: null, klant_reiskosten_bedrag: null, klant_opmerking: null,
    }).eq("id", uren_id);
  }

  return NextResponse.json({ success: true });
}
