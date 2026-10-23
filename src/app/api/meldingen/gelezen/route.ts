import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { captureRouteError } from "@/lib/sentry-utils";
import { haalMeldingGebruiker } from "@/lib/meldingen/meldingen-gebruiker";
import { markeerGelezen, telOngelezen } from "@/lib/meldingen/meldingen-opslag";
import { isUuid, leesRol, MELDING_CATEGORIEEN } from "@/lib/meldingen/meldingen-regels";

/**
 * POST /api/meldingen/gelezen  (rol optioneel als ?rol= of in de body)
 *   { "id": "<uuid>" }                          één melding gelezen
 *   { "alles": true, "categorie"?: "diensten" } alles (of alles in één categorie) gelezen
 * Antwoord: { success, bijgewerkt, ongelezen: { totaal, per_categorie } }. Idempotent: een al
 * gelezen of onbekende melding geeft bijgewerkt 0. Alleen eigen meldingen.
 */
const schema = z.union([
  z.object({ id: z.string().refine(isUuid, "Ongeldig id"), rol: z.unknown().optional() }),
  z.object({
    alles: z.literal(true),
    categorie: z.enum(MELDING_CATEGORIEEN).nullish(),
    rol: z.unknown().optional(),
  }),
]);

export async function POST(request: NextRequest) {
  const body: unknown = await request.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Geef { id } of { alles: true, categorie? } mee" }, { status: 400 });
  }

  const rol = leesRol(request.nextUrl.searchParams.get("rol") ?? parsed.data.rol);
  if (!rol.ok) return NextResponse.json({ error: "Ongeldige rol" }, { status: 400 });

  const gebruiker = await haalMeldingGebruiker(request, rol.rol);
  if (!gebruiker) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const wat = "id" in parsed.data ? { id: parsed.data.id } : { alles: true as const, categorie: parsed.data.categorie ?? null };
    const resultaat = await markeerGelezen(gebruiker, wat);
    const tellingen = await telOngelezen(gebruiker);
    return NextResponse.json(
      {
        success: true,
        beschikbaar: resultaat.beschikbaar && tellingen.beschikbaar,
        bijgewerkt: resultaat.bijgewerkt,
        ongelezen: tellingen.ongelezen,
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (e) {
    captureRouteError(e, { route: "/api/meldingen/gelezen", action: "POST" });
    return NextResponse.json({ error: "Bijwerken mislukt" }, { status: 500 });
  }
}
