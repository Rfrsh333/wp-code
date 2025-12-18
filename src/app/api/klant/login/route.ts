import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin as supabase } from "@/lib/supabase-admin";
import { cookies } from "next/headers";
import bcrypt from "bcryptjs";

export async function POST(request: NextRequest) {
  try {
    const { email, wachtwoord } = await request.json();

    if (!email || !wachtwoord) {
      return NextResponse.json({ error: "Email en wachtwoord zijn verplicht" }, { status: 400 });
    }

    const { data: klant, error } = await supabase
      .from("klanten")
      .select("id, bedrijfsnaam, contactpersoon, email, wachtwoord, status")
      .eq("email", email.toLowerCase())
      .single();

    if (error || !klant) {
      return NextResponse.json({ error: "Ongeldige inloggegevens" }, { status: 401 });
    }

    if (klant.status !== "actief") {
      return NextResponse.json({ error: "Account is niet actief" }, { status: 403 });
    }

    if (!klant.wachtwoord) {
      return NextResponse.json({ error: "Geen wachtwoord ingesteld" }, { status: 401 });
    }

    const valid = await bcrypt.compare(wachtwoord, klant.wachtwoord);
    if (!valid) {
      return NextResponse.json({ error: "Ongeldige inloggegevens" }, { status: 401 });
    }

    const cookieStore = await cookies();
    cookieStore.set("klant_session", JSON.stringify({
      id: klant.id,
      bedrijfsnaam: klant.bedrijfsnaam,
      contactpersoon: klant.contactpersoon,
      email: klant.email,
    }), {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      expires: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      path: "/",
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Login error:", error);
    return NextResponse.json({ error: "Fout bij inloggen" }, { status: 500 });
  }
}
