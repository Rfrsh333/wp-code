import { NextRequest, NextResponse } from "next/server";
import { getMedewerkerSession } from "@/lib/portal-auth";
import { captureRouteError } from "@/lib/sentry-utils";
import { meldAan } from "@/lib/medewerker/aanmelden";

export async function POST(request: NextRequest) {
  try {
    const medewerker = await getMedewerkerSession(request);
    if (!medewerker) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { dienst_id } = await request.json();

    if (!dienst_id) {
      return NextResponse.json({ error: "Dienst ID is verplicht" }, { status: 400 });
    }

    // Capaciteit, dubbele aanmelding (ook 23505), verlopen ID/werkvergunning en de bezetting
    // zitten in één gedeelde functie; insert-fouten worden niet meer genegeerd.
    const resultaat = await meldAan(medewerker.id, dienst_id, "aangemeld");
    if (!resultaat.ok) {
      return NextResponse.json({ error: resultaat.error }, { status: resultaat.status });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    captureRouteError(error, { route: "/api/medewerker/shifts/aanmelden", action: "POST" });
    // console.error("[SHIFTS AANMELDEN] Error:", error);
    return NextResponse.json({ error: "Er ging iets mis bij het aanmelden" }, { status: 500 });
  }
}
