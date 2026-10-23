import { NextRequest, NextResponse } from "next/server";
import { checkRedisRateLimit, getClientIP, loginRateLimit } from "@/lib/rate-limit-redis";
import { zoekOpEmail } from "@/lib/medewerker/zoek-op-email";
import { magWachtwoordResetten } from "@/lib/medewerker/account-status";
import { sendMedewerkerPasswordResetEmail } from "@/lib/medewerker-password-reset";
import { captureRouteError } from "@/lib/sentry-utils";

export async function POST(request: NextRequest) {
  const clientIP = getClientIP(request);
  const rateLimit = await checkRedisRateLimit(`medewerker-password-reset:${clientIP}`, loginRateLimit, { failClosed: true });

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

    // Hoofdletterongevoelig: oude rijen kunnen nog "Jan@Gmail.com" bevatten (B4).
    const medewerker = await zoekOpEmail<{ id: string; naam: string; email: string; status: string | null }>(
      "medewerkers",
      "id, naam, email, status",
      String(email),
    );

    // Ook gepauzeerd (B5): anders kan wie zijn wachtwoord kwijt is de boete nooit betalen.
    if (medewerker && magWachtwoordResetten(medewerker.status)) {
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
    captureRouteError(error, { route: "/api/medewerker/wachtwoord-reset/request", action: "POST" });
    // console.error("Medewerker password reset request error:", error);
    return NextResponse.json({ error: "Er ging iets mis bij het versturen van de resetmail" }, { status: 500 });
  }
}
