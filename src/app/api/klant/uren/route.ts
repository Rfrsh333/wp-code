import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { cookies } from "next/headers";
import { verifyKlantSession } from "@/lib/session";

export async function GET() {
  const cookieStore = await cookies();
  const session = cookieStore.get("klant_session");
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const klant = await verifyKlantSession(session.value);
  if (!klant) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: diensten } = await supabaseAdmin
    .from("diensten")
    .select("id")
    .eq("klant_id", klant.id);

  if (!diensten?.length) return NextResponse.json({ uren: [] });

  const { data } = await supabaseAdmin
    .from("uren_registraties")
    .select(`
      id, start_tijd, eind_tijd, pauze_minuten, gewerkte_uren, status, created_at,
      aanmelding:dienst_aanmeldingen(
        medewerker:medewerkers(naam),
        dienst:diensten(datum, locatie, uurtarief)
      )
    `)
    .in("aanmelding.dienst_id", diensten.map(d => d.id))
    .order("created_at", { ascending: false });

  const uren = (data || []).filter(u => u.aanmelding).map(u => ({
    id: u.id,
    start_tijd: u.start_tijd,
    eind_tijd: u.eind_tijd,
    pauze_minuten: u.pauze_minuten,
    gewerkte_uren: u.gewerkte_uren,
    status: u.status,
    created_at: u.created_at,
    medewerker_naam: (u.aanmelding as any)?.medewerker?.naam || "Onbekend",
    dienst_datum: (u.aanmelding as any)?.dienst?.datum || "",
    dienst_locatie: (u.aanmelding as any)?.dienst?.locatie || "",
    uurtarief: (u.aanmelding as any)?.dienst?.uurtarief || 0,
  }));

  return NextResponse.json({ uren });
}

export async function POST(request: NextRequest) {
  const cookieStore = await cookies();
  const session = cookieStore.get("klant_session");
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const klant = await verifyKlantSession(session.value);
  if (!klant) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { action, id, data } = await request.json();

  if (action === "approve") {
    await supabaseAdmin.from("uren_registraties").update({
      status: "goedgekeurd",
      goedgekeurd_at: new Date().toISOString()
    }).eq("id", id);

    await supabaseAdmin
      .from("klanten")
      .update({ eerste_goedkeuring: new Date().toISOString().split("T")[0] })
      .eq("id", klant.id)
      .is("eerste_goedkeuring", null);
  }

  if (action === "adjust") {
    await supabaseAdmin.from("uren_registraties").update({
      status: "klant_aangepast",
      klant_start_tijd: data.startTijd,
      klant_eind_tijd: data.eindTijd,
      klant_pauze_minuten: data.pauzeMinuten,
      klant_gewerkte_uren: data.gewerkteUren,
      klant_opmerking: data.opmerking,
    }).eq("id", id);
  }

  return NextResponse.json({ success: true });
}
