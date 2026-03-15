import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { verifyMedewerkerSession } from "@/lib/session";

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
          created_at,
          status
        )
      `)
      .eq("medewerker_id", medewerker.id)
      .limit(500);

    if (error) {
      console.error("Financieel query error:", error);
      return NextResponse.json({ error: "Ophalen mislukt" }, { status: 500 });
    }

    // Group by month
    const maandMap = new Map<string, { totaal_uren: number; totaal_verdiensten: number; aantal_diensten: number }>();

    for (const aanmelding of aanmeldingen || []) {
      const dienst = aanmelding.dienst as { datum: string; uurtarief?: number } | null;
      const urenArray = aanmelding.uren as Array<{ gewerkte_uren?: number; status: string }> | null;

      if (!dienst || !urenArray) continue;

      // Alleen goedgekeurde uren
      const goedgekeurdeUren = urenArray.filter((u) => u.status === "goedgekeurd");
      if (goedgekeurdeUren.length === 0) continue;

      const datum = new Date(dienst.datum);
      const maandKey = `${datum.getFullYear()}-${String(datum.getMonth() + 1).padStart(2, "0")}`;
      const klantUurtarief = dienst.uurtarief || 0;
      const medewerkerUurtarief = klantUurtarief - 4; // €4 margin voor TopTalent

      for (const urenItem of goedgekeurdeUren) {
        const gewerkte_uren = urenItem.gewerkte_uren || 0;

        const existing = maandMap.get(maandKey) || { totaal_uren: 0, totaal_verdiensten: 0, aantal_diensten: 0 };
        existing.totaal_uren += gewerkte_uren;
        existing.totaal_verdiensten += gewerkte_uren * medewerkerUurtarief;
        existing.aantal_diensten += 1;
        maandMap.set(maandKey, existing);
      }
    }

    const overzicht = Array.from(maandMap.entries())
      .map(([maand, data]) => ({ maand, ...data }))
      .sort((a, b) => b.maand.localeCompare(a.maand));

    return NextResponse.json({ overzicht });
  } catch (error) {
    console.error("Financieel error:", error);
    return NextResponse.json({ error: "Er ging iets mis" }, { status: 500 });
  }
}
