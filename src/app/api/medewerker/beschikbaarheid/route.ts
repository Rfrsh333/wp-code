import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { cookies } from "next/headers";
import { captureRouteError } from "@/lib/sentry-utils";

async function getMedewerker() {
  const cookieStore = await cookies();
  const session = cookieStore.get("medewerker_session");
  if (!session) return null;
  const { verifyMedewerkerSession } = await import("@/lib/session");
  return verifyMedewerkerSession(session.value);
}

export async function POST(request: NextRequest) {
  try {
    const medewerker = await getMedewerker();
    if (!medewerker) {
      console.warn("[SECURITY] Invalid medewerker session token");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { beschikbaarheid, beschikbaar_vanaf, max_uren_per_week } = await request.json();

    const { error } = await supabaseAdmin
      .from("inschrijvingen")
      .update({ beschikbaarheid, beschikbaar_vanaf, max_uren_per_week })
      .eq("email", medewerker.email);

    if (error) {
      captureRouteError(error, { route: "/api/medewerker/beschikbaarheid", action: "POST" });
      // console.error("DB error:", error);
      return NextResponse.json({ error: "Opslaan mislukt" }, { status: 500 });
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
    const medewerker = await getMedewerker();
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

    if (wantOverrides) {
      const { data: overrides } = await supabaseAdmin
        .from("medewerker_beschikbaarheid_overrides")
        .select("id, week_start, beschikbaarheid, notitie")
        .eq("medewerker_id", medewerker.id)
        .gte("week_start", new Date().toISOString().split("T")[0])
        .order("week_start", { ascending: true });

      return NextResponse.json({ ...data, overrides: overrides || [] });
    }

    return NextResponse.json(data);
  } catch (error) {
    captureRouteError(error, { route: "/api/medewerker/beschikbaarheid", action: "GET" });
    // console.error("API error:", error);
    return NextResponse.json({ error: "Fout opgetreden" }, { status: 500 });
  }
}

// PUT: upsert week override
export async function PUT(request: NextRequest) {
  try {
    const medewerker = await getMedewerker();
    if (!medewerker) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { week_start, beschikbaarheid, notitie } = await request.json();
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
    const medewerker = await getMedewerker();
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
