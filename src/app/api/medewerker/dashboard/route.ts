import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { getMedewerkerSession } from "@/lib/portal-auth";
import { captureRouteError } from "@/lib/sentry-utils";
import { INGEPLAND_STATUSSEN } from "@/lib/dienst-status";
import { maandGrenzen, nlVandaag } from "@/lib/nl-tijd";
import { haalTeRegistreren, haalUrenRegistraties } from "@/lib/medewerker/uren";
import { telVerdiend } from "@/lib/medewerker/uren-regels";

export async function GET(request: NextRequest) {
  try {
    const medewerker = await getMedewerkerSession(request);
    if (!medewerker) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const vandaag = nlVandaag();
    const [jaar, maand] = vandaag.split("-").map(Number);

    const [{ data: aankomendeRows }, registraties, teRegistreren, { data: beoordelingen }] = await Promise.all([
      // Aankomend = ingepland (geaccepteerd óf bevestigd); voorheen telde alleen 'bevestigd'.
      supabaseAdmin
        .from("dienst_aanmeldingen")
        .select("id, dienst:diensten!dienst_id(datum)")
        .eq("medewerker_id", medewerker.id)
        .in("status", [...INGEPLAND_STATUSSEN]),
      haalUrenRegistraties(medewerker.id),
      haalTeRegistreren(medewerker.id),
      supabaseAdmin.from("beoordelingen").select("score").eq("medewerker_id", medewerker.id),
    ]);

    const aankomende_diensten = (aankomendeRows || []).filter((r) => {
      const dienst = (r as { dienst?: { datum?: string } | { datum?: string }[] | null }).dienst;
      const datum = Array.isArray(dienst) ? dienst[0]?.datum : dienst?.datum;
      return !!datum && datum >= vandaag;
    }).length;

    // Zelfde definitie als Uren en Financieel (lib/medewerker/uren-regels).
    const dezeMaand = telVerdiend(registraties, maandGrenzen(jaar, maand));

    // Echte gemiddelde beoordeling i.p.v. de vaste 4.8; 0 = nog geen beoordelingen.
    const scores = (beoordelingen || []).map((b) => Number(b.score)).filter((s) => s > 0);
    const gemiddelde_rating = scores.length
      ? Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 10) / 10
      : 0;

    return NextResponse.json({
      stats: {
        aankomende_diensten,
        te_registreren_uren: teRegistreren.length,
        deze_maand_verdiensten: dezeMaand.bedrag,
        totaal_uren_deze_maand: dezeMaand.uren,
        gemiddelde_rating,
        aantal_beoordelingen: scores.length,
      },
    });
  } catch (error) {
    captureRouteError(error, { route: "/api/medewerker/dashboard", action: "GET" });
    return NextResponse.json({ error: "Er ging iets mis" }, { status: 500 });
  }
}
