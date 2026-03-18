import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { supabaseAdmin } from "@/lib/supabase";
import { validatePasswordSecurity } from "@/lib/password-security";

async function findValidMedewerkerByToken(token: string) {
  const { data: medewerker, error } = await supabaseAdmin
    .from("medewerkers")
    .select("id, naam, email, magic_token_expires_at")
    .eq("magic_token", token)
    .gt("magic_token_expires_at", new Date().toISOString())
    .single();

  if (error || !medewerker) {
    return null;
  }

  return medewerker;
}

export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get("token");

  if (!token) {
    return NextResponse.json({ error: "Token ontbreekt" }, { status: 400 });
  }

  const medewerker = await findValidMedewerkerByToken(token);

  if (!medewerker) {
    return NextResponse.json({ error: "Activatielink is ongeldig of verlopen" }, { status: 404 });
  }

  return NextResponse.json({
    success: true,
    medewerker: {
      naam: medewerker.naam,
      email: medewerker.email,
    },
  });
}

export async function POST(request: NextRequest) {
  try {
    const { token, wachtwoord } = await request.json();

    if (!token || !wachtwoord) {
      return NextResponse.json({ error: "Token en wachtwoord zijn verplicht" }, { status: 400 });
    }

    // Validate password security (length, weakness, leaked passwords)
    const passwordValidation = await validatePasswordSecurity(String(wachtwoord));
    if (!passwordValidation.valid) {
      return NextResponse.json({ error: passwordValidation.error }, { status: 400 });
    }

    const medewerker = await findValidMedewerkerByToken(token);

    if (!medewerker) {
      return NextResponse.json({ error: "Activatielink is ongeldig of verlopen" }, { status: 404 });
    }

    const hashedPassword = await bcrypt.hash(String(wachtwoord), 10);

    const { error } = await supabaseAdmin
      .from("medewerkers")
      .update({
        wachtwoord: hashedPassword,
        magic_token: null,
        magic_token_expires_at: null,
      })
      .eq("id", medewerker.id);

    if (error) {
      return NextResponse.json({ error: "Wachtwoord instellen mislukt" }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Medewerker activation error:", error);
    return NextResponse.json({ error: "Serverfout bij activeren" }, { status: 500 });
  }
}
