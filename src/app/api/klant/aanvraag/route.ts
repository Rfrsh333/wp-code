import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { cookies } from "next/headers";
import { verifyKlantSession } from "@/lib/session";
import { sendTelegramAlert } from "@/lib/telegram";

export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const session = cookieStore.get("klant_session");
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const klant = await verifyKlantSession(session.value);
    if (!klant) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    // Verify klant exists in database
    const { data: klantData, error: klantError } = await supabaseAdmin
      .from("klanten")
      .select("id, bedrijfsnaam")
      .eq("id", klant.id)
      .single();

    if (klantError || !klantData) {
      console.error("Klant not found in database:", klant.id, klantError);
      return NextResponse.json({ error: "Klant account niet gevonden. Neem contact op met support." }, { status: 404 });
    }

    const body = await request.json();
    const { functie, datum, start_tijd, eind_tijd, aantal, locatie, opmerkingen, favoriet_medewerker_ids, uurtarief } = body;

    if (!functie || !datum || !start_tijd || !eind_tijd || !aantal || !uurtarief) {
      return NextResponse.json({ error: "Alle verplichte velden moeten ingevuld zijn (inclusief uurtarief)" }, { status: 400 });
    }

    // Validate uurtarief
    const tarief = parseFloat(uurtarief);
    if (isNaN(tarief) || tarief <= 0) {
      return NextResponse.json({ error: "Uurtarief moet een geldig bedrag zijn" }, { status: 400 });
    }

    // Validate datum is in the future
    const aanvraagDatum = new Date(datum);
    const vandaag = new Date();
    vandaag.setHours(0, 0, 0, 0);
    if (aanvraagDatum < vandaag) {
      return NextResponse.json({ error: "Datum moet in de toekomst liggen" }, { status: 400 });
    }

    // Only insert columns that exist in the diensten table
    const insertData: Record<string, unknown> = {
      klant_id: klantData.id,
      klant_naam: klantData.bedrijfsnaam || null,
      functie,
      datum,
      start_tijd,
      eind_tijd,
      aantal_nodig: parseInt(aantal) || 1,
      plekken_totaal: parseInt(aantal) || 1,
      plekken_beschikbaar: parseInt(aantal) || 1,
      locatie: locatie || null,
      uurtarief: tarief,
      status: "open",
    };

    const { data: dienst, error } = await supabaseAdmin
      .from("diensten")
      .insert(insertData)
      .select("id")
      .single();

    if (error) {
      console.error("Dienst aanmaken mislukt:", error);
      console.error("Insert data was:", JSON.stringify(insertData, null, 2));
      return NextResponse.json({
        error: `Aanvraag opslaan mislukt: ${error.message}`,
        code: error.code,
      }, { status: 500 });
    }

    // Telegram notification (don't let it block the response)
    sendTelegramAlert(
      `<b>Nieuwe personeelsaanvraag</b>\n` +
      `Klant: ${klantData.bedrijfsnaam}\n` +
      `Functie: ${functie}\n` +
      `Datum: ${datum}\n` +
      `Tijd: ${start_tijd} - ${eind_tijd}\n` +
      `Aantal: ${aantal}\n` +
      `${locatie ? `Locatie: ${locatie}\n` : ""}` +
      `${opmerkingen ? `Opmerkingen: ${opmerkingen}\n` : ""}` +
      `${favoriet_medewerker_ids?.length ? `Voorkeur medewerkers: ${favoriet_medewerker_ids.length}` : ""}`
    ).catch((err) => console.error("Telegram alert mislukt:", err));

    return NextResponse.json({ success: true, dienst_id: dienst.id });
  } catch (err) {
    console.error("Aanvraag POST error:", err);
    return NextResponse.json({ error: "Er ging iets mis bij het opslaan" }, { status: 500 });
  }
}

export async function GET() {
  try {
    const cookieStore = await cookies();
    const session = cookieStore.get("klant_session");
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const klant = await verifyKlantSession(session.value);
    if (!klant) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    // Get previous locations for this klant
    const { data: locaties, error } = await supabaseAdmin
      .from("diensten")
      .select("locatie")
      .eq("klant_id", klant.id)
      .not("locatie", "is", null)
      .order("datum", { ascending: false })
      .limit(50);

    if (error) {
      console.error("Locaties ophalen mislukt:", error);
      return NextResponse.json({ locaties: [] });
    }

    const uniqueLocaties = [...new Set((locaties || []).map((l) => l.locatie).filter(Boolean))];

    return NextResponse.json({ locaties: uniqueLocaties });
  } catch (err) {
    console.error("Aanvraag GET error:", err);
    return NextResponse.json({ locaties: [] });
  }
}
