import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { supabaseAdmin } from "@/lib/supabase";
import { getMedewerkerSession, revokeSessions } from "@/lib/portal-auth";
import { checkRedisRateLimit, loginRateLimit } from "@/lib/rate-limit-redis";
import { validatePasswordSecurity } from "@/lib/password-security";
import { captureRouteError } from "@/lib/sentry-utils";
import { isBearerRequest } from "@/lib/klant-sessie-cookie";
import { BCRYPT_KOSTEN, controleerWachtwoord, geefNieuweSessie } from "@/lib/medewerker/wachtwoord";

/**
 * POST { huidig_wachtwoord, nieuw_wachtwoord } — wachtwoord wijzigen vanuit Instellingen.
 * Voorheen stuurde Instellingen naar de reset-pagina zonder token ("Resetlink ontbreekt").
 * Na het wijzigen worden alle sessies (andere toestellen) ingetrokken en krijgt dit toestel
 * een nieuwe sessie.
 */
export async function POST(request: NextRequest) {
  const medewerker = await getMedewerkerSession(request);
  if (!medewerker) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const limiet = await checkRedisRateLimit(`medewerker-wachtwoord-wijzigen:${medewerker.id}`, loginRateLimit, {
    failClosed: true,
  });
  if (!limiet.success) {
    return NextResponse.json({ error: "Te veel pogingen. Probeer het later opnieuw." }, { status: 429 });
  }

  try {
    const body = await request.json().catch(() => ({}));
    const huidig = typeof body.huidig_wachtwoord === "string" ? body.huidig_wachtwoord : "";
    const nieuw = typeof body.nieuw_wachtwoord === "string" ? body.nieuw_wachtwoord : "";

    if (!huidig || !nieuw) {
      return NextResponse.json({ error: "Vul je huidige en nieuwe wachtwoord in" }, { status: 400 });
    }
    if (!(await controleerWachtwoord(medewerker.id, huidig))) {
      return NextResponse.json({ error: "Je huidige wachtwoord klopt niet" }, { status: 400 });
    }
    if (huidig === nieuw) {
      return NextResponse.json({ error: "Kies een ander wachtwoord dan je huidige" }, { status: 400 });
    }

    const veiligheid = await validatePasswordSecurity(nieuw);
    if (!veiligheid.valid) {
      return NextResponse.json({ error: veiligheid.error }, { status: 400 });
    }

    const hash = await bcrypt.hash(nieuw, BCRYPT_KOSTEN);
    const { error } = await supabaseAdmin
      .from("medewerkers")
      .update({ wachtwoord: hash, reset_token: null, reset_token_expires_at: null })
      .eq("id", medewerker.id);
    if (error) {
      captureRouteError(error, { route: "/api/medewerker/wachtwoord-wijzigen", action: "UPDATE" });
      return NextResponse.json({ error: "Wachtwoord wijzigen mislukt" }, { status: 500 });
    }

    // Het wachtwoord is al gewijzigd: een mislukte intrekking mag geen 500 geven (dan denkt de
    // gebruiker dat het wijzigen mislukte) en dit toestel krijgt altijd een nieuwe sessie.
    try {
      await revokeSessions("medewerkers", medewerker.id);
    } catch (revokeError) {
      captureRouteError(revokeError, { route: "/api/medewerker/wachtwoord-wijzigen", action: "REVOKE" });
    }
    const token = await geefNieuweSessie(medewerker, request);

    return NextResponse.json({ success: true, ...(isBearerRequest(request) ? { token } : {}) });
  } catch (error) {
    captureRouteError(error, { route: "/api/medewerker/wachtwoord-wijzigen", action: "POST" });
    return NextResponse.json({ error: "Er ging iets mis" }, { status: 500 });
  }
}
