import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { cookies } from "next/headers";
import { checkRateLimit, getClientIP } from "@/lib/rate-limit";
import bcrypt from "bcryptjs";
import { signKlantSession } from "@/lib/session";
import { sendTelegramAlert } from "@/lib/telegram";

export async function POST(request: NextRequest) {
  const clientIP = getClientIP(request);
  const rateLimitResult = checkRateLimit(`klant-register:${clientIP}`, {
    windowMs: 15 * 60 * 1000,
    maxRequests: 3,
  });

  if (!rateLimitResult.success) {
    return NextResponse.json(
      { error: `Te veel pogingen. Probeer het over ${rateLimitResult.resetIn} seconden opnieuw.` },
      { status: 429, headers: { "Retry-After": rateLimitResult.resetIn.toString() } }
    );
  }

  try {
    const { bedrijfsnaam, contactpersoon, email, wachtwoord, telefoon } = await request.json();

    if (!bedrijfsnaam?.trim() || !contactpersoon?.trim() || !email?.trim() || !wachtwoord) {
      return NextResponse.json({ error: "Alle verplichte velden moeten ingevuld zijn" }, { status: 400 });
    }

    const emailLower = email.trim().toLowerCase();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(emailLower)) {
      return NextResponse.json({ error: "Ongeldig emailadres" }, { status: 400 });
    }

    if (wachtwoord.length < 8) {
      return NextResponse.json({ error: "Wachtwoord moet minimaal 8 tekens bevatten" }, { status: 400 });
    }

    // Check of email al bestaat
    const { data: existing } = await supabaseAdmin
      .from("klanten")
      .select("id")
      .eq("email", emailLower)
      .single();

    if (existing) {
      return NextResponse.json({ error: "Er bestaat al een account met dit emailadres" }, { status: 409 });
    }

    const hashedPassword = await bcrypt.hash(wachtwoord, 10);

    const { data: klant, error } = await supabaseAdmin
      .from("klanten")
      .insert({
        bedrijfsnaam: bedrijfsnaam.trim(),
        contactpersoon: contactpersoon.trim(),
        email: emailLower,
        wachtwoord: hashedPassword,
        telefoon: telefoon?.trim() || null,
        status: "actief",
      })
      .select("id, bedrijfsnaam, contactpersoon, email")
      .single();

    if (error || !klant) {
      console.error("Registratie error:", error);
      return NextResponse.json({ error: "Registratie mislukt. Probeer het opnieuw." }, { status: 500 });
    }

    // Auto-login: set session cookie
    const token = await signKlantSession({
      id: klant.id,
      bedrijfsnaam: klant.bedrijfsnaam,
      contactpersoon: klant.contactpersoon,
      email: klant.email,
    });

    const cookieStore = await cookies();
    cookieStore.set("klant_session", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      expires: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      path: "/",
    });

    // Telegram notificatie
    await sendTelegramAlert(
      `<b>Nieuwe klant geregistreerd</b>\n` +
      `Bedrijf: ${klant.bedrijfsnaam}\n` +
      `Contact: ${klant.contactpersoon}\n` +
      `Email: ${klant.email}`
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Register error:", error);
    return NextResponse.json({ error: "Fout bij registratie" }, { status: 500 });
  }
}
