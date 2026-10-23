import { NextRequest, NextResponse } from "next/server";
import { captureRouteError } from "@/lib/sentry-utils";
import { haalMeldingGebruiker } from "@/lib/meldingen/meldingen-gebruiker";
import { telOngelezenTotaal } from "@/lib/meldingen/meldingen-opslag";
import { leesRol } from "@/lib/meldingen/meldingen-regels";

/**
 * GET /api/meldingen/aantal?rol=  → { totaal, beschikbaar }
 * Lichtgewicht (één telling) voor de badge op de bel. Zonder migratie: { totaal: 0, beschikbaar: false }.
 */
export async function GET(request: NextRequest) {
  const rol = leesRol(request.nextUrl.searchParams.get("rol"));
  if (!rol.ok) return NextResponse.json({ error: "Ongeldige rol" }, { status: 400 });

  const gebruiker = await haalMeldingGebruiker(request, rol.rol);
  if (!gebruiker) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { beschikbaar, totaal } = await telOngelezenTotaal(gebruiker);
    return NextResponse.json({ totaal, beschikbaar }, { headers: { "Cache-Control": "no-store" } });
  } catch (e) {
    captureRouteError(e, { route: "/api/meldingen/aantal", action: "GET" });
    return NextResponse.json({ error: "Aantal ophalen mislukt" }, { status: 500 });
  }
}
