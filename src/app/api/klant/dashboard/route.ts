import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { getKlantSession } from "@/lib/portal-auth";
import { signFactuurToken } from "@/lib/session";
import { isIngepland } from "@/lib/dienst-status";
import { maandGrenzen, nlVandaag, plusDagen } from "@/lib/nl-tijd";
import { roundCurrency } from "@/lib/reiskosten";
import { captureRouteError } from "@/lib/sentry-utils";

// Uren die voor de klant als "goedgekeurd" tellen (ook nadat er een factuur van is gemaakt).
const GOEDGEKEURD = ["klant_goedgekeurd", "goedgekeurd", "gefactureerd"];

function eerste<T>(v: T | T[] | null | undefined): T | null {
  return (Array.isArray(v) ? v[0] : v) ?? null;
}

export async function GET(request: NextRequest) {
  const klant = await getKlantSession(request);
  if (!klant) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const today = nlVandaag();
  const morgen = plusDagen(today, 1);
  const [jaar, maand] = today.split("-").map(Number);
  const { start: maandStart, eind: maandEind } = maandGrenzen(jaar, maand);

  const [dienstenRes, facturenRes, openUrenRes, maandUrenRes] = await Promise.all([
    // Komende diensten vanaf vandaag (NL); voorheen de 100 óudste diensten ooit, gefilterd in JS,
    // waardoor een klant met veel historie geen komende diensten meer zag.
    supabaseAdmin
      .from("diensten")
      .select("id, datum, start_tijd, eind_tijd, locatie, functie, aantal_nodig, plekken_totaal, status")
      .eq("klant_id", klant.id)
      .gte("datum", today)
      .neq("status", "geannuleerd")
      .order("datum", { ascending: true })
      .order("start_tijd", { ascending: true })
      .limit(100),
    supabaseAdmin
      .from("facturen")
      .select("id, factuur_nummer, periode_start, periode_eind, totaal, status, created_at, klant_id")
      .eq("klant_id", klant.id)
      .order("created_at", { ascending: false })
      .limit(500),
    supabaseAdmin
      .from("uren_registraties")
      .select("gewerkte_uren, aanmelding:dienst_aanmeldingen!inner(dienst:diensten!inner(klant_id))")
      .eq("aanmelding.dienst.klant_id", klant.id)
      .eq("status", "ingediend")
      .limit(1000),
    supabaseAdmin
      .from("uren_registraties")
      .select("gewerkte_uren, aanmelding:dienst_aanmeldingen!inner(dienst:diensten!inner(klant_id, datum, uurtarief))")
      .eq("aanmelding.dienst.klant_id", klant.id)
      .gte("aanmelding.dienst.datum", maandStart)
      .lte("aanmelding.dienst.datum", maandEind)
      .in("status", GOEDGEKEURD)
      .limit(2000),
  ]);

  for (const res of [dienstenRes, facturenRes, openUrenRes, maandUrenRes]) {
    if (res.error) captureRouteError(res.error, { route: "/api/klant/dashboard", action: "GET" });
  }

  const diensten = dienstenRes.data || [];
  const facturen = facturenRes.data || [];

  const pendingHoursCount = (openUrenRes.data || []).length;
  const pendingHoursTotal = (openUrenRes.data || []).reduce((s, u) => s + (u.gewerkte_uren || 0), 0);

  // Kosten deze maand: zelfde berekening als het kostenoverzicht (goedgekeurde uren × uurtarief van
  // de dienst), op dienstdatum in deze NL-kalendermaand. Geen toeslag/reiskosten: die staan pas op de factuur.
  let approvedHoursThisMonth = 0;
  let kostenDezeMaand = 0;
  for (const u of maandUrenRes.data || []) {
    const dienst = eerste(eerste(u.aanmelding as { dienst?: unknown } | null)?.dienst as { uurtarief?: number } | null);
    const uren = u.gewerkte_uren || 0;
    approvedHoursThisMonth += uren;
    kostenDezeMaand += uren * (dienst?.uurtarief || 0);
  }

  // Aanmeldingen per dienst per status. `aanmeldingen_geaccepteerd` blijft (zoals altijd) het
  // aantal ingeplande medewerkers = geaccepteerd + bevestigd (lib/dienst-status); de losse
  // tellers en `aanmeldingen_per_status` zijn nieuw (3-10-2026) zodat het overzicht ook laat zien
  // dat er aanmeldingen op de klant wachten. Zelfde definities als GET /api/klant/diensten.
  const perDienst: Record<string, Record<string, number>> = {};
  if (diensten.length > 0) {
    const { data: aanmeldingen } = await supabaseAdmin
      .from("dienst_aanmeldingen")
      .select("dienst_id, status")
      .in("dienst_id", diensten.map((d) => d.id));
    for (const a of aanmeldingen || []) {
      const telling = (perDienst[a.dienst_id] ??= {});
      telling[a.status] = (telling[a.status] || 0) + 1;
    }
  }

  const metBezetting = diensten.map((d) => {
    const telling = perDienst[d.id] ?? {};
    const ingepland = Object.entries(telling).reduce((s, [status, n]) => s + (isIngepland(status) ? n : 0), 0);
    return {
      ...d,
      aanmeldingen_geaccepteerd: ingepland,
      aanmeldingen_aangemeld: telling.aangemeld || 0,
      aanmeldingen_bevestigd: telling.bevestigd || 0,
      aanmeldingen_uitgenodigd: telling.uitgenodigd || 0,
      aanmeldingen_per_status: telling,
    };
  });

  // Aandachtspunt: aanmeldingen (status `aangemeld`) die op een beslissing van de klant wachten,
  // over álle komende diensten (niet alleen de vier in upcomingDiensten).
  const wachtend = metBezetting.filter((d) => d.aanmeldingen_aangemeld > 0);
  const aanmeldingenWachtend = wachtend.reduce((s, d) => s + d.aanmeldingen_aangemeld, 0);

  const upcomingDiensten = metBezetting.slice(0, 4);
  const vandaagMorgen = metBezetting.filter((d) => d.datum === today || d.datum === morgen);

  const activeDienstenCount = diensten.filter((dienst) => ["open", "bezig", "vol"].includes(dienst.status)).length;

  const openFacturen = facturen.filter((f) => f.status !== "betaald" && f.status !== "concept");
  const openFacturenCount = openFacturen.length;
  const openFacturenBedrag = openFacturen.reduce((s, f) => s + (Number(f.totaal) || 0), 0);

  const recentFacturen = await Promise.all(
    facturen.slice(0, 5).map(async (factuur) => {
      const token = await signFactuurToken(factuur.id, klant.id);
      return {
        ...factuur,
        viewUrl: `/api/facturen/${factuur.id}/pdf?token=${token}`,
      };
    })
  );

  return NextResponse.json({
    stats: {
      pendingHoursCount,
      pendingHoursTotal: Math.round(pendingHoursTotal * 100) / 100,
      approvedHoursThisMonth: Math.round(approvedHoursThisMonth * 100) / 100,
      kostenDezeMaand: roundCurrency(kostenDezeMaand),
      activeDienstenCount,
      openFacturenCount,
      openFacturenBedrag: roundCurrency(openFacturenBedrag),
      aanmeldingenWachtend,
      aanmeldingenWachtendDiensten: wachtend.length,
    },
    /** Eerste komende dienst met wachtende aanmeldingen (om direct naartoe te navigeren), of null. */
    eersteWachtendeDienstId: wachtend[0]?.id ?? null,
    vandaag: today,
    upcomingDiensten,
    vandaagMorgen,
    recentFacturen,
  }, {
    // Geen max-age: de app (iOS-URL-cache) en het portaal toonden na accepteren/annuleren tot 30 s
    // een oude bezetting ("Nog niemand ingepland"). React Query regelt het cachen al in de client.
    headers: { "Cache-Control": "private, no-store" },
  });
}
