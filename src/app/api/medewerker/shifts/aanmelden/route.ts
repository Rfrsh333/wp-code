import { after, NextRequest, NextResponse } from "next/server";
import { getMedewerkerSession } from "@/lib/portal-auth";
import { geenMedewerkerToegang } from "@/lib/medewerker/sessie-boete";
import { captureRouteError } from "@/lib/sentry-utils";
import { meldAan, aanmeldFoutBody } from "@/lib/medewerker/aanmelden";
import { notifyKlantNieuweAanmelding } from "@/lib/dienst-push-triggers";
import { reactieUitBody } from "@/lib/medewerker/reactie-regels";

/**
 * Reageren op een dienst (app en webportaal). Body: `{ dienst_id }` zoals altijd, plus optioneel
 * de velden van uitgebreid reageren (voorgesteld_uurtarief, voorgestelde_start_tijd,
 * voorgestelde_eind_tijd, motivatie, kleding_akkoord, auto_intrekken_uren). Een oude app die
 * alleen dienst_id stuurt blijft werken; alleen bij een dienst met kledingvoorschrift volgt een
 * 422 met code `kledingvoorschrift_akkoord_vereist` (zie lib/medewerker/reactie-regels.ts).
 */
export async function POST(request: NextRequest) {
  try {
    const medewerker = await getMedewerkerSession(request);
    if (!medewerker) return geenMedewerkerToegang(request);

    const body = await request.json().catch(() => null);
    const dienst_id = body && typeof body === "object" ? (body as { dienst_id?: unknown }).dienst_id : undefined;

    if (!dienst_id || typeof dienst_id !== "string") {
      return NextResponse.json({ error: "Dienst ID is verplicht" }, { status: 400 });
    }

    // Capaciteit, dubbele aanmelding (ook 23505), verlopen ID/werkvergunning en de bezetting
    // zitten in één gedeelde functie; insert-fouten worden niet meer genegeerd.
    const resultaat = await meldAan(medewerker.id, dienst_id, "aangemeld", { reactie: reactieUitBody(body) });
    if (!resultaat.ok) {
      return NextResponse.json(aanmeldFoutBody(resultaat), { status: resultaat.status });
    }

    // Zelfde melding als de aanmeldactie in /api/medewerker/diensten: de app meldt zich via deze route aan.
    after(() =>
      notifyKlantNieuweAanmelding(medewerker.id, dienst_id).catch((e) =>
        captureRouteError(e, { route: "/api/medewerker/shifts/aanmelden", action: "PUSH" }),
      ),
    );

    return NextResponse.json({ success: true, aanmelding_id: resultaat.aanmeldingId });
  } catch (error) {
    captureRouteError(error, { route: "/api/medewerker/shifts/aanmelden", action: "POST" });
    // console.error("[SHIFTS AANMELDEN] Error:", error);
    return NextResponse.json({ error: "Er ging iets mis bij het aanmelden" }, { status: 500 });
  }
}
