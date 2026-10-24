import { NextRequest, NextResponse } from "next/server";
import { verifyAdmin } from "@/lib/admin-auth";
import { logAuditEvent } from "@/lib/audit-log";
import { captureRouteError } from "@/lib/sentry-utils";
import { isDiditActief } from "@/lib/id-check/config";
import { haalOpenIdChecks, IdCheckMigratieOntbreekt } from "@/lib/id-check/db";
import { handmatigRedenLabel } from "@/lib/id-check/regels";

/**
 * GET — ID-checks die een mens moet beoordelen: Didit-uitslagen die niet automatisch goed konden
 * (status handmatig) en videocall-verzoeken. Beoordelen gaat via POST /api/admin/medewerkers met
 * action "beoordeel_id_check" of "id_videocall".
 *
 * 200 { actief, migratie, items: [...] } — `actief` = ID_CHECK_DIDIT_ACTIEF aan + sleutels gezet;
 * `migratie` = false als 20261024_id_verificaties_didit.sql nog niet gedraaid is (dan items leeg).
 */
export async function GET(request: NextRequest) {
  const { isAdmin, email, role } = await verifyAdmin(request);
  if (!isAdmin) {
    return NextResponse.json({ error: "Unauthorized - Admin access required" }, { status: 403 });
  }

  const actief = isDiditActief();
  try {
    const rijen = await haalOpenIdChecks();
    const items = rijen.map((r) => ({
      id: r.id,
      medewerker_id: r.medewerker_id,
      naam: r.medewerker?.naam ?? null,
      email: r.medewerker?.email ?? null,
      methode: r.methode,
      status: r.status,
      didit_status: r.didit_status,
      didit_sessienummer: r.didit_sessienummer,
      redenen: (r.handmatig_redenen ?? []).map((code) => ({ code, label: handmatigRedenLabel(code) })),
      vervaldatum: r.vervaldatum,
      eer: r.eer,
      naam_komt_overeen: r.naam_komt_overeen,
      documentsoort: r.documentsoort,
      uitgifteland: r.uitgifteland,
      aangemaakt_op: r.aangemaakt_op,
      bijgewerkt_op: r.bijgewerkt_op,
    }));

    if (items.length > 0) {
      await logAuditEvent({
        actorEmail: email,
        actorRole: role,
        action: "admin_id_checks_list",
        targetTable: "id_verificaties",
        summary: "Openstaande ID-checks bekeken",
        metadata: { count: items.length },
      });
    }

    return NextResponse.json({ actief, migratie: true, items }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    if (error instanceof IdCheckMigratieOntbreekt) {
      return NextResponse.json({ actief, migratie: false, items: [] }, { headers: { "Cache-Control": "private, no-store" } });
    }
    captureRouteError(error, { route: "/api/admin/medewerkers/id-checks", action: "GET" });
    return NextResponse.json({ error: "Er is een fout opgetreden" }, { status: 500 });
  }
}
