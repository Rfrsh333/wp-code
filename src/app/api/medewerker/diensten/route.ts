import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { cookies } from "next/headers";
import { verifyMedewerkerSession } from "@/lib/session";

export async function GET() {
  const cookieStore = await cookies();
  const session = cookieStore.get("medewerker_session");
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const medewerker = await verifyMedewerkerSession(session.value);
  if (!medewerker) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const functies = Array.isArray(medewerker.functie)
    ? medewerker.functie
    : [medewerker.functie];

  const { data: alleDiensten } = await supabaseAdmin
    .from("diensten")
    .select("*")
    .in("functie", functies)
    .in("status", ["open", "vol"])
    .gte("datum", new Date().toISOString().split("T")[0])
    .order("datum", { ascending: true });

  const { data: aanmeldingen } = await supabaseAdmin
    .from("dienst_aanmeldingen")
    .select("id, dienst_id, status, uren_registraties(status)")
    .eq("medewerker_id", medewerker.id);

  const aanmeldMap = new Map(
    aanmeldingen?.map((a) => [
      a.dienst_id,
      { id: a.id, status: a.status, uren_status: (a.uren_registraties as any[])?.[0]?.status },
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
      id, start_tijd, eind_tijd, pauze_minuten, gewerkte_uren,
      klant_start_tijd, klant_eind_tijd, klant_pauze_minuten, klant_gewerkte_uren, klant_opmerking,
      aanmelding:dienst_aanmeldingen!inner(medewerker_id, dienst:diensten(datum, klant_naam, locatie))
    `)
    .eq("status", "klant_aangepast")
    .eq("aanmelding.medewerker_id", medewerker.id);

  const mapped = (aanpassingen || []).map((u: any) => ({
    id: u.id, start_tijd: u.start_tijd, eind_tijd: u.eind_tijd,
    pauze_minuten: u.pauze_minuten, gewerkte_uren: u.gewerkte_uren,
    klant_start_tijd: u.klant_start_tijd, klant_eind_tijd: u.klant_eind_tijd,
    klant_pauze_minuten: u.klant_pauze_minuten, klant_gewerkte_uren: u.klant_gewerkte_uren,
    klant_opmerking: u.klant_opmerking,
    dienst_datum: u.aanmelding?.dienst?.datum || "",
    klant_naam: u.aanmelding?.dienst?.klant_naam || "",
    locatie: u.aanmelding?.dienst?.locatie || "",
  }));

  return NextResponse.json({ diensten, aanpassingen: mapped });
}

export async function POST(request: NextRequest) {
  const cookieStore = await cookies();
  const session = cookieStore.get("medewerker_session");
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const medewerker = await verifyMedewerkerSession(session.value);
  if (!medewerker) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
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
    await supabaseAdmin.from("uren_registraties").insert({
      aanmelding_id,
      start_tijd: data.start,
      eind_tijd: data.eind,
      pauze_minuten: data.pauze,
      gewerkte_uren: data.uren,
    });
  }

  if (action === "accepteer_aanpassing") {
    const { data: aanpassing } = await supabaseAdmin
      .from("uren_registraties")
      .select("klant_start_tijd, klant_eind_tijd, klant_pauze_minuten, klant_gewerkte_uren")
      .eq("id", uren_id)
      .single();

    if (aanpassing) {
      await supabaseAdmin.from("uren_registraties").update({
        start_tijd: aanpassing.klant_start_tijd,
        eind_tijd: aanpassing.klant_eind_tijd,
        pauze_minuten: aanpassing.klant_pauze_minuten,
        gewerkte_uren: aanpassing.klant_gewerkte_uren,
        status: "goedgekeurd",
        goedgekeurd_at: new Date().toISOString(),
      }).eq("id", uren_id);
    }
  }

  if (action === "weiger_aanpassing") {
    await supabaseAdmin.from("uren_registraties").update({
      status: "ingediend",
      klant_start_tijd: null, klant_eind_tijd: null,
      klant_pauze_minuten: null, klant_gewerkte_uren: null, klant_opmerking: null,
    }).eq("id", uren_id);
  }

  return NextResponse.json({ success: true });
}
