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
    const startVanMaand = new Date();
    startVanMaand.setDate(1);
    const startVanMaandStr = startVanMaand.toISOString().split("T")[0];

    // Run all independent queries in parallel.
    const [
      { count: aankomende_diensten },
      { data: voltooide },
      { data: geregistreerd },
      { data: urenDezeMaand },
    ] = await Promise.all([
      supabaseAdmin
        .from("dienst_aanmeldingen")
        .select("id", { count: "exact", head: true })
        .eq("medewerker_id", medewerker.id)
        .eq("status", "bevestigd")
        .gte("diensten.datum", vandaag),
      supabaseAdmin
        .from("dienst_aanmeldingen")
        .select("id")
        .eq("medewerker_id", medewerker.id)
        .eq("status", "bevestigd")
        .not("check_in_at", "is", null)
        .lt("diensten.datum", vandaag),
      supabaseAdmin
        .from("uren_registraties")
        .select("aanmelding_id")
        .eq("medewerker_id", medewerker.id),
      supabaseAdmin
        .from("uren_registraties")
        .select(`
          gewerkte_uren,
          aanmelding:dienst_aanmeldingen!inner (
            dienst:diensten!dienst_id (uurtarief, datum)
          )
        `)
        .eq("medewerker_id", medewerker.id)
        .in("status", ["klant_goedgekeurd", "gefactureerd"])
        .gte("aanmelding.diensten.datum", startVanMaandStr),
    ]);

    const geregistreerdIds = new Set((geregistreerd || []).map(u => u.aanmelding_id));
    const te_registreren_uren = (voltooide || []).filter(v => !geregistreerdIds.has(v.id)).length;

    let deze_maand_verdiensten = 0;
    let totaal_uren_deze_maand = 0;

    for (const uur of urenDezeMaand || []) {
      const aanmelding = uur.aanmelding as unknown as Record<string, unknown> | null;
      const dienst = aanmelding?.dienst as Record<string, unknown> | null;
      const klantUurtarief = (dienst?.uurtarief as number) || 0;
      const medewerkerUurtarief = klantUurtarief - 4; // €4 margin
      deze_maand_verdiensten += uur.gewerkte_uren * medewerkerUurtarief;
      totaal_uren_deze_maand += uur.gewerkte_uren;
    }

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
