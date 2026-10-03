import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { getMedewerkerSession } from "@/lib/portal-auth";
import { captureRouteError } from "@/lib/sentry-utils";
import { maandGrenzen, nlVandaag } from "@/lib/nl-tijd";
import { haalAfgelopenZonderUren, haalUrenRegistraties } from "@/lib/medewerker/uren";
import { medewerkerUurtarief, telVerdiend, verdienstenVanRegel } from "@/lib/medewerker/uren-regels";
import { roundCurrency } from "@/lib/reiskosten";

export async function GET(request: NextRequest) {
  try {
    const medewerker = await getMedewerkerSession(request);
    if (!medewerker) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const [registraties, { teRegistreren, nietIngecheckt }] = await Promise.all([
      haalUrenRegistraties(medewerker.id),
      haalAfgelopenZonderUren(medewerker.id),
    ]);

    const uren = registraties.slice(0, 50).map((u) => ({
      id: u.id,
      gewerkte_uren: u.gewerkte_uren ?? 0,
      status: u.status,
      created_at: u.created_at,
      // Zelfde formule als dashboard/Financieel (incl. toeslag), zodat de bedragen kloppen.
      verdiensten: roundCurrency(verdienstenVanRegel(u)),
      medewerker_uurtarief: medewerkerUurtarief(u.klant_uurtarief),
      dienst: {
        datum: u.datum || "",
        locatie: u.locatie,
        uurtarief: u.klant_uurtarief || 0,
        klant: { bedrijfsnaam: u.klant_naam },
      },
    }));

    // "Deze maand" = verdiende uren (zie lib/medewerker/uren-regels) met een dienstdatum in de
    // huidige NL-kalendermaand — dezelfde definitie als dashboard en Financieel.
    const [jaar, maand] = nlVandaag().split("-").map(Number);
    const dezeMaand = telVerdiend(registraties, maandGrenzen(jaar, maand));

    // Klant-aanpassingen (filter via de aanmelding; uren_registraties.medewerker_id wordt niet gevuld)
    const { data: aanpassingenData } = await supabaseAdmin
      .from("uren_registraties")
      .select(`
        id, start_tijd, eind_tijd, pauze_minuten, gewerkte_uren, reiskosten_km, reiskosten_bedrag,
        klant_start_tijd, klant_eind_tijd, klant_pauze_minuten, klant_gewerkte_uren,
        klant_reiskosten_km, klant_reiskosten_bedrag, klant_opmerking,
        aanmelding:dienst_aanmeldingen!inner (
          medewerker_id,
          dienst:diensten (datum, klant_naam, locatie)
        )
      `)
      .eq("status", "klant_aangepast")
      .eq("aanmelding.medewerker_id", medewerker.id);

    const aanpassingen = (aanpassingenData || []).map((u: Record<string, unknown>) => {
      const dienst = (u.aanmelding as Record<string, unknown> | null)?.dienst as Record<string, unknown> | null;
      return {
        id: u.id,
        start_tijd: u.start_tijd,
        eind_tijd: u.eind_tijd,
        pauze_minuten: u.pauze_minuten,
        gewerkte_uren: u.gewerkte_uren,
        reiskosten_km: u.reiskosten_km,
        reiskosten_bedrag: u.reiskosten_bedrag,
        klant_start_tijd: u.klant_start_tijd,
        klant_eind_tijd: u.klant_eind_tijd,
        klant_pauze_minuten: u.klant_pauze_minuten,
        klant_gewerkte_uren: u.klant_gewerkte_uren,
        klant_reiskosten_km: u.klant_reiskosten_km,
        klant_reiskosten_bedrag: u.klant_reiskosten_bedrag,
        klant_opmerking: u.klant_opmerking,
        dienst_datum: dienst?.datum || "",
        klant_naam: dienst?.klant_naam || "",
        locatie: dienst?.locatie || "",
      };
    });

    return NextResponse.json({
      uren,
      te_registreren: teRegistreren.slice(0, 10),
      // Nieuw (3-10-2026): afgelopen diensten waarvoor indienen geblokkeerd is (geen QR-check-in,
      // klant eist QR). Apart veld zodat oudere app-versies er geen "Uren invullen"-knop voor tonen.
      niet_ingecheckt: nietIngecheckt.slice(0, 10),
      aanpassingen,
      summary: {
        deze_maand: dezeMaand.bedrag,
        totaal_uren: dezeMaand.uren,
      },
    });
  } catch (error) {
    captureRouteError(error, { route: "/api/medewerker/uren/lijst", action: "GET" });
    return NextResponse.json({ error: "Er ging iets mis" }, { status: 500 });
  }
}
