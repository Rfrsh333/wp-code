import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { getMedewerkerSession } from "@/lib/portal-auth";
import { captureRouteError } from "@/lib/sentry-utils";
import { nlVandaag } from "@/lib/nl-tijd";
import { normaliseerBeschikbaarheid, schoneBeschikbaarheid } from "@/lib/medewerker/beschikbaarheid";

export async function POST(request: NextRequest) {
  try {
    const medewerker = await getMedewerkerSession(request);
    if (!medewerker) {
      console.warn("[SECURITY] Invalid medewerker session token");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const update: Record<string, unknown> = {};
    if ("beschikbaarheid" in body) {
      // Altijd opslaan in de notatie van de matching (ma…zo); oude "Maandag"-sleutels worden omgezet.
      const schoon = schoneBeschikbaarheid(body.beschikbaarheid);
      if (!schoon) return NextResponse.json({ error: "Ongeldige beschikbaarheid" }, { status: 400 });
      update.beschikbaarheid = schoon;
    }
    if ("beschikbaar_vanaf" in body) update.beschikbaar_vanaf = body.beschikbaar_vanaf || null;
    if ("max_uren_per_week" in body) update.max_uren_per_week = body.max_uren_per_week ?? null;
    if (Object.keys(update).length === 0) {
      return NextResponse.json({ error: "Niets om op te slaan" }, { status: 400 });
    }

    const { data, error } = await supabaseAdmin
      .from("inschrijvingen")
      .update(update)
      .eq("email", medewerker.email)
      .select("id");

    if (error) {
      captureRouteError(error, { route: "/api/medewerker/beschikbaarheid", action: "POST" });
      return NextResponse.json({ error: "Opslaan mislukt" }, { status: 500 });
    }

    // Geen inschrijving op dit e-mailadres: er is niets opgeslagen, dus ook niet "opgeslagen" melden.
    if (!data || data.length === 0) {
      return NextResponse.json(
        { error: "We konden je inschrijving niet vinden. Stuur TopTalent een bericht, dan zetten we het recht." },
        { status: 404 },
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    captureRouteError(error, { route: "/api/medewerker/beschikbaarheid", action: "POST" });
    // console.error("API error:", error);
    return NextResponse.json({ error: "Fout opgetreden" }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const medewerker = await getMedewerkerSession(request);
    if (!medewerker) {
      console.warn("[SECURITY] Invalid medewerker session token");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const wantOverrides = request.nextUrl.searchParams.get("overrides") === "true";

    const { data, error } = await supabaseAdmin
      .from("inschrijvingen")
      .select("beschikbaarheid, beschikbaar_vanaf, max_uren_per_week")
      .eq("email", medewerker.email)
      .maybeSingle();

    if (error) {
      captureRouteError(error, { route: "/api/medewerker/beschikbaarheid", action: "GET" });
      // console.error("DB error:", error);
      return NextResponse.json({ error: "Ophalen mislukt" }, { status: 500 });
    }

    if (!data) {
      return NextResponse.json({ error: "Medewerker niet gevonden" }, { status: 404 });
    }

    const genormaliseerd = {
      ...data,
      beschikbaarheid: normaliseerBeschikbaarheid(data.beschikbaarheid) ?? data.beschikbaarheid,
    };

    if (wantOverrides) {
      const { data: overrides } = await supabaseAdmin
        .from("medewerker_beschikbaarheid_overrides")
        .select("id, week_start, beschikbaarheid, notitie")
        .eq("medewerker_id", medewerker.id)
        .gte("week_start", nlVandaag())
        .order("week_start", { ascending: true });

      return NextResponse.json({
        ...genormaliseerd,
        overrides: (overrides || []).map((o) => ({
          ...o,
          beschikbaarheid: normaliseerBeschikbaarheid(o.beschikbaarheid) ?? o.beschikbaarheid,
        })),
      });
    }

    return NextResponse.json(genormaliseerd);
  } catch (error) {
    captureRouteError(error, { route: "/api/medewerker/beschikbaarheid", action: "GET" });
    // console.error("API error:", error);
    return NextResponse.json({ error: "Fout opgetreden" }, { status: 500 });
  }
}

// PUT: upsert week override
export async function PUT(request: NextRequest) {
  try {
    const medewerker = await getMedewerkerSession(request);
    if (!medewerker) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { week_start, beschikbaarheid: ruw, notitie } = await request.json();
    const beschikbaarheid = schoneBeschikbaarheid(ruw);
    if (!week_start || !beschikbaarheid) {
      return NextResponse.json({ error: "week_start en beschikbaarheid zijn verplicht" }, { status: 400 });
    }

    const { error } = await supabaseAdmin
      .from("medewerker_beschikbaarheid_overrides")
      .upsert(
        {
          medewerker_id: medewerker.id,
          week_start,
          beschikbaarheid,
          notitie: notitie || null,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "medewerker_id,week_start" }
      );

    if (error) {
      captureRouteError(error, { route: "/api/medewerker/beschikbaarheid", action: "PUT" });
      // console.error("DB error:", error);
      return NextResponse.json({ error: "Opslaan mislukt" }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    captureRouteError(error, { route: "/api/medewerker/beschikbaarheid", action: "PUT" });
    // console.error("API error:", error);
    return NextResponse.json({ error: "Fout opgetreden" }, { status: 500 });
  }
}

// DELETE: remove week override
export async function DELETE(request: NextRequest) {
  try {
    const medewerker = await getMedewerkerSession(request);
    if (!medewerker) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const weekStart = request.nextUrl.searchParams.get("week_start");
    if (!weekStart) return NextResponse.json({ error: "week_start is verplicht" }, { status: 400 });

    await supabaseAdmin
      .from("medewerker_beschikbaarheid_overrides")
      .delete()
      .eq("medewerker_id", medewerker.id)
      .eq("week_start", weekStart);

    return NextResponse.json({ success: true });
  } catch (error) {
    captureRouteError(error, { route: "/api/medewerker/beschikbaarheid", action: "DELETE" });
    // console.error("API error:", error);
    return NextResponse.json({ error: "Fout opgetreden" }, { status: 500 });
  }
}
