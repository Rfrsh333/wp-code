import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { verifyMedewerkerSession } from "@/lib/session";
import { captureRouteError } from "@/lib/sentry-utils";

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

    // Haal alle toekomstige open diensten op (met optionele klant join)
    const result = await supabaseAdmin
      .from("diensten")
      .select(`
        id,
        datum,
        start_tijd,
        eind_tijd,
        locatie,
        notities,
        uurtarief,
        aantal_nodig,
        plekken_totaal,
        plekken_beschikbaar,
        functie,
        klant_naam,
        klant_id,
        status,
        afbeelding_url,
        klant:klanten!left (
          id,
          bedrijfsnaam,
          bedrijf_foto_url
        )
      `)
      .in("status", ["open", "vol"])
      .gte("datum", vandaag)
      .order("datum", { ascending: true })
      .order("start_tijd", { ascending: true })
      .limit(50);

    let diensten = result.data as Record<string, unknown>[] | null;
    const error = result.error;

    // Fallback: Als de join query faalt, gebruik simpele query
    if (error) {
      console.warn("[SHIFTS BESCHIKBAAR] Join query failed, using fallback:", error);
      const { data: fallbackDiensten } = await supabaseAdmin
        .from("diensten")
        .select("id, datum, start_tijd, eind_tijd, locatie, notities, uurtarief, aantal_nodig, plekken_totaal, plekken_beschikbaar, functie, klant_naam, klant_id, status, afbeelding_url")
        .in("status", ["open", "vol"])
        .gte("datum", vandaag)
        .order("datum", { ascending: true })
        .limit(50);
      // Add null klant property to match type
      diensten = (fallbackDiensten || []).map(d => ({ ...d, klant: null })) as Record<string, unknown>[];
    }

    // Filter uit: diensten waar medewerker al is aangemeld
    const { data: aanmeldingen } = await supabaseAdmin
      .from("dienst_aanmeldingen")
      .select("dienst_id")
      .eq("medewerker_id", medewerker.id);

    const aangemeldeDienstIds = new Set(aanmeldingen?.map((a) => a.dienst_id) || []);

    const beschikbareShifts = (diensten || [])
      .filter((d: Record<string, unknown>) => {
        if (aangemeldeDienstIds.has(d.id as string)) return false;
        const aantalNodig = (d.aantal_nodig as number) ?? 1;
        if (aantalNodig <= 0) return false;
        return true;
      })
      .map((d: Record<string, unknown>) => {
        const klant = d.klant as Record<string, unknown> | null;
        // ✅ Use plekken_beschikbaar/plekken_totaal if available, fallback to aantal_nodig
        const plekkenBeschikbaar = (d.plekken_beschikbaar as number) ?? (d.aantal_nodig as number) ?? 1;
        const plekkenTotaal = (d.plekken_totaal as number) ?? (d.aantal_nodig as number) ?? 1;

        const tags: string[] = [];
        const uren = berekenUren(d.start_tijd as string, d.eind_tijd as string);
        if (uren < 4) tags.push("Korte shift");
        if (uren >= 8) tags.push("Hele dag");

        const medewerkerUurtarief = (d.uurtarief as number) - 4;
        if (medewerkerUurtarief >= 16) tags.push("Goed betaald");

        const datum = new Date(d.datum as string);
        const morgen = new Date();
        morgen.setDate(morgen.getDate() + 1);
        if (datum.toDateString() === morgen.toDateString()) {
          tags.push("Morgen");
        }

        const is_speciaal = medewerkerUurtarief >= 18 || plekkenBeschikbaar >= 5;

        return {
          id: d.id,
          datum: d.datum,
          start_tijd: d.start_tijd,
          eind_tijd: d.eind_tijd,
          locatie: d.locatie,
          omschrijving: d.notities || d.functie || "Geen omschrijving",
          uurtarief: d.uurtarief,
          plekken_beschikbaar: plekkenBeschikbaar,
          plekken_totaal: plekkenTotaal,
          afbeelding_url: d.afbeelding_url || null,
          klant: {
            bedrijfsnaam: (klant?.bedrijfsnaam as string) || (d.klant_naam as string) || "Onbekend",
            bedrijf_foto_url: klant?.bedrijf_foto_url,
            rating: 4.5,
          },
          tags,
          is_speciaal,
        };
      });

    return NextResponse.json({ shifts: beschikbareShifts });
  } catch (error) {
    captureRouteError(error, { route: "/api/medewerker/shifts/beschikbaar", action: "GET" });
    // console.error("Beschikbare shifts error:", error);
    return NextResponse.json({ error: "Er ging iets mis" }, { status: 500 });
  }
}

function berekenUren(start: string, eind: string): number {
  const [startH, startM] = start.split(":").map(Number);
  const [eindH, eindM] = eind.split(":").map(Number);
  return eindH - startH + (eindM - startM) / 60;
}
