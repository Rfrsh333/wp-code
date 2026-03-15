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

    const vandaag = new Date().toISOString().split("T")[0];

    // Haal alle toekomstige diensten op met beschikbare plekken
    const { data: diensten, error } = await supabaseAdmin
      .from("diensten")
      .select(`
        id,
        datum,
        start_tijd,
        eind_tijd,
        locatie,
        omschrijving,
        uurtarief,
        plekken_beschikbaar,
        plekken_totaal,
        klant:klanten!klant_id (
          id,
          bedrijfsnaam,
          bedrijf_foto_url
        )
      `)
      .gte("datum", vandaag)
      .gt("plekken_beschikbaar", 0)
      .eq("status", "open")
      .order("datum", { ascending: true })
      .order("start_tijd", { ascending: true })
      .limit(50);

    if (error) {
      console.error("Beschikbare shifts ophalen error:", error);
      return NextResponse.json({ error: "Ophalen mislukt" }, { status: 500 });
    }

    // Filter uit: diensten waar medewerker al is aangemeld
    const { data: aanmeldingen } = await supabaseAdmin
      .from("dienst_aanmeldingen")
      .select("dienst_id")
      .eq("medewerker_id", medewerker.id);

    const aangemeldeDienstIds = new Set(aanmeldingen?.map((a) => a.dienst_id) || []);

    const beschikbareShifts = (diensten || [])
      .filter((d) => !aangemeldeDienstIds.has(d.id))
      .map((d) => {
        const klant = d.klant as any;

        // Genereer tags op basis van shift eigenschappen
        const tags: string[] = [];
        const uren = berekenUren(d.start_tijd, d.eind_tijd);
        if (uren < 4) tags.push("Korte shift");
        if (uren >= 8) tags.push("Hele dag");

        const medewerkerUurtarief = d.uurtarief - 4;
        if (medewerkerUurtarief >= 16) tags.push("Goed betaald");

        const datum = new Date(d.datum);
        const morgen = new Date();
        morgen.setDate(morgen.getDate() + 1);
        if (datum.toDateString() === morgen.toDateString()) {
          tags.push("Morgen");
        }

        // Markeer als "speciaal" als uurtarief hoog is of veel plekken
        const is_speciaal = medewerkerUurtarief >= 18 || d.plekken_beschikbaar >= 5;

        return {
          id: d.id,
          datum: d.datum,
          start_tijd: d.start_tijd,
          eind_tijd: d.eind_tijd,
          locatie: d.locatie,
          omschrijving: d.omschrijving,
          uurtarief: d.uurtarief,
          plekken_beschikbaar: d.plekken_beschikbaar,
          plekken_totaal: d.plekken_totaal,
          klant: {
            bedrijfsnaam: klant?.bedrijfsnaam || "Onbekend",
            bedrijf_foto_url: klant?.bedrijf_foto_url,
            rating: 4.5, // Placeholder - kan later dynamisch worden
          },
          tags,
          is_speciaal,
        };
      });

    return NextResponse.json({ shifts: beschikbareShifts });
  } catch (error) {
    console.error("Beschikbare shifts error:", error);
    return NextResponse.json({ error: "Er ging iets mis" }, { status: 500 });
  }
}

function berekenUren(start: string, eind: string): number {
  const [startH, startM] = start.split(":").map(Number);
  const [eindH, eindM] = eind.split(":").map(Number);
  return eindH - startH + (eindM - startM) / 60;
}
