import { NextRequest, NextResponse } from "next/server";
import { getMedewerkerSession } from "@/lib/portal-auth";
import { geenMedewerkerToegang } from "@/lib/medewerker/sessie-boete";
import { checkRedisRateLimit, idCheckRateLimit } from "@/lib/rate-limit-redis";
import { captureRouteError } from "@/lib/sentry-utils";
import { haalKritiekeDocumenten } from "@/lib/medewerker/kritieke-documenten";
import { heeftGeldigId } from "@/lib/medewerker/reageer-checklist";
import { nlVandaag } from "@/lib/nl-tijd";
import { siteUrl } from "@/lib/id-check/config";
import { isDiditActiefVoorMedewerker } from "@/lib/id-check/actief";
import { DiditFout, maakDiditSessie } from "@/lib/id-check/didit-api";
import { haalLaatsteIdCheck, IdCheckMigratieOntbreekt, slaSessieOp } from "@/lib/id-check/db";
import { kiesCallback } from "@/lib/id-check/regels";
import { kopieNodig } from "@/lib/id-check/controlerecord";

/**
 * ID-controle via Didit voor de ingelogde medewerker (webportaal: cookie; app: Bearer).
 *
 * GET  → 200 { actief: true, id_ok, status, methode, reden, vervaldatum, kopie_nodig, bijgewerkt_op }
 *        status ∈ null | gestart | bezig | handmatig | videocall_gevraagd | goedgekeurd | afgewezen | verlopen
 *        reden alleen bij afgewezen (tekst van de admin).
 *        kopie_nodig: nationaliteit buiten de EER/Zwitserland (Wav art. 15): de werknemer mag en moet
 *        dan een kopie van zijn ID uploaden bij Documenten (POST /api/medewerker/documenten).
 *        404 { actief: false } als de functie uit staat (ID_CHECK_DIDIT_ACTIEF of sleutels ontbreken).
 * POST { callback?: "toptalent://…" }
 *      → 200 { url, status }: open `url` (hosted Didit-flow; op een computer toont Didit een QR-code
 *        voor de telefoon). Na afloop stuurt Didit terug naar de callback (web: /medewerker/documenten/)
 *        met ?verificationSessionId=…&status=….
 *      → 409 { code: "in_controle" } als een admin de vorige controle nog beoordeelt.
 *      → 429 te vaak · 502 Didit gaf een fout · 503 functie uit of migratie ontbreekt.
 *
 * Naar Didit gaat alleen het medewerker-id als vendor_data: geen naam of e-mail.
 */

const UIT = { actief: false, error: "De ID-controle via Didit staat (nog) niet aan." };
const MIGRATIE = { actief: false, error: "De ID-controle is nog niet beschikbaar." };

export async function GET(request: NextRequest) {
  try {
    const medewerker = await getMedewerkerSession(request);
    if (!medewerker) return geenMedewerkerToegang(request);
    if (!(await isDiditActiefVoorMedewerker(medewerker.id))) return NextResponse.json(UIT, { status: 404 });

    const [rij, documenten] = await Promise.all([
      haalLaatsteIdCheck(medewerker.id),
      haalKritiekeDocumenten([medewerker.id]),
    ]);
    return NextResponse.json(
      {
        actief: true,
        id_ok: heeftGeldigId(documenten.get(medewerker.id) ?? [], nlVandaag()),
        status: rij?.status ?? null,
        methode: rij?.methode ?? null,
        reden: rij?.status === "afgewezen" ? (rij.reden ?? null) : null,
        vervaldatum: rij?.status === "goedgekeurd" ? (rij.vervaldatum ?? null) : null,
        kopie_nodig: kopieNodig(rij),
        bijgewerkt_op: rij?.bijgewerkt_op ?? null,
      },
      { headers: { "Cache-Control": "private, no-store" } },
    );
  } catch (error) {
    if (error instanceof IdCheckMigratieOntbreekt) return NextResponse.json(MIGRATIE, { status: 503 });
    captureRouteError(error, { route: "/api/medewerker/id-check", action: "GET" });
    return NextResponse.json({ error: "Er ging iets mis" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const medewerker = await getMedewerkerSession(request);
    if (!medewerker) return geenMedewerkerToegang(request);
    if (!(await isDiditActiefVoorMedewerker(medewerker.id))) return NextResponse.json(UIT, { status: 503 });

    const limiet = await checkRedisRateLimit(`id-check:${medewerker.id}`, idCheckRateLimit);
    if (!limiet.success) {
      return NextResponse.json({ error: "Je hebt het te vaak geprobeerd. Probeer het over een uur opnieuw." }, { status: 429 });
    }

    const body = (await request.json().catch(() => ({}))) as { callback?: unknown };

    const vorige = await haalLaatsteIdCheck(medewerker.id);
    if (vorige?.status === "handmatig") {
      return NextResponse.json(
        { code: "in_controle", error: "We controleren je ID al. Je hoeft niets te doen." },
        { status: 409 },
      );
    }

    let sessie;
    try {
      sessie = await maakDiditSessie({ medewerkerId: medewerker.id, callback: kiesCallback(body.callback, siteUrl()) });
    } catch (fout) {
      captureRouteError(fout, { route: "/api/medewerker/id-check", action: fout instanceof DiditFout ? fout.actie : "DIDIT" });
      return NextResponse.json(
        { error: "De ID-controle kon niet worden gestart. Probeer het later opnieuw." },
        { status: 502 },
      );
    }

    await slaSessieOp(medewerker.id, sessie);
    return NextResponse.json({ url: sessie.url, status: "gestart" }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    if (error instanceof IdCheckMigratieOntbreekt) return NextResponse.json(MIGRATIE, { status: 503 });
    captureRouteError(error, { route: "/api/medewerker/id-check", action: "POST" });
    return NextResponse.json({ error: "Er ging iets mis" }, { status: 500 });
  }
}
