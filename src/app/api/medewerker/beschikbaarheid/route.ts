import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { cookies } from "next/headers";

export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const session = cookieStore.get("medewerker_session");
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { verifyMedewerkerSession } = await import("@/lib/session");
    const medewerker = await verifyMedewerkerSession(session.value);
    if (!medewerker) {
      console.warn("[SECURITY] Invalid medewerker session token");
      return NextResponse.json({ error: "Unauthorized - Invalid session" }, { status: 401 });
    }

    const { beschikbaarheid, beschikbaar_vanaf, max_uren_per_week } = await request.json();

    const { error } = await supabaseAdmin
      .from("inschrijvingen")
      .update({ beschikbaarheid, beschikbaar_vanaf, max_uren_per_week })
      .eq("email", medewerker.email);

    if (error) {
      console.error("DB error:", error);
      return NextResponse.json({ error: "Opslaan mislukt" }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("API error:", error);
    return NextResponse.json({ error: "Fout opgetreden" }, { status: 500 });
  }
}

export async function GET() {
  try {
    const cookieStore = await cookies();
    const session = cookieStore.get("medewerker_session");
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { verifyMedewerkerSession } = await import("@/lib/session");
    const medewerker = await verifyMedewerkerSession(session.value);
    if (!medewerker) {
      console.warn("[SECURITY] Invalid medewerker session token");
      return NextResponse.json({ error: "Unauthorized - Invalid session" }, { status: 401 });
    }

    const { data, error } = await supabaseAdmin
      .from("inschrijvingen")
      .select("beschikbaarheid, beschikbaar_vanaf, max_uren_per_week")
      .eq("email", medewerker.email)
      .maybeSingle();

    if (error) {
      console.error("DB error:", error);
      return NextResponse.json({ error: "Ophalen mislukt" }, { status: 500 });
    }

    if (!data) {
      return NextResponse.json({ error: "Medewerker niet gevonden" }, { status: 404 });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error("API error:", error);
    return NextResponse.json({ error: "Fout opgetreden" }, { status: 500 });
  }
}
