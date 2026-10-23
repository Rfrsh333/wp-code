import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { supabaseAdmin } from "@/lib/supabase";
import { getMedewerkerSession } from "@/lib/portal-auth";
import { geenMedewerkerToegang } from "@/lib/medewerker/sessie-boete";
import { decryptField } from "@/lib/encryption";
import { logAuditEvent } from "@/lib/audit-log";
import { getClientIP } from "@/lib/rate-limit-redis";
import { captureRouteError } from "@/lib/sentry-utils";
import { OVEREENKOMST_VERSIE, overeenkomstVoorMedewerker } from "@/content/overeenkomst-van-opdracht";

/**
 * B1: de overeenkomst van opdracht lezen (GET) en er akkoord op geven (POST). Het akkoord wordt
 * opgeslagen met tijdstip en versie; bij een nieuwe versie is opnieuw akkoord nodig.
 *   GET  → { versie, titel, secties: [{ titel, tekst }], akkoord_op, akkoord_versie, akkoord_nodig }
 *   POST { versie } → { success, akkoord_op, versie } · 409 als de versie intussen is gewijzigd
 */

const isOntbrekendeKolom = (e: { code?: string } | null) => e?.code === "42703";

async function haalGegevens(id: string) {
  const volledig = await supabaseAdmin
    .from("medewerkers")
    .select("naam, geboortedatum, adres, postcode, stad, kvk_nummer, btw_nummer, overeenkomst_akkoord_op, overeenkomst_akkoord_versie")
    .eq("id", id)
    .maybeSingle();
  if (!isOntbrekendeKolom(volledig.error)) return { data: volledig.data as Record<string, string | null> | null, migratieOntbreekt: false };
  const basis = await supabaseAdmin.from("medewerkers").select("naam, geboortedatum, stad, btw_nummer").eq("id", id).maybeSingle();
  return { data: basis.data as Record<string, string | null> | null, migratieOntbreekt: true };
}

export async function GET(request: NextRequest) {
  try {
    const medewerker = await getMedewerkerSession(request);
    if (!medewerker) return geenMedewerkerToegang(request);

    const { data } = await haalGegevens(medewerker.id);
    const rij = data ?? {};
    const adres = [rij.adres, [rij.postcode, rij.stad].filter(Boolean).join(" ")].filter(Boolean).join(", ");
    const tekst = overeenkomstVoorMedewerker({
      opdrachtnemer_naam: rij.naam ?? medewerker.naam,
      geboortedatum: rij.geboortedatum ?? null,
      adres: adres || null,
      kvk_nummer: rij.kvk_nummer ?? null,
      btw_nummer: decryptField(rij.btw_nummer ?? null),
    });

    return NextResponse.json(
      {
        ...tekst,
        akkoord_op: rij.overeenkomst_akkoord_op ?? null,
        akkoord_versie: rij.overeenkomst_akkoord_versie ?? null,
        akkoord_nodig: !(rij.overeenkomst_akkoord_op && rij.overeenkomst_akkoord_versie === OVEREENKOMST_VERSIE),
      },
      { headers: { "Cache-Control": "private, no-store" } },
    );
  } catch (error) {
    captureRouteError(error, { route: "/api/medewerker/overeenkomst", action: "GET" });
    return NextResponse.json({ error: "Er ging iets mis" }, { status: 500 });
  }
}

const schema = z.object({ versie: z.string().min(1).max(100) });

export async function POST(request: NextRequest) {
  try {
    const medewerker = await getMedewerkerSession(request);
    if (!medewerker) return geenMedewerkerToegang(request);

    const parsed = schema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) return NextResponse.json({ error: "Versie van de overeenkomst ontbreekt" }, { status: 400 });
    if (parsed.data.versie !== OVEREENKOMST_VERSIE) {
      return NextResponse.json(
        { error: "De overeenkomst is intussen gewijzigd. Lees de nieuwe versie en ga opnieuw akkoord.", versie: OVEREENKOMST_VERSIE },
        { status: 409 },
      );
    }

    const akkoordOp = new Date().toISOString();
    const { error } = await supabaseAdmin
      .from("medewerkers")
      .update({ overeenkomst_akkoord_op: akkoordOp, overeenkomst_akkoord_versie: OVEREENKOMST_VERSIE })
      .eq("id", medewerker.id);
    if (isOntbrekendeKolom(error) || error?.code === "PGRST204") {
      return NextResponse.json({ error: "Akkoord geven kan nog niet. Probeer het later opnieuw." }, { status: 503 });
    }
    if (error) throw error;

    await logAuditEvent({
      actorEmail: medewerker.email,
      action: "medewerker_overeenkomst_akkoord",
      targetTable: "medewerkers",
      targetId: medewerker.id,
      summary: `Akkoord op overeenkomst van opdracht (${OVEREENKOMST_VERSIE})`,
      metadata: { versie: OVEREENKOMST_VERSIE, akkoord_op: akkoordOp, ip: getClientIP(request) },
    });

    return NextResponse.json({ success: true, akkoord_op: akkoordOp, versie: OVEREENKOMST_VERSIE });
  } catch (error) {
    captureRouteError(error, { route: "/api/medewerker/overeenkomst", action: "POST" });
    return NextResponse.json({ error: "Er ging iets mis" }, { status: 500 });
  }
}
