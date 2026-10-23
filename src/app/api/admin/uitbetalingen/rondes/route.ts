import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { captureRouteError } from "@/lib/sentry-utils";
import { isZelffactureringActief } from "@/lib/uitbetaling/config";
import { GEEN_CACHE, uitbetalingToegang } from "@/lib/uitbetaling/admin-toegang";
import { maakUitbetaalronde } from "@/lib/uitbetaling/ronde";

/** PDF's renderen voor een hele ronde kan even duren. */
export const maxDuration = 60;

/**
 * Uitbetaalronde aanmaken (alleen owner/finance, alleen met ZELFFACTURERING_ACTIEF=1).
 *   POST { uren_ids: string[], uitvoer_datum: "YYYY-MM-DD" }
 *   → 201 { success, ronde: { id, bericht_id, uitvoer_datum, aantal_betalingen, totaal_centen }, facturen: [...] }
 *   → 400/409/422/503 { error, code, details? }
 * De browser stuurt alleen uren-id's; alle bedragen worden op de server opnieuw berekend.
 * Er gaat geen geld weg: het SEPA-bestand moet daarna worden gedownload en zelf in de bank geüpload.
 */
const schema = z.object({
  uren_ids: z.array(z.string().regex(/^[0-9a-f-]{36}$/i)).min(1).max(2000),
  uitvoer_datum: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

export async function POST(request: NextRequest) {
  const toegang = await uitbetalingToegang(request);
  if (!toegang.ok) return toegang.response;

  if (!isZelffactureringActief()) {
    return NextResponse.json(
      { error: "Uitbetalen via zelffacturering komt binnenkort (ZELFFACTURERING_ACTIEF staat uit).", code: "zelffacturering_niet_actief" },
      { status: 403 },
    );
  }

  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Ongeldige selectie", code: "ongeldige_invoer" }, { status: 400 });

  try {
    const resultaat = await maakUitbetaalronde({
      urenIds: parsed.data.uren_ids,
      uitvoerDatum: parsed.data.uitvoer_datum,
      actor: { email: toegang.email, role: toegang.role },
    });
    if (!resultaat.ok) {
      return NextResponse.json({ error: resultaat.error, code: resultaat.code, details: resultaat.details }, { status: resultaat.status, headers: GEEN_CACHE });
    }
    return NextResponse.json({ success: true, ronde: resultaat.ronde, facturen: resultaat.facturen }, { status: 201, headers: GEEN_CACHE });
  } catch (error) {
    captureRouteError(error, { route: "/api/admin/uitbetalingen/rondes", action: "POST" });
    return NextResponse.json({ error: "Ronde aanmaken mislukt. Er is niets opgeslagen.", code: "fout" }, { status: 500 });
  }
}
