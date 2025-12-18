import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

export async function POST(request: NextRequest) {
  try {
    const { email, beschikbaarheid, beschikbaar_vanaf, max_uren_per_week } = await request.json();

    if (!email) {
      return NextResponse.json({ error: "Email verplicht" }, { status: 400 });
    }

    const { error } = await supabaseAdmin
      .from("inschrijvingen")
      .update({ beschikbaarheid, beschikbaar_vanaf, max_uren_per_week })
      .eq("email", email);

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

export async function GET(request: NextRequest) {
  try {
    const email = request.nextUrl.searchParams.get("email");

    if (!email) {
      return NextResponse.json({ error: "Email verplicht" }, { status: 400 });
    }

    const { data, error } = await supabaseAdmin
      .from("inschrijvingen")
      .select("beschikbaarheid, beschikbaar_vanaf, max_uren_per_week")
      .eq("email", email)
      .single();

    if (error) {
      console.error("DB error:", error);
      return NextResponse.json({ error: "Ophalen mislukt" }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error("API error:", error);
    return NextResponse.json({ error: "Fout opgetreden" }, { status: 500 });
  }
}
