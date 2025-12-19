import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin as supabase } from "@/lib/supabase";
import { cookies } from "next/headers";
import { checkRateLimit, getClientIP } from "@/lib/rate-limit";
import { signMedewerkerSession } from "@/lib/session";
import bcrypt from "bcryptjs";

export async function POST(request: NextRequest) {
  try {
    const clientIP = getClientIP(request);
    const rateLimit = checkRateLimit(`medewerker-login:${clientIP}`, {
      windowMs: 15 * 60 * 1000,
      maxRequests: 5,
    });

    if (!rateLimit.success) {
      return NextResponse.json(
        { error: `Te veel loginpogingen. Probeer opnieuw over ${rateLimit.resetIn} seconden.` },
        { status: 429, headers: { "Retry-After": rateLimit.resetIn.toString() } }
      );
    }

    const { email, wachtwoord } = await request.json();

    if (!email || !wachtwoord) {
      return NextResponse.json({ error: "Email en wachtwoord zijn verplicht" }, { status: 400 });
    }

    const { data: medewerker, error } = await supabase
      .from("medewerkers")
      .select("id, naam, email, functie, wachtwoord, status")
      .eq("email", email.toLowerCase())
      .single();

    if (error || !medewerker) {
      return NextResponse.json({ error: "Ongeldige inloggegevens" }, { status: 401 });
    }

    if (medewerker.status !== "actief") {
      return NextResponse.json({ error: "Account is niet actief" }, { status: 403 });
    }

    if (!medewerker.wachtwoord) {
      return NextResponse.json({ error: "Geen wachtwoord ingesteld" }, { status: 401 });
    }

    const valid = await bcrypt.compare(wachtwoord, medewerker.wachtwoord);
    if (!valid) {
      return NextResponse.json({ error: "Ongeldige inloggegevens" }, { status: 401 });
    }

    await supabase.from("medewerkers").update({ laatste_login: new Date().toISOString() }).eq("id", medewerker.id);

    const token = await signMedewerkerSession({
      id: medewerker.id,
      naam: medewerker.naam,
      email: medewerker.email,
      functie: medewerker.functie,
    });

    const cookieStore = await cookies();
    cookieStore.set("medewerker_session", token, {
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
