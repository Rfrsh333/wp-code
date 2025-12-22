import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin as supabase } from "@/lib/supabase";
import { cookies } from "next/headers";
import { checkRateLimit, getClientIP } from "@/lib/rate-limit";
import bcrypt from "bcryptjs";

export async function POST(request: NextRequest) {
  // Rate limiting: 5 login attempts per 15 minutes per IP
  const clientIP = getClientIP(request);
  const rateLimitResult = checkRateLimit(`klant-login:${clientIP}`, {
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 5,
  });

  if (!rateLimitResult.success) {
    console.warn(`[SECURITY] Rate limit exceeded for klant login from IP: ${clientIP}`);
    return NextResponse.json(
      {
        error: `Te veel loginpogingen. Probeer het over ${rateLimitResult.resetIn} seconden opnieuw.`,
      },
      {
        status: 429,
        headers: {
          "Retry-After": rateLimitResult.resetIn.toString(),
        },
      }
    );
  }

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

    // KRITIEK: Gebruik signed JWT in plaats van plain JSON
    const { signKlantSession } = await import("@/lib/session");
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

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Login error:", error);
    return NextResponse.json({ error: "Fout bij inloggen" }, { status: 500 });
  }
}
