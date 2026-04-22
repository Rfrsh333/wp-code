import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { supabaseAdmin } from "@/lib/supabase";
import { verifyKlantSession } from "@/lib/session";
import { captureRouteError } from "@/lib/sentry-utils";

async function getKlant() {
  const cookieStore = await cookies();
  const session = cookieStore.get("klant_session");
  if (!session) return null;
  return verifyKlantSession(session.value);
}

export async function GET() {
  const klant = await getKlant();
  if (!klant) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Haal facturen op voor deze klant
  const { data: facturen, error } = await supabaseAdmin
    .from("facturen")
    .select("*")
    .eq("klant_id", klant.id)
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) {
    captureRouteError(error, { route: "/api/klant/facturen", action: "GET" });
    // console.error("Facturen ophalen error:", error);
    return NextResponse.json({ error: "Ophalen mislukt" }, { status: 500 });
  }

  return NextResponse.json({ facturen: facturen || [] });
}

export async function POST(request: NextRequest) {
  const klant = await getKlant();
  if (!klant) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { uren_ids } = await request.json();

  if (!uren_ids || !Array.isArray(uren_ids) || uren_ids.length === 0) {
    return NextResponse.json({ error: "Geen uren opgegeven" }, { status: 400 });
  }

  // Haal goedgekeurde uren op
  const { data: urenRegistraties, error: urenError } = await supabaseAdmin
    .from("uren_registraties")
    .select(`
      id,
      gewerkte_uren,
      reiskosten_km,
      reiskosten_bedrag,
      aanmelding:dienst_aanmeldingen!aanmelding_id(
        medewerker:medewerkers(naam),
        dienst:diensten!dienst_id(datum, locatie, uurtarief, klant_id)
      )
    `)
    .in("id", uren_ids)
    .eq("status", "klant_goedgekeurd");

  if (urenError || !urenRegistraties || urenRegistraties.length === 0) {
    return NextResponse.json({ error: "Geen goedgekeurde uren gevonden" }, { status: 404 });
  }

  // Verifieer dat alle uren bij deze klant horen
  for (const uren of urenRegistraties) {
    const aanmelding = uren.aanmelding as unknown as Record<string, unknown> | null;
    const dienst = aanmelding?.dienst as Record<string, unknown> | null;
    if (dienst?.klant_id !== klant.id) {
      return NextResponse.json({ error: "Ongeautoriseerde uren" }, { status: 403 });
    }
  }

  // Bereken totaal
  let subtotaal = 0;
  const regels: { uren_registratie_id: unknown; omschrijving: string; datum: string; medewerker_naam: string; uren: unknown; uurtarief: number; reiskosten: number; bedrag: number }[] = [];

  for (const uren of urenRegistraties) {
    const aanmelding = uren.aanmelding as unknown as Record<string, unknown> | null;
    const dienst = aanmelding?.dienst as Record<string, unknown> | null;
    const medewerker = aanmelding?.medewerker as Record<string, unknown> | null;

    const urenBedrag = uren.gewerkte_uren * ((dienst?.uurtarief as number) || 0);
    const reiskosten = uren.reiskosten_bedrag || 0;
    const bedrag = urenBedrag + reiskosten;
    subtotaal += bedrag;

    regels.push({
      uren_registratie_id: uren.id,
      omschrijving: `${(dienst?.locatie as string) || ''} - ${(medewerker?.naam as string) || ''}`,
      datum: (dienst?.datum as string) || '',
      medewerker_naam: (medewerker?.naam as string) || '',
      uren: uren.gewerkte_uren,
      uurtarief: (dienst?.uurtarief as number) || 0,
      reiskosten,
      bedrag,
    });
  }

  const btw = subtotaal * 0.21;
  const totaal = subtotaal + btw;

  // Generate factuur nummer
  const now = new Date();
  const jaar = now.getFullYear();
  const maand = String(now.getMonth() + 1).padStart(2, "0");

  // Haal laatste factuur nummer op
  const { data: laatsteFactuur } = await supabaseAdmin
    .from("facturen")
    .select("factuur_nummer")
    .like("factuur_nummer", `${jaar}${maand}%`)
    .order("factuur_nummer", { ascending: false })
    .limit(1)
    .single();

  let volgnummer = 1;
  if (laatsteFactuur?.factuur_nummer) {
    const laatste = parseInt(laatsteFactuur.factuur_nummer.slice(-4));
    volgnummer = laatste + 1;
  }

  const factuurNummer = `${jaar}${maand}${String(volgnummer).padStart(4, "0")}`;

  // Maak factuur aan
  const { data: factuur, error: factuurError } = await supabaseAdmin
    .from("facturen")
    .insert({
      factuur_nummer: factuurNummer,
      klant_id: klant.id,
      klant_naam: klant.bedrijfsnaam,
      klant_email: klant.email,
      periode_start: regels[0]?.datum || now.toISOString().split("T")[0],
      periode_eind: regels[regels.length - 1]?.datum || now.toISOString().split("T")[0],
      subtotaal,
      btw_bedrag: btw,
      totaal,
      status: "open",
    })
    .select("id")
    .single();

  if (factuurError || !factuur) {
    captureRouteError(factuurError, { route: "/api/klant/facturen", action: "POST" });
    // console.error("Factuur aanmaken error:", factuurError);
    return NextResponse.json({ error: "Factuur aanmaken mislukt" }, { status: 500 });
  }

  // Maak factuur regels aan
  const factuurRegels = regels.map(r => ({
    ...r,
    factuur_id: factuur.id,
  }));

  const { error: regelsError } = await supabaseAdmin
    .from("factuur_regels")
    .insert(factuurRegels);

  if (regelsError) {
    captureRouteError(regelsError, { route: "/api/klant/facturen", action: "POST" });
    // console.error("Factuur regels error:", regelsError);
    // Rollback factuur
    await supabaseAdmin.from("facturen").delete().eq("id", factuur.id);
    return NextResponse.json({ error: "Factuur regels aanmaken mislukt" }, { status: 500 });
  }

  // Update uren status naar "gefactureerd"
  await supabaseAdmin
    .from("uren_registraties")
    .update({ status: "gefactureerd" })
    .in("id", uren_ids);

  return NextResponse.json({
    success: true,
    factuur_id: factuur.id,
    factuur_nummer: factuurNummer,
  });
}
