import { NextRequest, NextResponse } from "next/server";
import { withCronMonitor } from "@/lib/sentry-utils";
import { ruimMeldingenOp } from "@/lib/meldingen/meldingen-opslag";
import { MELDING_BEWAARDAGEN, opruimGrens } from "@/lib/meldingen/meldingen-regels";

/**
 * Meldingencentrum: meldingen ouder dan 90 dagen verwijderen (bewaartermijn uit de
 * privacyverklaring, paragraaf 6). Dagelijks via vercel.json. Zonder migratie: niets te doen.
 */
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return withCronMonitor("cron-meldingen-opruimen", async () => {
    const grens = opruimGrens(new Date(), MELDING_BEWAARDAGEN);
    const { beschikbaar, verwijderd } = await ruimMeldingenOp(grens);
    if (!beschikbaar) return NextResponse.json({ success: true, overgeslagen: "migratie_ontbreekt" });
    return NextResponse.json({ success: true, verwijderd, grens });
  });
}
