import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { verifyMedewerkerSession } from "@/lib/session";
import { captureRouteError } from "@/lib/sentry-utils";
import { berekenToeslagRegel } from "@/lib/toeslag";
import { roundCurrency } from "@/lib/reiskosten";

export async function GET(request: NextRequest) {
  try {
    const sessionCookie = request.cookies.get("medewerker_session");
    if (!sessionCookie) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const medewerker = await verifyMedewerkerSession(sessionCookie.value);
    if (!medewerker) return NextResponse.json({ error: "Invalid session" }, { status: 401 });

    // Get all approved uren_registraties via dienst_aanmeldingen
    const { data: aanmeldingen, error } = await supabaseAdmin
      .from("dienst_aanmeldingen")
      .select(`
        id,
        dienst:diensten!dienst_id (
          datum,
          uurtarief
        ),
        uren:uren_registraties!aanmelding_id (
          gewerkte_uren,
          start_tijd,
          eind_tijd,
          created_at,
          status
        )
      `)
      .eq("medewerker_id", medewerker.id)
      .limit(500);

    if (error) {
      captureRouteError(error, { route: "/api/medewerker/financieel", action: "GET" });
      // console.error("Financieel query error:", error);
      return NextResponse.json({ error: "Ophalen mislukt" }, { status: 500 });
    }

    // Group by month
    const maandMap = new Map<string, { totaal_uren: number; totaal_verdiensten: number; aantal_diensten: number }>();

    for (const aanmelding of aanmeldingen || []) {
      const dienstRaw = aanmelding.dienst as unknown;
      const dienst = (Array.isArray(dienstRaw) ? dienstRaw[0] : dienstRaw) as { datum: string; uurtarief?: number } | null;
      const urenArray = aanmelding.uren as Array<{ gewerkte_uren?: number; start_tijd?: string; eind_tijd?: string; status: string }> | null;

      if (!dienst || !urenArray) continue;

      // Alleen goedgekeurde uren
      const goedgekeurdeUren = urenArray.filter((u) => u.status === "goedgekeurd");
      if (goedgekeurdeUren.length === 0) continue;

      const datum = new Date(dienst.datum);
      const maandKey = `${datum.getFullYear()}-${String(datum.getMonth() + 1).padStart(2, "0")}`;
      const klantUurtarief = dienst.uurtarief || 0;
      const medewerkerUurtarief = Math.max(0, klantUurtarief - 4); // €4 marge, nooit negatief

      for (const urenItem of goedgekeurdeUren) {
        const gewerkte_uren = urenItem.gewerkte_uren || 0;

        // Toeslag (avond/nacht/weekend/feestdag) uitbetalen over het medewerkerloon.
        const toeslag = berekenToeslagRegel(gewerkte_uren, medewerkerUurtarief, dienst.datum, urenItem.start_tijd, urenItem.eind_tijd);

        const existing = maandMap.get(maandKey) || { totaal_uren: 0, totaal_verdiensten: 0, aantal_diensten: 0 };
        existing.totaal_uren += gewerkte_uren;
        existing.totaal_verdiensten += gewerkte_uren * medewerkerUurtarief + toeslag.bedrag;
        existing.aantal_diensten += 1;
        maandMap.set(maandKey, existing);
      }
    }

    const overzicht = Array.from(maandMap.entries())
      .map(([maand, data]) => ({
        maand,
        ...data,
        totaal_uren: roundCurrency(data.totaal_uren),
        totaal_verdiensten: roundCurrency(data.totaal_verdiensten),
      }))
      .sort((a, b) => b.maand.localeCompare(a.maand));

    return NextResponse.json({ overzicht });
  } catch (error) {
    captureRouteError(error, { route: "/api/medewerker/financieel", action: "GET" });
    // console.error("Financieel error:", error);
    return NextResponse.json({ error: "Er ging iets mis" }, { status: 500 });
  }
}
