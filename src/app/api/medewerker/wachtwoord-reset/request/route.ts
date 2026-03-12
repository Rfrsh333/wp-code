import { NextRequest, NextResponse } from "next/server";
import { checkRedisRateLimit, getClientIP, loginRateLimit } from "@/lib/rate-limit-redis";
import { supabaseAdmin } from "@/lib/supabase";
import { sendMedewerkerPasswordResetEmail } from "@/lib/medewerker-password-reset";

export async function POST(request: NextRequest) {
  const clientIP = getClientIP(request);
  const rateLimit = await checkRedisRateLimit(`medewerker-password-reset:${clientIP}`, loginRateLimit);

  if (!rateLimit.success) {
    return NextResponse.json(
      { error: "Te veel verzoeken. Probeer het later opnieuw." },
      { status: 429 }
    );
  }

  try {
    const { email } = await request.json();

    if (!email) {
      return NextResponse.json({ error: "E-mail is verplicht" }, { status: 400 });
    }

    const { data: medewerker } = await supabaseAdmin
      .from("medewerkers")
      .select("id, naam, email, status")
      .eq("email", String(email).toLowerCase())
      .maybeSingle();

    if (medewerker && medewerker.status === "actief") {
      await sendMedewerkerPasswordResetEmail({
        id: medewerker.id,
        naam: medewerker.naam,
        email: medewerker.email,
      });
    }

    return NextResponse.json({
      success: true,
      message: "Als dit e-mailadres bij een actief medewerkeraccount hoort, is er een resetmail verstuurd.",
    });
  } catch (error) {
    console.error("Medewerker password reset request error:", error);
    return NextResponse.json({ error: "Er ging iets mis bij het versturen van de resetmail" }, { status: 500 });
  }
}
