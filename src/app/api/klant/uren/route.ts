import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { getKlantSession } from "@/lib/portal-auth";
import { calculateMedewerkerReiskosten, sanitizeKilometers } from "@/lib/reiskosten";
import { valideerUrenAanpassing } from "@/lib/klant-portaal-regels";
import { captureRouteError } from "@/lib/sentry-utils";
import { nlVandaag } from "@/lib/nl-tijd";

/**
 * Uren van de medewerkers bij deze klant.
 *
 * Voorheen: alle dienst-id's ophalen, dan `.in("aanmelding.dienst_id", …)` op een niet-inner
 * embed met een globale `.limit(100)`. Dat filterde niet in de database (de embed werd alleen
 * leeg), dus de 100 nieuwste uren van ÁLLE klanten kwamen terug en de eigen uren vielen weg
 * zodra er elders veel geregistreerd werd. Nu: !inner-joins met filter op klant_id in de query.
 *
 * - `openstaand`: alles wat nog actie of opvolging vraagt (ingediend, door u aangepast,
 *   door u goedgekeurd maar nog niet gefactureerd) — altijd volledig.
 * - `historie`: definitief goedgekeurd/gefactureerd, gepagineerd (`?pagina=1`, 25 per pagina).
 */

const OPENSTAAND = ["ingediend", "klant_aangepast", "klant_goedgekeurd"];
const HISTORIE = ["goedgekeurd", "gefactureerd"];
const PER_PAGINA = 25;

const SELECT = `
  id, start_tijd, eind_tijd, pauze_minuten, gewerkte_uren, reiskosten_km, reiskosten_bedrag, status, created_at,
  klant_start_tijd, klant_eind_tijd, klant_pauze_minuten, klant_gewerkte_uren, klant_opmerking,
  aanmelding:dienst_aanmeldingen!inner(
    medewerker:medewerkers(naam),
    dienst:diensten!inner(datum, locatie, uurtarief, klant_id)
  )
`;

type Rij = {
  id: string;
  start_tijd: string | null;
  eind_tijd: string | null;
  pauze_minuten: number | null;
  gewerkte_uren: number | null;
  reiskosten_km: number | null;
  reiskosten_bedrag: number | null;
  status: string;
  created_at: string;
  klant_start_tijd?: string | null;
  klant_eind_tijd?: string | null;
  klant_pauze_minuten?: number | null;
  klant_gewerkte_uren?: number | null;
  klant_opmerking?: string | null;
  aanmelding: unknown;
};

function eerste<T>(v: T | T[] | null | undefined): T | null {
  return (Array.isArray(v) ? v[0] : v) ?? null;
}

function naarUren(u: Rij) {
  const aanmelding = eerste(u.aanmelding as { medewerker?: unknown; dienst?: unknown } | null);
  const medewerker = eerste(aanmelding?.medewerker as { naam?: string } | null);
  const dienst = eerste(aanmelding?.dienst as { datum?: string; locatie?: string; uurtarief?: number } | null);
  return {
    id: u.id,
    start_tijd: u.start_tijd ?? "",
    eind_tijd: u.eind_tijd ?? "",
    pauze_minuten: u.pauze_minuten ?? 0,
    gewerkte_uren: u.gewerkte_uren ?? 0,
    reiskosten_km: u.reiskosten_km || 0,
    reiskosten_bedrag: u.reiskosten_bedrag || 0,
    status: u.status,
    created_at: u.created_at,
    klant_start_tijd: u.klant_start_tijd ?? null,
    klant_eind_tijd: u.klant_eind_tijd ?? null,
    klant_pauze_minuten: u.klant_pauze_minuten ?? null,
    klant_gewerkte_uren: u.klant_gewerkte_uren ?? null,
    klant_opmerking: u.klant_opmerking ?? null,
    medewerker_naam: medewerker?.naam || "Onbekend",
    dienst_datum: dienst?.datum || "",
    dienst_locatie: dienst?.locatie || "",
    uurtarief: dienst?.uurtarief || 0,
  };
}

export async function GET(request: NextRequest) {
  const klant = await getKlantSession(request);
  if (!klant) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const pagina = Math.max(1, Math.min(1000, parseInt(request.nextUrl.searchParams.get("pagina") || "1") || 1));
  const van = (pagina - 1) * PER_PAGINA;

  const [openRes, histRes] = await Promise.all([
    supabaseAdmin
      .from("uren_registraties")
      .select(SELECT)
      .eq("aanmelding.dienst.klant_id", klant.id)
      .in("status", OPENSTAAND)
      .order("created_at", { ascending: false })
      .limit(500),
    supabaseAdmin
      .from("uren_registraties")
      .select(SELECT, { count: "exact" })
      .eq("aanmelding.dienst.klant_id", klant.id)
      .in("status", HISTORIE)
      .order("created_at", { ascending: false })
      .range(van, van + PER_PAGINA - 1),
  ]);

  if (openRes.error || histRes.error) {
    captureRouteError(openRes.error || histRes.error, { route: "/api/klant/uren", action: "GET" });
    return NextResponse.json({ error: "Uren ophalen mislukt" }, { status: 500 });
  }

  const openstaand = ((openRes.data || []) as Rij[]).map(naarUren);
  const historie = ((histRes.data || []) as Rij[]).map(naarUren);
  const historieTotaal = histRes.count ?? historie.length;

  return NextResponse.json({
    // `uren` blijft bestaan voor bestaande clients (o.a. de app): openstaand + deze historiepagina.
    uren: [...openstaand, ...historie],
    openstaand,
    historie,
    pagina,
    per_pagina: PER_PAGINA,
    historie_totaal: historieTotaal,
    heeft_meer: van + historie.length < historieTotaal,
  });
}

export async function POST(request: NextRequest) {
  const klant = await getKlantSession(request);
  if (!klant) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Ongeldige request body" }, { status: 400 });
  }
  const { action, id, data } = body as {
    action?: string;
    id?: string;
    data?: Record<string, unknown> | null;
  };

  if (!id || typeof id !== "string") return NextResponse.json({ error: "id vereist" }, { status: 400 });

  // Verify ownership: the uren_registratie must belong to a dienst owned by this klant
  const { data: urenRow } = await supabaseAdmin
    .from("uren_registraties")
    .select("id, status, aanmelding:dienst_aanmeldingen(dienst:diensten(klant_id))")
    .eq("id", id)
    .maybeSingle();

  if (!urenRow) {
    return NextResponse.json({ error: "Niet gevonden" }, { status: 404 });
  }

  const aanmelding = eerste(urenRow.aanmelding as { dienst?: unknown } | null);
  const dienst = eerste(aanmelding?.dienst as { klant_id?: string } | null);
  if (!dienst?.klant_id || dienst.klant_id !== klant.id) {
    return NextResponse.json({ error: "Niet geautoriseerd" }, { status: 403 });
  }

  if (action === "approve") {
    // Alleen uren zoals de medewerker ze indiende. Een door u aangepaste regel ("klant_aangepast")
    // wordt eerst door TopTalent verwerkt: goedkeuren zou anders de oorspronkelijke uren factureren.
    if (urenRow.status !== "ingediend") {
      return NextResponse.json({ error: "Deze uren kunnen niet (meer) worden goedgekeurd" }, { status: 409 });
    }

    // Alleen de status: uren_registraties heeft geen score-kolommen (de update faalde daarop met
    // PGRST204, dus goedkeuren lukte nooit). Beoordelen is een aparte stap via /api/klant/beoordelingen.
    const { data: bijgewerkt, error } = await supabaseAdmin
      .from("uren_registraties")
      .update({ status: "klant_goedgekeurd" })
      .eq("id", id)
      .eq("status", "ingediend")
      .select("id");

    if (error) {
      captureRouteError(error, { route: "/api/klant/uren", action: "approve" });
      return NextResponse.json({ error: "Goedkeuren mislukt" }, { status: 500 });
    }
    if (!bijgewerkt || bijgewerkt.length === 0) {
      return NextResponse.json({ error: "Deze uren zijn intussen al verwerkt" }, { status: 409 });
    }

    await supabaseAdmin
      .from("klanten")
      .update({ eerste_goedkeuring: nlVandaag() })
      .eq("id", klant.id)
      .is("eerste_goedkeuring", null);
  } else if (action === "adjust") {
    if (!["ingediend", "klant_aangepast"].includes(urenRow.status)) {
      return NextResponse.json({ error: "Status staat wijziging niet toe" }, { status: 409 });
    }
    if (!data || typeof data !== "object") {
      return NextResponse.json({ error: "Aanpassing ontbreekt" }, { status: 400 });
    }

    // Uren worden hier berekend (nachtdienst-proof) i.p.v. het getal van de client over te nemen.
    const check = valideerUrenAanpassing({
      startTijd: data.startTijd,
      eindTijd: data.eindTijd,
      pauzeMinuten: data.pauzeMinuten,
    });
    if (!check.ok) {
      return NextResponse.json({ error: check.error }, { status: 400 });
    }

    const km = data.reiskostenKm as number | string | null | undefined;
    const opmerking = typeof data.opmerking === "string" ? data.opmerking.trim().slice(0, 1000) : "";

    const { error } = await supabaseAdmin
      .from("uren_registraties")
      .update({
        status: "klant_aangepast",
        klant_start_tijd: check.startTijd,
        klant_eind_tijd: check.eindTijd,
        klant_pauze_minuten: check.pauzeMinuten,
        klant_gewerkte_uren: check.uren,
        klant_reiskosten_km: sanitizeKilometers(km),
        klant_reiskosten_bedrag: calculateMedewerkerReiskosten(km),
        klant_opmerking: opmerking || null,
      })
      .eq("id", id)
      .eq("status", urenRow.status);

    if (error) {
      captureRouteError(error, { route: "/api/klant/uren", action: "adjust" });
      return NextResponse.json({ error: "Aanpassing opslaan mislukt" }, { status: 500 });
    }
  } else if (action === "reject") {
    // Zelfde status als de admin-afwijzing (admin/uren update_status → "afgewezen"). Alleen uren
    // die nog bij de klant liggen; goedgekeurde of gefactureerde uren lopen via TopTalent.
    if (!["ingediend", "klant_aangepast"].includes(urenRow.status)) {
      return NextResponse.json({ error: "Deze uren kunnen niet (meer) worden afgewezen" }, { status: 409 });
    }
    const reden = typeof data?.reden === "string" ? data.reden.trim().slice(0, 1000) : "";

    const afwijzen = (metReden: boolean) =>
      supabaseAdmin
        .from("uren_registraties")
        .update({ status: "afgewezen", goedgekeurd_at: null, ...(metReden && reden ? { klant_opmerking: reden } : {}) })
        .eq("id", id)
        .eq("status", urenRow.status)
        .select("id");

    let { data: bijgewerkt, error } = await afwijzen(true);
    if (error && (error.code === "42703" || error.code === "PGRST204")) {
      ({ data: bijgewerkt, error } = await afwijzen(false));
    }
    if (error) {
      captureRouteError(error, { route: "/api/klant/uren", action: "reject" });
      return NextResponse.json({ error: "Afwijzen mislukt" }, { status: 500 });
    }
    if (!bijgewerkt || bijgewerkt.length === 0) {
      return NextResponse.json({ error: "Deze uren zijn intussen al verwerkt" }, { status: 409 });
    }
  } else {
    return NextResponse.json({ error: "Ongeldige actie" }, { status: 400 });
  }

  return NextResponse.json({ success: true });
}
