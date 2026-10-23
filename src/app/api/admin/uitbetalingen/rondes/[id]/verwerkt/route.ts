import { after, NextRequest, NextResponse } from "next/server";
import { captureRouteError } from "@/lib/sentry-utils";
import { sendPushToUser } from "@/lib/push-notifications";
import { meldingUitbetaald } from "@/lib/meldingen/meldingen-teksten";
import { GEEN_CACHE, uitbetalingToegang } from "@/lib/uitbetaling/admin-toegang";
import { markeerRondeVerwerkt } from "@/lib/uitbetaling/ronde";
import { euroTekst, naarCenten } from "@/lib/uitbetaling/regels";

/**
 * Admin markeert een ronde als "verwerkt in bank" (alleen owner/finance). Kan ook met de vlag uit,
 * zodat een al aangemaakte ronde altijd afgerond kan worden. Daarna staan de zelffacturen op
 * "uitbetaald" en krijgt elke medewerker een push (categorie uren/geld; tag "uitbetaling-<id>").
 *   POST → 200 { success, aantal } · 404/409 { error, code }
 */
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const toegang = await uitbetalingToegang(request);
  if (!toegang.ok) return toegang.response;

  try {
    const { id } = await params;
    if (!/^[0-9a-f-]{36}$/i.test(id)) return NextResponse.json({ error: "Ronde niet gevonden", code: "niet_gevonden" }, { status: 404 });

    const resultaat = await markeerRondeVerwerkt(id, { email: toegang.email, role: toegang.role });
    if (!resultaat.ok) return NextResponse.json({ error: resultaat.error, code: resultaat.code }, { status: resultaat.status });

    // Push na het antwoord; een mislukte push maakt de verwerking niet ongedaan.
    after(async () => {
      for (const u of resultaat.uitbetalingen) {
        if (!u.medewerker_id) continue;
        try {
          await sendPushToUser(
            u.medewerker_id,
            "medewerker",
            meldingUitbetaald({
              uitbetalingId: u.id,
              factuurNummer: u.factuur_nummer,
              bedrag: euroTekst(naarCenten(u.bedrag_incl)),
              ibanLaatste4: u.iban_laatste4,
            }),
          );
        } catch (e) {
          captureRouteError(e, { route: "/api/admin/uitbetalingen/rondes/[id]/verwerkt", action: "PUSH" });
        }
      }
    });

    return NextResponse.json({ success: true, aantal: resultaat.uitbetalingen.length }, { headers: GEEN_CACHE });
  } catch (error) {
    captureRouteError(error, { route: "/api/admin/uitbetalingen/rondes/[id]/verwerkt", action: "POST" });
    return NextResponse.json({ error: "Bijwerken mislukt" }, { status: 500 });
  }
}
