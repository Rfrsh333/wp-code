import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { verifyMedewerkerSession } from "@/lib/session";
import { captureRouteError } from "@/lib/sentry-utils";
import { berekenToeslagRegel } from "@/lib/toeslag";

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
    const startVanMaand = new Date();
    startVanMaand.setDate(1);
    const startVanMaandStr = startVanMaand.toISOString().split("T")[0];

    // Run all independent queries in parallel.
    // We embedden telkens de dienst via de bewezen FK-hint `diensten!dienst_id` en
    // filteren de datums in applicatiecode. De vorige versie filterde op `diensten.datum`
    // zonder die relatie te embedden (queries 1–2) en op de verkeerde alias
    // `aanmelding.diensten.datum` i.p.v. `dienst` (query 4), waardoor de datumfilters
    // werden genegeerd (aankomende diensten fout, verdiensten over álle maanden opgeteld).
    const [
      { data: aankomendeRows },
      { data: voltooide },
      { data: geregistreerd },
      { data: urenRegistraties },
    ] = await Promise.all([
      supabaseAdmin
        .from("dienst_aanmeldingen")
        .select("id, dienst:diensten!dienst_id(datum)")
        .eq("medewerker_id", medewerker.id)
        .eq("status", "bevestigd"),
      supabaseAdmin
        .from("dienst_aanmeldingen")
        .select("id, dienst:diensten!dienst_id(datum)")
        .eq("medewerker_id", medewerker.id)
        .eq("status", "bevestigd")
        .not("check_in_at", "is", null),
      supabaseAdmin
        .from("uren_registraties")
        .select("aanmelding_id")
        .eq("medewerker_id", medewerker.id),
      supabaseAdmin
        .from("uren_registraties")
        .select(`
          gewerkte_uren,
          start_tijd,
          eind_tijd,
          aanmelding:dienst_aanmeldingen!inner (
            dienst:diensten!dienst_id (uurtarief, datum)
          )
        `)
        .eq("medewerker_id", medewerker.id)
        .in("status", ["klant_goedgekeurd", "gefactureerd"]),
    ]);

    const rowDatum = (row: unknown): string | null => {
      const dienst = (row as { dienst?: { datum?: string } | null })?.dienst;
      return dienst?.datum ?? null;
    };

    const aankomende_diensten = (aankomendeRows || []).filter((r) => {
      const d = rowDatum(r);
      return d !== null && d >= vandaag;
    }).length;

    const voltooideInVerleden = (voltooide || []).filter((r) => {
      const d = rowDatum(r);
      return d !== null && d < vandaag;
    });

    const geregistreerdIds = new Set((geregistreerd || []).map(u => u.aanmelding_id));
    const te_registreren_uren = voltooideInVerleden.filter(v => !geregistreerdIds.has((v as { id: string }).id)).length;

    let deze_maand_verdiensten = 0;
    let totaal_uren_deze_maand = 0;

    for (const uur of urenRegistraties || []) {
      const aanmelding = uur.aanmelding as unknown as Record<string, unknown> | null;
      const dienst = aanmelding?.dienst as Record<string, unknown> | null;
      const datum = (dienst?.datum as string) || null;
      // Alleen deze maand meetellen (datumfilter in code i.p.v. via een fragiele embed-filter).
      if (!datum || datum < startVanMaandStr) continue;
      const klantUurtarief = (dienst?.uurtarief as number) || 0;
      const medewerkerUurtarief = Math.max(0, klantUurtarief - 4); // €4 marge, nooit negatief
      // Toeslag (avond/nacht/weekend/feestdag) meetellen in de verdiensten.
      const toeslag = berekenToeslagRegel(
        uur.gewerkte_uren,
        medewerkerUurtarief,
        datum,
        (uur as { start_tijd?: string }).start_tijd,
        (uur as { eind_tijd?: string }).eind_tijd,
      );
      deze_maand_verdiensten += uur.gewerkte_uren * medewerkerUurtarief + toeslag.bedrag;
      totaal_uren_deze_maand += uur.gewerkte_uren;
    }

    deze_maand_verdiensten = Math.round(deze_maand_verdiensten * 100) / 100;
    totaal_uren_deze_maand = Math.round(totaal_uren_deze_maand * 100) / 100;

    const gemiddelde_rating = 4.8;

    return NextResponse.json({
      stats: {
        aankomende_diensten: aankomende_diensten || 0,
        te_registreren_uren,
        deze_maand_verdiensten,
        totaal_uren_deze_maand,
        gemiddelde_rating,
      },
    });
  } catch (error) {
    captureRouteError(error, { route: "/api/medewerker/dashboard", action: "GET" });
    return NextResponse.json({ error: "Er ging iets mis" }, { status: 500 });
  }
}
