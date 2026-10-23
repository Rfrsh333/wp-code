import { NextRequest, NextResponse } from "next/server";
import { hasRequiredAdminRole, verifyAdmin } from "@/lib/admin-auth";
import { logAuditEvent } from "@/lib/audit-log";
import { stuurKlantUitnodiging } from "@/lib/klant-uitnodiging";
import { captureRouteError } from "@/lib/sentry-utils";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * POST /api/admin/klanten/[id]/uitnodigen
 * Body (optioneel): { heractiveren?: boolean }
 *
 * Stuurt de klant (opnieuw) de mail "wachtwoord instellen" (7 dagen geldig, werkt één keer).
 * Een eerdere uitnodigings- of resetlink vervalt daarmee. Een inactief account wordt alleen
 * geheractiveerd als de admin daar uitdrukkelijk voor kiest (`heractiveren: true`).
 */
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { isAdmin, email, role } = await verifyAdmin(request);
  if (!isAdmin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!hasRequiredAdminRole(role, ["owner", "operations", "recruiter"])) {
    return NextResponse.json({ error: "Onvoldoende rechten om klanten uit te nodigen" }, { status: 403 });
  }

  const { id } = await params;
  if (!UUID.test(id)) return NextResponse.json({ error: "Ongeldige klant" }, { status: 400 });

  const body = await request.json().catch(() => ({}));
  const heractiveren = body?.heractiveren === true;

  try {
    const resultaat = await stuurKlantUitnodiging(id, { heractiveren, route: "/api/admin/klanten/[id]/uitnodigen" });

    if (!resultaat.ok) {
      const status =
        resultaat.reden === "niet_gevonden" ? 404 :
        resultaat.reden === "niet_beschikbaar" ? 503 :
        resultaat.reden === "mail_mislukt" ? 502 : 409;
      return NextResponse.json({ error: resultaat.melding, reden: resultaat.reden }, { status });
    }

    await logAuditEvent({
      actorEmail: email,
      actorRole: role,
      action: heractiveren ? "klant_heractiveren_uitnodigen" : "klant_uitnodigen",
      targetTable: "klanten",
      targetId: id,
      summary: heractiveren ? "Klant geheractiveerd en uitgenodigd" : "Uitnodiging (wachtwoord instellen) verstuurd",
    });

    return NextResponse.json({ success: true, email: resultaat.email, geldig_tot: resultaat.geldigTot });
  } catch (error) {
    captureRouteError(error, { route: "/api/admin/klanten/[id]/uitnodigen", action: "POST" });
    return NextResponse.json({ error: "Uitnodigen mislukt" }, { status: 500 });
  }
}
