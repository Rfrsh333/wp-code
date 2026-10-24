import { after, NextRequest, NextResponse } from "next/server";
import { captureRouteError } from "@/lib/sentry-utils";
import { diditConfig, isDiditActief } from "@/lib/id-check/config";
import { controleerDiditHandtekening } from "@/lib/id-check/handtekening";
import { IdCheckMigratieOntbreekt, verwerkDiditWebhook, verwijderSessieNaBeslissing, type DiditWebhook } from "@/lib/id-check/db";

/**
 * Didit-webhook (https://docs.didit.me/integration/webhooks).
 *
 * In de Didit-console registreren als https://www.toptalentjobs.nl/api/webhooks/didit/ — MET de
 * slash aan het eind: de site gebruikt trailingSlash: true en Didit volgt geen redirects. Events:
 * "status.updated" (en optioneel "data.updated"), webhook-versie v3.
 *
 * 1. Handtekening + tijdstempel controleren op de ruwe body (lib/id-check/handtekening).
 * 2. Idempotent verwerken (event_id en definitieve status, lib/id-check/db).
 * 3. Nooit de payload opslaan of loggen: daar kan een persoonsnummer/BSN in staan. Alleen de velden
 *    uit de witte lijst (verificatieUpdateNaBeoordeling) gaan de database in.
 * 4. Na een definitieve beslissing de sessie bij Didit verwijderen, ná het antwoord (Didit wacht
 *    maximaal 5 seconden op ons).
 *
 * 200 verwerkt · 401 handtekening/tijdstempel ongeldig · 400 geen JSON · 503 functie uit of migratie
 * ontbreekt (Didit probeert het dan nog 2 keer) · 500 fout (idem).
 */
export async function POST(request: NextRequest) {
  if (!isDiditActief()) {
    return NextResponse.json({ error: "ID-controle via Didit staat uit" }, { status: 503 });
  }

  const ruweBody = await request.text();
  const handtekening = controleerDiditHandtekening({
    ruweBody,
    headers: request.headers,
    geheim: diditConfig()?.webhookSecret,
    nuSeconden: Math.floor(Date.now() / 1000),
  });
  if (!handtekening.ok) {
    // Alleen de reden, nooit de body.
    console.warn(`[didit-webhook] geweigerd: ${handtekening.reden}`);
    return NextResponse.json({ error: "Ongeldige handtekening" }, { status: 401 });
  }

  let body: DiditWebhook;
  try {
    body = JSON.parse(ruweBody) as DiditWebhook;
  } catch {
    return NextResponse.json({ error: "Ongeldige JSON" }, { status: 400 });
  }

  try {
    const resultaat = await verwerkDiditWebhook(body);
    const verwijder = resultaat.verwijder;
    if (verwijder) {
      after(() => verwijderSessieNaBeslissing(verwijder.verificatieId, verwijder.sessionId));
    }
    return NextResponse.json({ ok: true, resultaat: resultaat.code });
  } catch (error) {
    if (error instanceof IdCheckMigratieOntbreekt) {
      captureRouteError(error, { route: "/api/webhooks/didit", action: "MIGRATIE" });
      return NextResponse.json({ error: "Migratie ontbreekt" }, { status: 503 });
    }
    // Alleen de fout zelf (eigen Error of databasefout), nooit de payload.
    captureRouteError(error, { route: "/api/webhooks/didit", action: "VERWERKEN" });
    return NextResponse.json({ error: "Verwerken mislukt" }, { status: 500 });
  }
}
