import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { verifyMedewerkerSession } from "@/lib/session";

export async function GET(request: NextRequest) {
  try {
    const sessionCookie = request.cookies.get("medewerker_session");
    if (!sessionCookie) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const medewerker = await verifyMedewerkerSession(sessionCookie.value);
    if (!medewerker) return NextResponse.json({ error: "Invalid session" }, { status: 401 });

    const { data, error } = await supabaseAdmin
      .from("medewerker_werkervaring")
      .select("id, medewerker_id, werkgever, functie, categorie, locatie, start_datum, eind_datum")
      .eq("medewerker_id", medewerker.id)
      .order("start_datum", { ascending: false })
      .limit(50);

    if (error) return NextResponse.json({ error: "Ophalen mislukt" }, { status: 500 });

    return NextResponse.json({ werkervaring: data });
  } catch (error) {
    console.error("Werkervaring fetch error:", error);
    return NextResponse.json({ error: "Er ging iets mis" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const sessionCookie = request.cookies.get("medewerker_session");
    if (!sessionCookie) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const medewerker = await verifyMedewerkerSession(sessionCookie.value);
    if (!medewerker) return NextResponse.json({ error: "Invalid session" }, { status: 401 });

    const body = await request.json();
    const { werkgever, functie, categorie, locatie, start_datum, eind_datum } = body;

    if (!werkgever || !functie || !categorie || !start_datum) {
      return NextResponse.json({ error: "Verplichte velden ontbreken" }, { status: 400 });
    }

    const { error } = await supabaseAdmin
      .from("medewerker_werkervaring")
      .insert({
        medewerker_id: medewerker.id,
        werkgever,
        functie,
        categorie,
        locatie: locatie || null,
        start_datum,
        eind_datum: eind_datum || null,
      });

    if (error) return NextResponse.json({ error: "Toevoegen mislukt" }, { status: 500 });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Werkervaring create error:", error);
    return NextResponse.json({ error: "Er ging iets mis" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const sessionCookie = request.cookies.get("medewerker_session");
    if (!sessionCookie) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const medewerker = await verifyMedewerkerSession(sessionCookie.value);
    if (!medewerker) return NextResponse.json({ error: "Invalid session" }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ error: "ID ontbreekt" }, { status: 400 });

    const { error } = await supabaseAdmin
      .from("medewerker_werkervaring")
      .delete()
      .eq("id", id)
      .eq("medewerker_id", medewerker.id);

    if (error) return NextResponse.json({ error: "Verwijderen mislukt" }, { status: 500 });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Werkervaring delete error:", error);
    return NextResponse.json({ error: "Er ging iets mis" }, { status: 500 });
  }
}
