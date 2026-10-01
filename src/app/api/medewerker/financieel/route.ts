import { NextRequest, NextResponse } from "next/server";
import { getMedewerkerSession } from "@/lib/portal-auth";
import { captureRouteError } from "@/lib/sentry-utils";
import { roundCurrency } from "@/lib/reiskosten";
import { haalUrenRegistraties } from "@/lib/medewerker/uren";
import { isVerdiend, verdienstenVanRegel } from "@/lib/medewerker/uren-regels";

export async function GET(request: NextRequest) {
  try {
    const medewerker = await getMedewerkerSession(request);
    if (!medewerker) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const registraties = await haalUrenRegistraties(medewerker.id, 1000);

    // Per maand (van de dienstdatum); welke registraties meetellen is dezelfde definitie als
    // dashboard en Uren (lib/medewerker/uren-regels). Voorheen telde hier alleen 'goedgekeurd'.
    const maandMap = new Map<string, { totaal_uren: number; totaal_verdiensten: number; aantal_diensten: number }>();

    for (const regel of registraties) {
      if (!isVerdiend(regel.status) || !regel.datum) continue;
      const maandKey = regel.datum.slice(0, 7);
      const existing = maandMap.get(maandKey) || { totaal_uren: 0, totaal_verdiensten: 0, aantal_diensten: 0 };
      existing.totaal_uren += regel.gewerkte_uren || 0;
      existing.totaal_verdiensten += verdienstenVanRegel(regel);
      existing.aantal_diensten += 1;
      maandMap.set(maandKey, existing);
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
    return NextResponse.json({ error: "Er ging iets mis" }, { status: 500 });
  }
}
