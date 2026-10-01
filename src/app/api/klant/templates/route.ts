import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { getKlantSession } from "@/lib/portal-auth";
import { captureRouteError } from "@/lib/sentry-utils";
import { parseUurtarief } from "@/lib/klant-portaal-regels";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type FunctieRegel = { functie: string; aantal: number; uurtarief: string };
type TemplateVelden = {
  naam?: string;
  beschrijving?: string | null;
  functie?: string;
  aantal_nodig?: number;
  locatie?: string;
  duur_uren?: number | null;
  uurtarief?: number | null;
  favoriet_medewerker_ids?: string[];
  notities?: string | null;
  functies_met_aantal?: FunctieRegel[] | null;
};

const tekst = (v: unknown, max: number): string | null =>
  typeof v === "string" && v.trim() ? v.trim().slice(0, max) : null;

/**
 * Whitelist + validatie van templatevelden. Alleen velden die in `body` staan worden teruggegeven,
 * zodat PATCH een deel kan wijzigen. klant_id, id en tellers kunnen nooit via de body gezet worden
 * (voorheen ging `...updates` ongefilterd naar de database: klant_id overschrijven kon).
 */
function leesVelden(body: Record<string, unknown>): { ok: true; velden: TemplateVelden } | { ok: false; error: string } {
  const velden: TemplateVelden = {};

  if ("naam" in body) {
    const naam = tekst(body.naam, 100);
    if (!naam) return { ok: false, error: "Naam is verplicht" };
    velden.naam = naam;
  }
  if ("beschrijving" in body) velden.beschrijving = tekst(body.beschrijving, 2000);
  if ("notities" in body) velden.notities = tekst(body.notities, 2000);
  if ("locatie" in body) {
    const locatie = tekst(body.locatie, 300);
    if (!locatie) return { ok: false, error: "Locatie is verplicht" };
    velden.locatie = locatie;
  }

  if ("functies_met_aantal" in body && body.functies_met_aantal != null) {
    if (!Array.isArray(body.functies_met_aantal) || body.functies_met_aantal.length > 20) {
      return { ok: false, error: "Ongeldige functies" };
    }
    const regels: FunctieRegel[] = [];
    for (const r of body.functies_met_aantal as Record<string, unknown>[]) {
      const functie = tekst(r?.functie, 100);
      const aantal = Number(r?.aantal);
      const tarief = parseUurtarief(r?.uurtarief);
      if (!functie || !Number.isInteger(aantal) || aantal < 1 || aantal > 50) {
        return { ok: false, error: "Elke functie heeft een naam en een aantal (1-50) nodig" };
      }
      if (!Number.isFinite(tarief) || tarief <= 0) {
        return { ok: false, error: `Vul een uurtarief in voor ${functie}` };
      }
      regels.push({ functie, aantal, uurtarief: tarief.toFixed(2) });
    }
    if (regels.length > 0) {
      velden.functies_met_aantal = regels;
      // Samenvattende kolommen blijven gevuld voor oudere clients en de lijstweergave.
      velden.functie = regels.map((r) => r.functie).join(", ");
      velden.aantal_nodig = regels.reduce((s, r) => s + r.aantal, 0);
      velden.uurtarief = Number(regels[0].uurtarief);
    }
  }

  if ("functie" in body && !velden.functies_met_aantal) {
    const functie = tekst(body.functie, 200);
    if (!functie) return { ok: false, error: "Functie is verplicht" };
    velden.functie = functie;
  }
  if ("aantal_nodig" in body && !velden.functies_met_aantal) {
    const aantal = Number(body.aantal_nodig);
    if (!Number.isInteger(aantal) || aantal < 1 || aantal > 200) return { ok: false, error: "Ongeldig aantal" };
    velden.aantal_nodig = aantal;
  }
  if ("uurtarief" in body && !velden.functies_met_aantal) {
    const tarief = parseUurtarief(body.uurtarief);
    if (!Number.isFinite(tarief) || tarief <= 0) return { ok: false, error: "Vul een geldig uurtarief in" };
    velden.uurtarief = tarief;
  }
  if ("duur_uren" in body) {
    if (body.duur_uren == null || body.duur_uren === "") velden.duur_uren = null;
    else {
      const duur = Number(body.duur_uren);
      if (!Number.isFinite(duur) || duur <= 0 || duur > 24) return { ok: false, error: "Ongeldige duur" };
      velden.duur_uren = duur;
    }
  }
  if ("favoriet_medewerker_ids" in body) {
    const ids = body.favoriet_medewerker_ids;
    if (ids != null && (!Array.isArray(ids) || ids.length > 50 || !ids.every((i) => typeof i === "string" && UUID.test(i)))) {
      return { ok: false, error: "Ongeldige favorieten" };
    }
    velden.favoriet_medewerker_ids = (ids as string[] | null) ?? [];
  }

  return { ok: true, velden };
}

/** Schrijft; valt zonder migratie (kolom functies_met_aantal) terug op de oude kolommen. */
async function schrijf<T>(
  actie: (velden: TemplateVelden) => PromiseLike<{ data: T | null; error: { code?: string } | null }>,
  velden: TemplateVelden,
) {
  const res = await actie(velden);
  if (res.error && (res.error.code === "42703" || res.error.code === "PGRST204") && "functies_met_aantal" in velden) {
    const zonder = { ...velden };
    delete zonder.functies_met_aantal;
    return actie(zonder);
  }
  return res;
}

// GET - Haal alle templates op
export async function GET(request: NextRequest) {
  const klant = await getKlantSession(request);
  if (!klant) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: templates, error } = await supabaseAdmin
    .from("dienst_templates")
    .select("*")
    .eq("klant_id", klant.id)
    .order("laatst_gebruikt_op", { ascending: false, nullsFirst: false })
    .order("created_at", { ascending: false });

  if (error) {
    captureRouteError(error, { route: "/api/klant/templates", action: "GET" });
    return NextResponse.json({ error: "Database error" }, { status: 500 });
  }

  return NextResponse.json({ templates: templates || [] });
}

// POST - Maak nieuwe template
export async function POST(request: NextRequest) {
  const klant = await getKlantSession(request);
  if (!klant) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object") return NextResponse.json({ error: "Ongeldige request body" }, { status: 400 });

  const parsed = leesVelden(body as Record<string, unknown>);
  if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 });
  const v = parsed.velden;

  if (!v.naam || !v.functie || !v.locatie || !v.aantal_nodig) {
    return NextResponse.json({ error: "Naam, functie, locatie en aantal zijn verplicht" }, { status: 400 });
  }
  if (v.uurtarief == null) {
    return NextResponse.json({ error: "Vul een uurtarief in" }, { status: 400 });
  }

  const { data, error } = await schrijf(
    (velden) =>
      supabaseAdmin
        .from("dienst_templates")
        .insert({ ...velden, klant_id: klant.id, favoriet_medewerker_ids: velden.favoriet_medewerker_ids ?? [] })
        .select()
        .single(),
    v,
  );

  if (error) {
    captureRouteError(error, { route: "/api/klant/templates", action: "POST" });
    return NextResponse.json({ error: "Opslaan mislukt" }, { status: 500 });
  }

  return NextResponse.json({ success: true, template: data });
}

// PATCH - Update template of increment gebruik
export async function PATCH(request: NextRequest) {
  const klant = await getKlantSession(request);
  if (!klant) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object") return NextResponse.json({ error: "Ongeldige request body" }, { status: 400 });
  const { template_id, increment_gebruik, ...rest } = body as Record<string, unknown>;

  if (typeof template_id !== "string" || !UUID.test(template_id)) {
    return NextResponse.json({ error: "template_id is verplicht" }, { status: 400 });
  }

  if (increment_gebruik) {
    const rpc = await supabaseAdmin.rpc("template_gebruikt", { p_template_id: template_id, p_klant_id: klant.id });
    if (!rpc.error) return NextResponse.json({ success: true });

    // Zonder migratie: lezen + schrijven (niet atomair, maar het is een gebruiksteller).
    const { data: huidig } = await supabaseAdmin
      .from("dienst_templates")
      .select("aantal_keer_gebruikt")
      .eq("id", template_id)
      .eq("klant_id", klant.id)
      .maybeSingle();
    if (!huidig) return NextResponse.json({ error: "Template niet gevonden" }, { status: 404 });

    const { error } = await supabaseAdmin
      .from("dienst_templates")
      .update({
        aantal_keer_gebruikt: (huidig.aantal_keer_gebruikt || 0) + 1,
        laatst_gebruikt_op: new Date().toISOString(),
      })
      .eq("id", template_id)
      .eq("klant_id", klant.id);

    if (error) {
      captureRouteError(error, { route: "/api/klant/templates", action: "PATCH" });
      return NextResponse.json({ error: "Update mislukt" }, { status: 500 });
    }
    return NextResponse.json({ success: true });
  }

  const parsed = leesVelden(rest);
  if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 });
  if (Object.keys(parsed.velden).length === 0) {
    return NextResponse.json({ error: "Geen wijzigingen" }, { status: 400 });
  }

  const { error } = await schrijf(
    (velden) =>
      supabaseAdmin
        .from("dienst_templates")
        .update({ ...velden, updated_at: new Date().toISOString() })
        .eq("id", template_id)
        .eq("klant_id", klant.id)
        .select("id"),
    parsed.velden,
  );

  if (error) {
    captureRouteError(error, { route: "/api/klant/templates", action: "PATCH" });
    return NextResponse.json({ error: "Update mislukt" }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}

// DELETE - Verwijder template
export async function DELETE(request: NextRequest) {
  const klant = await getKlantSession(request);
  if (!klant) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { template_id } = await request.json().catch(() => ({}));

  if (!template_id) {
    return NextResponse.json({ error: "template_id is verplicht" }, { status: 400 });
  }

  const { error } = await supabaseAdmin
    .from("dienst_templates")
    .delete()
    .eq("id", template_id)
    .eq("klant_id", klant.id);

  if (error) {
    captureRouteError(error, { route: "/api/klant/templates", action: "DELETE" });
    return NextResponse.json({ error: "Verwijderen mislukt" }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
