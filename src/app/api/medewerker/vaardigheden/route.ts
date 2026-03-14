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
      .from("medewerker_vaardigheden")
      .select("id, medewerker_id, categorie, vaardigheid")
      .eq("medewerker_id", medewerker.id)
      .order("categorie")
      .limit(50);

    if (error) return NextResponse.json({ error: "Ophalen mislukt" }, { status: 500 });

    return NextResponse.json({ vaardigheden: data });
  } catch (error) {
    console.error("Vaardigheden fetch error:", error);
    return NextResponse.json({ error: "Er ging iets mis" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const sessionCookie = request.cookies.get("medewerker_session");
    if (!sessionCookie) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const medewerker = await verifyMedewerkerSession(sessionCookie.value);
    if (!medewerker) return NextResponse.json({ error: "Invalid session" }, { status: 401 });

    const { categorie, vaardigheid } = await request.json();

    if (!categorie || !vaardigheid) {
      return NextResponse.json({ error: "Categorie en vaardigheid zijn verplicht" }, { status: 400 });
    }

    const { error } = await supabaseAdmin
      .from("medewerker_vaardigheden")
      .insert({
        medewerker_id: medewerker.id,
        categorie,
        vaardigheid,
      });

    if (error) {
      if (error.code === "23505") {
        return NextResponse.json({ error: "Deze vaardigheid bestaat al" }, { status: 409 });
      }
      return NextResponse.json({ error: "Toevoegen mislukt" }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Vaardigheden create error:", error);
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
      .from("medewerker_vaardigheden")
      .delete()
      .eq("id", id)
      .eq("medewerker_id", medewerker.id);

    if (error) return NextResponse.json({ error: "Verwijderen mislukt" }, { status: 500 });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Vaardigheden delete error:", error);
    return NextResponse.json({ error: "Er ging iets mis" }, { status: 500 });
  }
}
