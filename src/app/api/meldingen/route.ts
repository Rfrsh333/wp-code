import { NextRequest, NextResponse } from "next/server";
import { captureRouteError } from "@/lib/sentry-utils";
import { haalMeldingGebruiker } from "@/lib/meldingen/meldingen-gebruiker";
import { haalMeldingen, telOngelezen } from "@/lib/meldingen/meldingen-opslag";
import { leesMeldingenVraag, leesRol } from "@/lib/meldingen/meldingen-regels";

/**
 * GET /api/meldingen?categorie=&voor=<cursor>&limiet=&rol=
 * Meldingencentrum voor medewerker én werkgever (cookie of Bearer). Contract: zie de PR van stap 5.
 *
 * - categorie: diensten | uren_geld | account (leeg of "alles" = alles)
 * - voor: `volgende_cursor` uit het vorige antwoord (nieuwste eerst)
 * - limiet: 1–50, standaard 20
 * - rol: medewerker | klant (optioneel; kiest de sessie als je in beide portalen bent ingelogd)
 *
 * Zonder migratie: 200 met `beschikbaar: false`, een lege lijst en nul ongelezen.
 */
const GEEN_CACHE = { "Cache-Control": "no-store" };

export async function GET(request: NextRequest) {
  const p = request.nextUrl.searchParams;
  const rol = leesRol(p.get("rol"));
  if (!rol.ok) return NextResponse.json({ error: "Ongeldige rol" }, { status: 400 });

  const gebruiker = await haalMeldingGebruiker(request, rol.rol);
  if (!gebruiker) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const vraag = leesMeldingenVraag({ categorie: p.get("categorie"), voor: p.get("voor"), limiet: p.get("limiet") });
  if (!vraag.ok) return NextResponse.json({ error: vraag.fout }, { status: 400 });

  try {
    const [lijst, tellingen] = await Promise.all([haalMeldingen(gebruiker, vraag.vraag), telOngelezen(gebruiker)]);
    return NextResponse.json(
      {
        beschikbaar: lijst.beschikbaar && tellingen.beschikbaar,
        meldingen: lijst.meldingen,
        volgende_cursor: lijst.volgende_cursor,
        ongelezen: tellingen.ongelezen,
      },
      { headers: GEEN_CACHE },
    );
  } catch (e) {
    captureRouteError(e, { route: "/api/meldingen", action: "GET" });
    return NextResponse.json({ error: "Meldingen ophalen mislukt" }, { status: 500 });
  }
}
