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

    // Bepaal welke aanmelding statussen we willen
    let statusFilter: string[];
    if (status === "aangeboden") {
      statusFilter = ["uitgenodigd"];
    } else if (status === "gepland" || status === "voltooid") {
      statusFilter = ["bevestigd", "geaccepteerd"];
    } else {
      statusFilter = ["bevestigd", "geaccepteerd"];
    }

    // Stap 1: Haal aanmeldingen op
    const { data: aanmeldingen, error: aanmeldingenError } = await supabaseAdmin
      .from("dienst_aanmeldingen")
      .select("id, status, dienst_id")
      .eq("medewerker_id", medewerker.id)
      .in("status", statusFilter);

    if (aanmeldingenError) {
      console.error("[LIJST] Aanmeldingen ophalen error:", aanmeldingenError);
      return NextResponse.json({ error: "Ophalen mislukt" }, { status: 500 });
    }

    if (!aanmeldingen || aanmeldingen.length === 0) {
      console.log(`[LIJST] Geen aanmeldingen gevonden voor medewerker ${medewerker.id} met status ${statusFilter.join(",")}`);
      return NextResponse.json({ diensten: [], vervangingVerzoeken: [] });
    }

    const dienstIds = aanmeldingen.map((a) => a.dienst_id);
    console.log(`[LIJST] ${aanmeldingen.length} aanmeldingen gevonden, dienst IDs:`, dienstIds);

    // Stap 2: Haal diensten op (los van aanmeldingen om join-problemen te voorkomen)
    const { data: diensten, error: dienstenError } = await supabaseAdmin
      .from("diensten")
      .select("id, datum, start_tijd, eind_tijd, locatie, notities, functie, uurtarief, status, klant_naam, klant_id")
      .in("id", dienstIds);

    if (dienstenError) {
      console.error("[LIJST] Diensten ophalen error:", dienstenError);
      return NextResponse.json({ error: "Diensten ophalen mislukt" }, { status: 500 });
    }

    // Stap 3: Haal klant info op (apart om join-problemen te voorkomen)
    const klantIds = [...new Set((diensten || []).map((d) => d.klant_id).filter(Boolean))];
    let klantenMap: Record<string, { bedrijfsnaam: string; bedrijf_foto_url: string | null }> = {};

    if (klantIds.length > 0) {
      const { data: klanten } = await supabaseAdmin
        .from("klanten")
        .select("id, bedrijfsnaam, bedrijf_foto_url")
        .in("id", klantIds);

      if (klanten) {
        klanten.forEach((k) => {
          klantenMap[k.id] = { bedrijfsnaam: k.bedrijfsnaam, bedrijf_foto_url: k.bedrijf_foto_url };
        });
      }
    }

    // Stap 4: Combineer data en filter op datum
    const dienstenMap = new Map((diensten || []).map((d) => [d.id, d]));

    const result = aanmeldingen
      .map((a) => {
        const dienst = dienstenMap.get(a.dienst_id);
        if (!dienst) return null;

        const klant = dienst.klant_id ? klantenMap[dienst.klant_id] : null;

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
            bedrijf_foto_url: klant?.bedrijf_foto_url || null,
          },
        };
      })
      .filter((d): d is NonNullable<typeof d> => {
        if (!d) return false;
        if (status === "gepland") return d.datum >= vandaag;
        if (status === "voltooid") return d.datum < vandaag;
        return true;
      })
      .sort((a, b) => {
        if (status === "voltooid") return b.datum.localeCompare(a.datum);
        return a.datum.localeCompare(b.datum);
      });

    console.log(`[LIJST] ${result.length} diensten na filtering voor tab "${status}"`);

    // Haal vervangingsverzoeken op
    const myVervangingAanmeldingen = (await supabaseAdmin
      .from("dienst_aanmeldingen")
      .select("dienst_id")
      .eq("medewerker_id", medewerker.id)
      .eq("status", "vervanging_gezocht")).data || [];

    const vervangingDienstIds = myVervangingAanmeldingen.map(a => a.dienst_id);
    let vervangingVerzoeken: { aanmelding_id: string; dienst_id: string; originele_aanmelding_id: string; naam: string; functie: string; profile_photo_url: string | null }[] = [];

    if (vervangingDienstIds.length > 0) {
      const { data: vervangers } = await supabaseAdmin
        .from("dienst_aanmeldingen")
        .select("id, dienst_id, vervanging_voor, medewerker_id")
        .in("dienst_id", vervangingDienstIds)
        .eq("status", "aangemeld")
        .neq("medewerker_id", medewerker.id);

      if (vervangers && vervangers.length > 0) {
        const mwIds = [...new Set(vervangers.map(v => v.medewerker_id))];
        const { data: mwData } = await supabaseAdmin
          .from("medewerkers")
          .select("id, naam, functie, profile_photo_url")
          .in("id", mwIds);

        const mwMap = new Map((mwData || []).map(m => [m.id, m]));

        vervangingVerzoeken = vervangers.map(v => {
          const mw = mwMap.get(v.medewerker_id);
          return {
            aanmelding_id: v.id,
            dienst_id: v.dienst_id,
            originele_aanmelding_id: v.vervanging_voor || "",
            naam: mw?.naam || "Onbekend",
            functie: Array.isArray(mw?.functie) ? mw.functie.join(", ") : (mw?.functie || ""),
            profile_photo_url: mw?.profile_photo_url || null,
          };
        });
      }
    }

    return NextResponse.json({ diensten: result, vervangingVerzoeken });
  } catch (error) {
    console.error("[LIJST] Onverwachte error:", error);
    return NextResponse.json({ error: "Er ging iets mis" }, { status: 500 });
  }
}
