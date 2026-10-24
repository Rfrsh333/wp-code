import { NextRequest, NextResponse } from "next/server";
import { hasRequiredAdminRole, verifyAdmin } from "@/lib/admin-auth";
import { logAuditEvent } from "@/lib/audit-log";
import { captureRouteError } from "@/lib/sentry-utils";
import { nlVandaag } from "@/lib/nl-tijd";
import { IdCheckMigratieOntbreekt } from "@/lib/id-check/db";
import { bekijkKopie, haalOpschoonOverzicht, OpschoonFout, schoonKopieOp } from "@/lib/id-check/opschonen";

/**
 * Opschoontool voor oude ID-kopieën (juridisch advies punt 4, 24-10-2026). Alleen owner en
 * operations, zoals de andere beheeracties die data verwijderen.
 *
 * GET  → 200 { migratie, items: OpschoonItem[], log: OpschoonLogRegel[] }
 *        migratie = false zolang 20261024_id_controlerecord_wav.sql niet gedraaid is (dan niets te doen).
 * POST { actie: "bekijk", bron, document_id } → 200 { url } (5 minuten geldig, komt in de audit-log)
 * POST { actie: "opschonen", bron, document_id, documentsoort?, nationaliteit?, vervaldatum?, naam?,
 *        geboortedatum?, documentnummer?, bsn_zichtbaar? }
 *      → 200 { reden, uitleg, kopie, rij, record_id, bewaar_tot, opslag }
 *      → 400 invoer · 403 rol · 404/409 regel weg of al gedaan · 502 Storage · 503 migratie ontbreekt
 */

const ROLLEN = ["owner", "operations"] as const;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const GEEN_CACHE = { "Cache-Control": "private, no-store" };

async function toegang(request: NextRequest) {
  const { isAdmin, email, role } = await verifyAdmin(request);
  if (!isAdmin) return { fout: NextResponse.json({ error: "Unauthorized - Admin access required" }, { status: 403 }) };
  if (!hasRequiredAdminRole(role, [...ROLLEN])) {
    return { fout: NextResponse.json({ error: "Alleen de eigenaar of operations kan ID-kopieën opschonen" }, { status: 403 }) };
  }
  return { email: email ?? "admin", role };
}

function foutAntwoord(fout: unknown, actie: string) {
  if (fout instanceof OpschoonFout) return NextResponse.json({ error: fout.message }, { status: fout.status });
  if (fout instanceof IdCheckMigratieOntbreekt) {
    return NextResponse.json({ error: "Migratie 20261024_id_controlerecord_wav.sql ontbreekt" }, { status: 503 });
  }
  captureRouteError(fout, { route: "/api/admin/id-kopieen", action: actie });
  return NextResponse.json({ error: "Er is een fout opgetreden" }, { status: 500 });
}

export async function GET(request: NextRequest) {
  const t = await toegang(request);
  if ("fout" in t) return t.fout;
  try {
    const { items, log } = await haalOpschoonOverzicht();
    await logAuditEvent({
      actorEmail: t.email,
      actorRole: t.role,
      action: "admin_id_kopieen_bekeken",
      targetTable: "medewerker_documenten",
      summary: "Inventaris oude ID-kopieën bekeken",
      metadata: { count: items.length },
    });
    return NextResponse.json({ migratie: true, items, log }, { headers: GEEN_CACHE });
  } catch (fout) {
    if (fout instanceof IdCheckMigratieOntbreekt) {
      return NextResponse.json({ migratie: false, items: [], log: [] }, { headers: GEEN_CACHE });
    }
    return foutAntwoord(fout, "GET");
  }
}

export async function POST(request: NextRequest) {
  const t = await toegang(request);
  if ("fout" in t) return t.fout;

  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  const bron = body?.bron;
  const documentId = body?.document_id;
  if (!body || (bron !== "medewerker" && bron !== "kandidaat") || typeof documentId !== "string" || !UUID.test(documentId)) {
    return NextResponse.json({ error: "Ongeldig verzoek" }, { status: 400 });
  }

  try {
    if (body.actie === "bekijk") {
      const url = await bekijkKopie({ bron, documentId, door: t.email, rol: t.role });
      return NextResponse.json({ url }, { headers: GEEN_CACHE });
    }
    if (body.actie === "opschonen") {
      const resultaat = await schoonKopieOp({ bron, documentId, invoer: body, door: t.email, rol: t.role, vandaag: nlVandaag() });
      return NextResponse.json(
        {
          reden: resultaat.beslissing.reden,
          uitleg: resultaat.uitleg,
          kopie: resultaat.beslissing.kopie,
          rij: resultaat.beslissing.rij,
          record_id: resultaat.record_id,
          bewaar_tot: resultaat.bewaar_tot,
          opslag: resultaat.opslag,
        },
        { headers: GEEN_CACHE },
      );
    }
    return NextResponse.json({ error: "Onbekende actie" }, { status: 400 });
  } catch (fout) {
    return foutAntwoord(fout, String(body.actie ?? "POST").toUpperCase());
  }
}
