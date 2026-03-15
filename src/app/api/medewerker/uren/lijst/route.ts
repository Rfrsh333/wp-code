import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { verifyMedewerkerSession } from "@/lib/session";

export async function GET(request: NextRequest) {
  try {
    const sessionCookie = request.cookies.get("medewerker_session");
    if (!sessionCookie) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const medewerker = await verifyMedewerkerSession(sessionCookie.value);
    if (!medewerker) {
      return NextResponse.json({ error: "Invalid session" }, { status: 401 });
    }

    // Haal uren registraties op met dienst en klant info
    const { data: urenRegistraties, error } = await supabaseAdmin
      .from("uren_registraties")
      .select(`
        id,
        gewerkte_uren,
        status,
        created_at,
        aanmelding:dienst_aanmeldingen!aanmelding_id (
          dienst:diensten!dienst_id (
            datum,
            locatie,
            uurtarief,
            klant:klanten!klant_id (
              bedrijfsnaam
            )
          )
        )
      `)
      .eq("medewerker_id", medewerker.id)
      .order("created_at", { ascending: false })
      .limit(50);

    if (error) {
      console.error("Uren lijst ophalen error:", error);
      return NextResponse.json({ error: "Ophalen mislukt" }, { status: 500 });
    }

    // Map naar simpele structuur en filter null diensten
    const uren = (urenRegistraties || [])
      .filter((u) => u.aanmelding && (u.aanmelding as any).dienst)
      .map((u) => {
        const aanmelding = u.aanmelding as any;
        const dienst = aanmelding.dienst;
        const klant = dienst?.klant;

        return {
          id: u.id,
          gewerkte_uren: u.gewerkte_uren,
          status: u.status,
          created_at: u.created_at,
          dienst: {
            datum: dienst?.datum || "",
            locatie: dienst?.locatie || "",
            uurtarief: dienst?.uurtarief || 0,
            klant: {
              bedrijfsnaam: klant?.bedrijfsnaam || "Onbekend",
              bedrijf_foto_url: undefined, // Optional - kan later toegevoegd worden
            },
          },
        };
      });

    // Bereken summary (deze maand)
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    let deze_maand = 0;
    let totaal_uren = 0;

    for (const u of uren) {
      const createdAt = new Date(u.created_at);
      const medewerkerUurtarief = u.dienst.uurtarief - 4;
      const verdiensten = u.gewerkte_uren * medewerkerUurtarief;

      if (createdAt >= startOfMonth && (u.status === "klant_goedgekeurd" || u.status === "gefactureerd")) {
        deze_maand += verdiensten;
        totaal_uren += u.gewerkte_uren;
      }
    }

    // Haal voltooide diensten op zonder uren registratie
    const { data: dienstenZonderUren } = await supabaseAdmin
      .from("dienst_aanmeldingen")
      .select(`
        id,
        dienst:diensten!dienst_id (
          id,
          datum,
          start_tijd,
          eind_tijd,
          locatie,
          uurtarief,
          klant:klanten!klant_id (
            bedrijfsnaam
          )
        )
      `)
      .eq("medewerker_id", medewerker.id)
      .eq("status", "bevestigd")
      .not("check_in_at", "is", null)
      .lt("diensten.datum", new Date().toISOString().split("T")[0]);

    // Filter diensten die nog geen uren hebben
    const te_registreren = (dienstenZonderUren || [])
      .filter((aanmelding) => {
        const dienstId = (aanmelding.dienst as any)?.id;
        return dienstId && !uren.some(u => {
          const uDienstId = (u as any).aanmelding?.dienst?.id;
          return uDienstId === dienstId;
        });
      })
      .slice(0, 10)
      .map((aanmelding) => {
        const dienst = aanmelding.dienst as any;
        const klant = dienst?.klant;
        return {
          id: dienst?.id || "",
          aanmelding_id: aanmelding.id,
          datum: dienst?.datum || "",
          start_tijd: dienst?.start_tijd || "",
          eind_tijd: dienst?.eind_tijd || "",
          locatie: dienst?.locatie || "",
          uurtarief: dienst?.uurtarief || 0,
          klant: {
            bedrijfsnaam: klant?.bedrijfsnaam || "Onbekend",
            bedrijf_foto_url: undefined,
          },
        };
      });

    // Haal klant aanpassingen op
    const { data: aanpassingenData } = await supabaseAdmin
      .from("uren_registraties")
      .select(`
        id, start_tijd, eind_tijd, pauze_minuten, gewerkte_uren, reiskosten_km, reiskosten_bedrag,
        klant_start_tijd, klant_eind_tijd, klant_pauze_minuten, klant_gewerkte_uren,
        klant_reiskosten_km, klant_reiskosten_bedrag, klant_opmerking,
        aanmelding:dienst_aanmeldingen!inner (
          medewerker_id,
          dienst:diensten (datum, klant_naam, locatie)
        )
      `)
      .eq("status", "klant_aangepast")
      .eq("medewerker_id", medewerker.id);

    const aanpassingen = (aanpassingenData || []).map((u: any) => ({
      id: u.id,
      start_tijd: u.start_tijd,
      eind_tijd: u.eind_tijd,
      pauze_minuten: u.pauze_minuten,
      gewerkte_uren: u.gewerkte_uren,
      reiskosten_km: u.reiskosten_km,
      reiskosten_bedrag: u.reiskosten_bedrag,
      klant_start_tijd: u.klant_start_tijd,
      klant_eind_tijd: u.klant_eind_tijd,
      klant_pauze_minuten: u.klant_pauze_minuten,
      klant_gewerkte_uren: u.klant_gewerkte_uren,
      klant_reiskosten_km: u.klant_reiskosten_km,
      klant_reiskosten_bedrag: u.klant_reiskosten_bedrag,
      klant_opmerking: u.klant_opmerking,
      dienst_datum: u.aanmelding?.dienst?.datum || "",
      klant_naam: u.aanmelding?.dienst?.klant_naam || "",
      locatie: u.aanmelding?.dienst?.locatie || "",
    }));

    return NextResponse.json({
      uren,
      te_registreren,
      aanpassingen,
      summary: {
        deze_maand,
        totaal_uren,
      },
    });
  } catch (error) {
    console.error("Uren lijst error:", error);
    return NextResponse.json({ error: "Er ging iets mis" }, { status: 500 });
  }
}
