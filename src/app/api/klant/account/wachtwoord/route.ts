import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { supabaseAdmin } from "@/lib/supabase";
import { getKlantSession, revokeSessions } from "@/lib/portal-auth";
import { checkRedisRateLimit, klantLoginPerAccountRateLimit } from "@/lib/rate-limit-redis";
import { validatePasswordSecurity } from "@/lib/password-security";
import { captureRouteError } from "@/lib/sentry-utils";
import { isBearerRequest, zetKlantSessie } from "@/lib/klant-sessie-cookie";

/**
 * Wachtwoord wijzigen vanuit Instellingen. Huidig wachtwoord verplicht; daarna worden alle
 * bestaande sessies ingetrokken en krijgt dít apparaat een nieuwe sessie.
 */
export async function POST(request: NextRequest) {
  const klant = await getKlantSession(request);
  if (!klant) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Zelfde limiet als inloggen per account: raden van het huidige wachtwoord afremmen.
  const limiet = await checkRedisRateLimit(`klant-wachtwoord-wijzigen:${klant.id}`, klantLoginPerAccountRateLimit, { failClosed: true });
  if (!limiet.success) {
    return NextResponse.json({ error: "Te veel pogingen. Probeer het later opnieuw." }, { status: 429 });
  }

  try {
    const { huidig_wachtwoord, nieuw_wachtwoord } = await request.json().catch(() => ({}));
    if (typeof huidig_wachtwoord !== "string" || !huidig_wachtwoord || typeof nieuw_wachtwoord !== "string" || !nieuw_wachtwoord) {
      return NextResponse.json({ error: "Vul uw huidige en nieuwe wachtwoord in" }, { status: 400 });
    }
    if (huidig_wachtwoord === nieuw_wachtwoord) {
      return NextResponse.json({ error: "Het nieuwe wachtwoord moet anders zijn dan het huidige" }, { status: 400 });
    }

    const { data: account } = await supabaseAdmin
      .from("klanten")
      .select("id, bedrijfsnaam, contactpersoon, email, wachtwoord")
      .eq("id", klant.id)
      .maybeSingle();
    if (!account?.wachtwoord) return NextResponse.json({ error: "Account niet gevonden" }, { status: 404 });

    if (!(await bcrypt.compare(huidig_wachtwoord, account.wachtwoord))) {
      return NextResponse.json({ error: "Huidig wachtwoord is onjuist" }, { status: 403 });
    }

    const check = await validatePasswordSecurity(nieuw_wachtwoord);
    if (!check.valid) return NextResponse.json({ error: check.error }, { status: 400 });

    // Zelfde cost-factor als registratie en reset.
    const hash = await bcrypt.hash(nieuw_wachtwoord, 12);
    const { error } = await supabaseAdmin
      .from("klanten")
      .update({ wachtwoord: hash })
      .eq("id", klant.id);
    if (error) {
      captureRouteError(error, { route: "/api/klant/account/wachtwoord", action: "POST" });
      return NextResponse.json({ error: "Wachtwoord wijzigen mislukt" }, { status: 500 });
    }

    // Andere apparaten uitloggen, dan dit apparaat een verse sessie geven (na de intrekking).
    await revokeSessions("klanten", klant.id);
    const token = await zetKlantSessie(account);

    return NextResponse.json({ success: true, ...(isBearerRequest(request) ? { token } : {}) });
  } catch (error) {
    captureRouteError(error, { route: "/api/klant/account/wachtwoord", action: "POST" });
    return NextResponse.json({ error: "Er ging iets mis" }, { status: 500 });
  }
}
