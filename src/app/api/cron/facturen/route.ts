import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin as supabase } from "@/lib/supabase";

// Draait dagelijks om 09:00 - checkt per klant of 2 weken verstreken zijn sinds eerste goedkeuring of laatste factuur

export async function GET(request: NextRequest) {
  // Verify cron secret
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const now = new Date();
    const vandaag = now.toISOString().split("T")[0];

    // Haal klanten op die een eerste_goedkeuring hebben
    const { data: klanten } = await supabase
      .from("klanten")
      .select("id, email, eerste_goedkeuring, laatste_factuur_datum")
      .eq("status", "actief")
      .not("eerste_goedkeuring", "is", null);

    if (!klanten || klanten.length === 0) {
      return NextResponse.json({ message: "Geen klanten met goedgekeurde uren" });
    }

    const results = [];

    for (const klant of klanten) {
      // Bepaal of 2 weken verstreken zijn
      const referentieDatum = klant.laatste_factuur_datum || klant.eerste_goedkeuring;
      const refDate = new Date(referentieDatum);
      const daysSince = Math.floor((now.getTime() - refDate.getTime()) / (1000 * 60 * 60 * 24));

      if (daysSince < 14) {
        results.push({ klant_id: klant.id, status: "nog_niet_14_dagen", dagen: daysSince });
        continue;
      }

      // Bepaal periode
      const periode_start = referentieDatum;
      const periode_eind = vandaag;

      // Check of er goedgekeurde uren zijn
      const { data: uren } = await supabase
        .from("uren_registraties")
        .select(`
          id,
          aanmelding:dienst_aanmeldingen!inner(
            dienst:diensten!inner(klant_id, datum)
          )
        `)
        .eq("status", "goedgekeurd")
        .eq("aanmelding.dienst.klant_id", klant.id);

      if (!uren || uren.length === 0) {
        // Update laatste_factuur_datum zodat we niet elke dag checken
        await supabase.from("klanten").update({ laatste_factuur_datum: vandaag }).eq("id", klant.id);
        results.push({ klant_id: klant.id, status: "geen_uren" });
        continue;
      }

      // Genereer factuur
      const generateRes = await fetch(`${process.env.NEXT_PUBLIC_SITE_URL}/api/facturen/generate`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.CRON_SECRET}`,
        },
        body: JSON.stringify({ klant_id: klant.id, periode_start, periode_eind }),
      });

      const generateData = await generateRes.json();

      if (!generateData.success) {
        results.push({ klant_id: klant.id, status: "error", error: generateData.error });
        continue;
      }

      // Verstuur factuur
      await fetch(`${process.env.NEXT_PUBLIC_SITE_URL}/api/facturen/send`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.CRON_SECRET}`,
        },
        body: JSON.stringify({ factuur_id: generateData.factuur.id, email: klant.email }),
      });

      // Update laatste factuur datum
      await supabase.from("klanten").update({ laatste_factuur_datum: vandaag }).eq("id", klant.id);

      results.push({ klant_id: klant.id, status: "verzonden", factuur_id: generateData.factuur.id });
    }

    return NextResponse.json({ success: true, results });
  } catch (error) {
    console.error("Cron facturen error:", error);
    return NextResponse.json({ error: "Fout bij automatische facturatie" }, { status: 500 });
  }
}
