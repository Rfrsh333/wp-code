import { after, NextRequest, NextResponse } from "next/server";
import { getMedewerkerSession } from "@/lib/portal-auth";
import { geenMedewerkerToegang } from "@/lib/medewerker/sessie-boete";
import { captureRouteError } from "@/lib/sentry-utils";
import { meldAan, aanmeldFoutBody } from "@/lib/medewerker/aanmelden";
import { notifyKlantNieuweAanmelding } from "@/lib/dienst-push-triggers";

export async function POST(request: NextRequest) {
  try {
    const medewerker = await getMedewerkerSession(request);
    if (!medewerker) return geenMedewerkerToegang(request);

    const { dienst_id } = await request.json();

    if (!dienst_id) {
      return NextResponse.json({ error: "Dienst ID is verplicht" }, { status: 400 });
    }

    // Capaciteit, dubbele aanmelding (ook 23505), verlopen ID/werkvergunning en de bezetting
    // zitten in één gedeelde functie; insert-fouten worden niet meer genegeerd.
    const resultaat = await meldAan(medewerker.id, dienst_id, "aangemeld");
    if (!resultaat.ok) {
      return NextResponse.json(aanmeldFoutBody(resultaat), { status: resultaat.status });
    }

    // Zelfde melding als de aanmeldactie in /api/medewerker/diensten: de app meldt zich via deze route aan.
    after(() =>
      notifyKlantNieuweAanmelding(medewerker.id, dienst_id).catch((e) =>
        captureRouteError(e, { route: "/api/medewerker/shifts/aanmelden", action: "PUSH" }),
      ),
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    captureRouteError(error, { route: "/api/medewerker/shifts/aanmelden", action: "POST" });
    // console.error("[SHIFTS AANMELDEN] Error:", error);
    return NextResponse.json({ error: "Er ging iets mis bij het aanmelden" }, { status: 500 });
  }
}
