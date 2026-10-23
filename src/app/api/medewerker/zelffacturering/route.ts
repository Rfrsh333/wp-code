import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { supabaseAdmin } from "@/lib/supabase";
import { getMedewerkerSession } from "@/lib/portal-auth";
import { geenMedewerkerToegang } from "@/lib/medewerker/sessie-boete";
import { logAuditEvent } from "@/lib/audit-log";
import { getClientIP } from "@/lib/rate-limit-redis";
import { captureRouteError } from "@/lib/sentry-utils";
import { getFactuurConfig } from "@/lib/factuur-config";
import { isOntbrekendeKolom } from "@/lib/db-kolom-fallback";
import { isZelffactureringActief, uitbetaalTermijnWerkdagen } from "@/lib/uitbetaling/config";
import { ZELFFACTURERING_VERSIE, zelffactureringTekst } from "@/content/zelffacturering-akkoord";

/**
 * Stap 6 "Geld": het akkoord zelffacturering lezen (GET), geven (POST) en intrekken (DELETE).
 * Zelfde patroon als /api/medewerker/overeenkomst: de tekst en versie komen van de server, het
 * akkoord wordt opgeslagen met tijdstip en versie, en bij een nieuwe versie is opnieuw akkoord nodig.
 *
 * Contract (web en app):
 *   GET → 200 {
 *     actief: boolean,            // false = ZELFFACTURERING_ACTIEF staat uit: toon "binnenkort"
 *     beschikbaar: boolean,       // false = akkoord geven kan (nog) niet (vlag uit, migratie of termijn ontbreekt)
 *     versie, concept: boolean, titel, secties: [{ titel, tekst }], akkoordzin,
 *     akkoord_op, akkoord_versie, akkoord_nodig: boolean, ingetrokken_op
 *   }
 *   POST { versie } → 200 { success, akkoord_op, versie }
 *                    · 403 { code: "zelffacturering_niet_actief" } · 409 versie gewijzigd · 503 niet beschikbaar
 *   DELETE          → 200 { success, ingetrokken_op } · 404 geen akkoord om in te trekken
 *   401 sessie ongeldig · 403 { code: "account_gepauzeerd" }
 */

const AKKOORD_KOLOMMEN = "zelffacturering_akkoord_op, zelffacturering_akkoord_versie, zelffacturering_ingetrokken_op";

async function haalGegevens(id: string) {
  const volledig = await supabaseAdmin.from("medewerkers").select(`naam, kvk_nummer, ${AKKOORD_KOLOMMEN}`).eq("id", id).maybeSingle();
  if (!isOntbrekendeKolom(volledig.error)) {
    if (volledig.error) throw volledig.error;
    return { rij: (volledig.data ?? {}) as Record<string, string | null>, migratieOntbreekt: false };
  }
  const basis = await supabaseAdmin.from("medewerkers").select("naam").eq("id", id).maybeSingle();
  return { rij: (basis.data ?? {}) as Record<string, string | null>, migratieOntbreekt: true };
}

function tekstVoor(rij: Record<string, string | null>, naamSessie: string) {
  const config = getFactuurConfig();
  return zelffactureringTekst({
    naam: rij.naam ?? naamSessie,
    kvk_nummer: rij.kvk_nummer ?? null,
    afnemer_naam: config.bedrijfsnaam,
    afnemer_kvk: config.kvk,
    contact_email: config.email,
    termijn_werkdagen: uitbetaalTermijnWerkdagen(),
  });
}

export async function GET(request: NextRequest) {
  try {
    const medewerker = await getMedewerkerSession(request);
    if (!medewerker) return geenMedewerkerToegang(request);

    const actief = isZelffactureringActief();
    const { rij, migratieOntbreekt } = await haalGegevens(medewerker.id);
    const akkoordOp = rij.zelffacturering_akkoord_op ?? null;
    const akkoordVersie = rij.zelffacturering_akkoord_versie ?? null;

    return NextResponse.json(
      {
        actief,
        beschikbaar: actief && !migratieOntbreekt && uitbetaalTermijnWerkdagen() != null,
        ...tekstVoor(rij, medewerker.naam),
        akkoord_op: akkoordOp,
        akkoord_versie: akkoordVersie,
        akkoord_nodig: !(akkoordOp && akkoordVersie === ZELFFACTURERING_VERSIE),
        ingetrokken_op: rij.zelffacturering_ingetrokken_op ?? null,
      },
      { headers: { "Cache-Control": "private, no-store" } },
    );
  } catch (error) {
    captureRouteError(error, { route: "/api/medewerker/zelffacturering", action: "GET" });
    return NextResponse.json({ error: "Er ging iets mis" }, { status: 500 });
  }
}

const schema = z.object({ versie: z.string().min(1).max(100) });

export async function POST(request: NextRequest) {
  try {
    const medewerker = await getMedewerkerSession(request);
    if (!medewerker) return geenMedewerkerToegang(request);

    if (!isZelffactureringActief()) {
      return NextResponse.json(
        { error: "Zelffacturering is nog niet beschikbaar.", code: "zelffacturering_niet_actief" },
        { status: 403 },
      );
    }
    // Zonder vastgestelde betaaltermijn is de tekst niet compleet: dan geen akkoord.
    if (uitbetaalTermijnWerkdagen() == null) {
      return NextResponse.json({ error: "Akkoord geven kan nog niet. Probeer het later opnieuw." }, { status: 503 });
    }

    const parsed = schema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) return NextResponse.json({ error: "Versie van de tekst ontbreekt" }, { status: 400 });
    if (parsed.data.versie !== ZELFFACTURERING_VERSIE) {
      return NextResponse.json(
        { error: "De tekst is intussen gewijzigd. Lees de nieuwe versie en ga opnieuw akkoord.", versie: ZELFFACTURERING_VERSIE },
        { status: 409 },
      );
    }

    const akkoordOp = new Date().toISOString();
    const { error } = await supabaseAdmin
      .from("medewerkers")
      .update({ zelffacturering_akkoord_op: akkoordOp, zelffacturering_akkoord_versie: ZELFFACTURERING_VERSIE })
      .eq("id", medewerker.id);
    if (isOntbrekendeKolom(error)) {
      return NextResponse.json({ error: "Akkoord geven kan nog niet. Probeer het later opnieuw." }, { status: 503 });
    }
    if (error) throw error;

    await logAuditEvent({
      actorEmail: medewerker.email,
      action: "medewerker_zelffacturering_akkoord",
      targetTable: "medewerkers",
      targetId: medewerker.id,
      summary: `Akkoord op zelffacturering (${ZELFFACTURERING_VERSIE})`,
      metadata: { versie: ZELFFACTURERING_VERSIE, akkoord_op: akkoordOp, ip: getClientIP(request) },
    });

    return NextResponse.json({ success: true, akkoord_op: akkoordOp, versie: ZELFFACTURERING_VERSIE });
  } catch (error) {
    captureRouteError(error, { route: "/api/medewerker/zelffacturering", action: "POST" });
    return NextResponse.json({ error: "Er ging iets mis" }, { status: 500 });
  }
}

/** Akkoord intrekken. Kan altijd (ook met de vlag uit): intrekken mag nooit geblokkeerd worden. */
export async function DELETE(request: NextRequest) {
  try {
    const medewerker = await getMedewerkerSession(request);
    if (!medewerker) return geenMedewerkerToegang(request);

    const ingetrokkenOp = new Date().toISOString();
    const { data, error } = await supabaseAdmin
      .from("medewerkers")
      .update({ zelffacturering_akkoord_op: null, zelffacturering_akkoord_versie: null, zelffacturering_ingetrokken_op: ingetrokkenOp })
      .eq("id", medewerker.id)
      .not("zelffacturering_akkoord_op", "is", null)
      .select("id")
      .maybeSingle();
    if (isOntbrekendeKolom(error)) return NextResponse.json({ error: "Er is geen akkoord om in te trekken." }, { status: 404 });
    if (error) throw error;
    if (!data) return NextResponse.json({ error: "Er is geen akkoord om in te trekken." }, { status: 404 });

    await logAuditEvent({
      actorEmail: medewerker.email,
      action: "medewerker_zelffacturering_ingetrokken",
      targetTable: "medewerkers",
      targetId: medewerker.id,
      summary: "Akkoord op zelffacturering ingetrokken",
      metadata: { ingetrokken_op: ingetrokkenOp, ip: getClientIP(request) },
    });

    return NextResponse.json({ success: true, ingetrokken_op: ingetrokkenOp });
  } catch (error) {
    captureRouteError(error, { route: "/api/medewerker/zelffacturering", action: "DELETE" });
    return NextResponse.json({ error: "Er ging iets mis" }, { status: 500 });
  }
}
