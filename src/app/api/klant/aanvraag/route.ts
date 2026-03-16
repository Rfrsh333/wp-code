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
    const { functie, categorie_id, functie_id, vereiste_taal, vereiste_vaardigheden, functies_met_aantal, datum, start_tijd, eind_tijd, aantal, locatie, opmerkingen, favoriet_medewerker_ids, uurtarief } = body;

    // Support both old (single functie) and new (multiple functies with per-function rates) format
    if (!datum || !start_tijd || !eind_tijd) {
      return NextResponse.json({ error: "Datum en tijd zijn verplicht" }, { status: 400 });
    }

    // Uurtarief is required either globally or per-function
    const hasPerFunctionRates = functies_met_aantal?.length > 0 && functies_met_aantal.every((f: any) => f.uurtarief && parseFloat(f.uurtarief) > 0);
    if (!uurtarief && !hasPerFunctionRates) {
      return NextResponse.json({ error: "Uurtarief is verplicht (globaal of per functie)" }, { status: 400 });
    }

    // Validate at least one functie is selected
    if (!functie && (!functies_met_aantal || functies_met_aantal.length === 0)) {
      return NextResponse.json({ error: "Selecteer minimaal één functie" }, { status: 400 });
    }

    // Validate uurtarief (global fallback, may be empty if per-function rates are used)
    const tarief = uurtarief ? parseFloat(uurtarief) : 0;
    if (!hasPerFunctionRates && (isNaN(tarief) || tarief <= 0)) {
      return NextResponse.json({ error: "Uurtarief moet een geldig bedrag zijn" }, { status: 400 });
    }

    // Validate datum is in the future
    const aanvraagDatum = new Date(datum);
    const vandaag = new Date();
    vandaag.setHours(0, 0, 0, 0);
    if (aanvraagDatum < vandaag) {
      return NextResponse.json({ error: "Datum moet in de toekomst liggen" }, { status: 400 });
    }

    // Prepare diensten data (one or multiple based on functies_met_aantal)
    const dienstenToCreate = [];

    if (functies_met_aantal && functies_met_aantal.length > 0) {
      // New format: multiple functies with amounts and per-function rates
      for (const { functie: functieName, aantal: functieAantal, uurtarief: functieTarief } of functies_met_aantal) {
        // Use per-function rate if available, otherwise fall back to global rate
        const effectiefTarief = functieTarief ? parseFloat(functieTarief) : tarief;
        const insertData: Record<string, unknown> = {
          klant_id: klantData.id,
          klant_naam: klantData.bedrijfsnaam || null,
          functie: functieName.toLowerCase(), // ✅ Use actual function name
          datum,
          start_tijd,
          eind_tijd,
          aantal_nodig: functieAantal,
          plekken_totaal: functieAantal, // ✅ Set total spots
          plekken_beschikbaar: functieAantal, // ✅ Set available spots
          locatie: locatie || null,
          uurtarief: effectiefTarief,
          status: "open",
          notities: opmerkingen || null, // ✅ Only comments, not function name
        };

        // Lookup functie_id and categorie_id from dienst_functies table
        const { data: functieRef } = await supabaseAdmin
          .from('dienst_functies')
          .select('id, categorie_id')
          .ilike('naam', functieName)
          .maybeSingle();

        if (functieRef) {
          insertData.functie_id = functieRef.id;
          insertData.categorie_id = functieRef.categorie_id;
        }

        if (vereiste_taal) insertData.vereiste_taal = vereiste_taal;
        if (vereiste_vaardigheden && vereiste_vaardigheden.length > 0) {
          insertData.vereiste_vaardigheden = vereiste_vaardigheden;
        }

        dienstenToCreate.push(insertData);
      }
    } else {
      // Old format: single functie
      const aantalNodig = parseInt(aantal) || 1;
      const insertData: Record<string, unknown> = {
        klant_id: klantData.id,
        klant_naam: klantData.bedrijfsnaam || null,
        functie,
        datum,
        start_tijd,
        eind_tijd,
        aantal_nodig: aantalNodig,
        plekken_totaal: aantalNodig, // ✅ Set total spots
        plekken_beschikbaar: aantalNodig, // ✅ Set available spots
        locatie: locatie || null,
        uurtarief: tarief,
        status: "open",
      };

      if (categorie_id) insertData.categorie_id = categorie_id;
      if (functie_id) insertData.functie_id = functie_id;
      if (vereiste_taal) insertData.vereiste_taal = vereiste_taal;
      if (vereiste_vaardigheden && vereiste_vaardigheden.length > 0) {
        insertData.vereiste_vaardigheden = vereiste_vaardigheden;
      }
      if (opmerkingen) insertData.notities = opmerkingen;

      dienstenToCreate.push(insertData);
    }

    // Insert all diensten
    const { data: diensten, error } = await supabaseAdmin
      .from("diensten")
      .insert(dienstenToCreate)
      .select("id");

    if (error) {
      console.error("Dienst aanmaken mislukt:", error);
      console.error("Insert data was:", JSON.stringify(dienstenToCreate, null, 2));
      return NextResponse.json({
        error: `Aanvraag opslaan mislukt: ${error.message}`,
        code: error.code,
      }, { status: 500 });
    }

    const dienst = diensten?.[0]; // Use first dienst for telegram notification


    // Build functie summary for telegram
    let functieSummary = '';
    if (functies_met_aantal && functies_met_aantal.length > 0) {
      functieSummary = functies_met_aantal.map((f: any) => `${f.functie} (${f.aantal}x)`).join(', ');
    } else {
      functieSummary = functie || 'Onbekend';
    }

    const totaalPersoneel = functies_met_aantal
      ? functies_met_aantal.reduce((sum: number, f: any) => sum + f.aantal, 0)
      : parseInt(aantal) || 1;

    // Telegram notification (don't let it block the response)
    sendTelegramAlert(
      `<b>🆕 Nieuwe personeelsaanvraag</b>\n` +
      `👤 Klant: ${klantData.bedrijfsnaam}\n` +
      `💼 Functies: ${functieSummary}\n` +
      `📅 Datum: ${datum}\n` +
      `🕐 Tijd: ${start_tijd} - ${eind_tijd}\n` +
      `👥 Totaal personen: ${totaalPersoneel}\n` +
      `📋 Aantal diensten: ${diensten?.length || 1}\n` +
      `${vereiste_taal ? `🗣️ Taal: ${vereiste_taal === 'nl' ? 'Nederlands' : vereiste_taal === 'en' ? 'Engels' : 'NL/EN'}\n` : ""}` +
      `${vereiste_vaardigheden?.length ? `🎯 Vaardigheden: ${vereiste_vaardigheden.join(', ')}\n` : ""}` +
      `${locatie ? `📍 Locatie: ${locatie}\n` : ""}` +
      `${opmerkingen ? `💬 Opmerkingen: ${opmerkingen}\n` : ""}` +
      `${favoriet_medewerker_ids?.length ? `⭐ Voorkeur medewerkers: ${favoriet_medewerker_ids.length}` : ""}`
    ).catch((err) => console.error("Telegram alert mislukt:", err));

    return NextResponse.json({
      success: true,
      dienst_ids: diensten?.map(d => d.id) || [],
      count: diensten?.length || 0
    });
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
