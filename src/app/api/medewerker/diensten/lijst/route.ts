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

    const searchParams = request.nextUrl.searchParams;
    const status = searchParams.get("status") || "gepland";

    const vandaag = new Date().toISOString().split("T")[0];

    // Haal aanmeldingen op met dienst en klant info
    let query = supabaseAdmin
      .from("dienst_aanmeldingen")
      .select(`
        id,
        status,
        dienst:diensten!dienst_id (
          id,
          datum,
          start_tijd,
          eind_tijd,
          locatie,
          notities,
          functie,
          uurtarief,
          status,
          klant_naam,
          klant:klanten!klant_id (
            id,
            bedrijfsnaam,
            bedrijf_foto_url
          )
        )
      `)
      .eq("medewerker_id", medewerker.id);

    // Filter op basis van tab
    if (status === "aangeboden") {
      // Uitgenodigd maar nog niet geaccepteerd
      query = query.eq("status", "uitgenodigd");
    } else if (status === "gepland") {
      // Bevestigd of geaccepteerd door klant, in de toekomst
      query = query.in("status", ["bevestigd", "geaccepteerd"]);
    } else if (status === "voltooid") {
      // Bevestigd of geaccepteerd, in het verleden
      query = query.in("status", ["bevestigd", "geaccepteerd"]);
    }

    const { data: aanmeldingen, error } = await query;

    if (error) {
      console.error("Diensten lijst ophalen error:", error);
      return NextResponse.json({ error: "Ophalen mislukt" }, { status: 500 });
    }

    // Filter en map naar dienst objecten
    const diensten = (aanmeldingen || [])
      .filter((a) => {
        if (!a.dienst) return false;
        const dienst = a.dienst as any;

        // Extra filtering voor gepland vs voltooid
        if (status === "gepland") {
          return dienst.datum >= vandaag;
        } else if (status === "voltooid") {
          return dienst.datum < vandaag;
        }
        return true;
      })
      .map((a) => {
        const dienst = a.dienst as any;
        const klant = dienst.klant as any;

        return {
          id: dienst.id,
          datum: dienst.datum,
          start_tijd: dienst.start_tijd,
          eind_tijd: dienst.eind_tijd,
          locatie: dienst.locatie,
          omschrijving: dienst.notities || dienst.functie || "Geen omschrijving",
          uurtarief: dienst.uurtarief,
          status: a.status,
          klant: {
            bedrijfsnaam: klant?.bedrijfsnaam || dienst.klant_naam || "Onbekend",
            bedrijf_foto_url: klant?.bedrijf_foto_url,
          },
        };
      })
      .sort((a, b) => {
        // Sorteer: voltooid = nieuwste eerst, anderen = oudste eerst
        if (status === "voltooid") {
          return b.datum.localeCompare(a.datum);
        }
        return a.datum.localeCompare(b.datum);
      });

    // Haal vervangingsverzoeken op
    const myVervangingAanmeldingen = (await supabaseAdmin
      .from("dienst_aanmeldingen")
      .select("dienst_id")
      .eq("medewerker_id", medewerker.id)
      .eq("status", "vervanging_gezocht")).data || [];

    const vervangingDienstIds = myVervangingAanmeldingen.map(a => a.dienst_id);
    let vervangingVerzoeken: any[] = [];

    if (vervangingDienstIds.length > 0) {
      const { data: vervangers } = await supabaseAdmin
        .from("dienst_aanmeldingen")
        .select(`
          id,
          dienst_id,
          vervanging_voor,
          medewerker:medewerkers (naam, functie, profile_photo_url)
        `)
        .in("dienst_id", vervangingDienstIds)
        .eq("status", "aangemeld")
        .neq("medewerker_id", medewerker.id);

      vervangingVerzoeken = (vervangers || []).map(v => {
        const mw = Array.isArray(v.medewerker) ? v.medewerker[0] : v.medewerker;
        return {
          aanmelding_id: v.id,
          dienst_id: v.dienst_id,
          originele_aanmelding_id: v.vervanging_voor || "",
          naam: mw?.naam || "Onbekend",
          functie: mw?.functie || "",
          profile_photo_url: mw?.profile_photo_url || null,
        };
      });
    }

    return NextResponse.json({ diensten, vervangingVerzoeken });
  } catch (error) {
    console.error("Diensten lijst error:", error);
    return NextResponse.json({ error: "Er ging iets mis" }, { status: 500 });
  }
}
