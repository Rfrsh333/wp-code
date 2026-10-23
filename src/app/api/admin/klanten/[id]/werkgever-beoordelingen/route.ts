import { NextRequest, NextResponse } from "next/server";
import { hasRequiredAdminRole, verifyAdmin } from "@/lib/admin-auth";
import { logAuditEvent } from "@/lib/audit-log";
import { captureRouteError } from "@/lib/sentry-utils";
import { haalWerkgeverBeoordelingenVoorAdmin, zetWerkgeverBeoordelingVerborgen } from "@/lib/medewerker/werkgever-beoordeling";
import { haalWerkgeverProfiel } from "@/lib/werkgever-profiel";

/**
 * Beoordelingen van een werkgever door medewerkers, voor TopTalent (stap 4 "Vertrouwen zoals YoungOnes").
 *
 *   GET                                   → { beschikbaar, profiel, beoordelingen: AdminWerkgeverBeoordeling[] }
 *                                           profiel = wat medewerkers en de werkgever zien; de lijst met
 *                                           naam medewerker, dienst en opmerking is alleen voor TopTalent
 *   PATCH { beoordeling_id, verborgen }   → { success, id, verborgen_op }
 *                                           moderatie: een verborgen beoordeling telt nergens mee
 *
 * Verbergen mag owner of operations; elke wijziging komt in de audit-log.
 */

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const ROUTE = "/api/admin/klanten/[id]/werkgever-beoordelingen";

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { isAdmin } = await verifyAdmin(request);
  if (!isAdmin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const { id } = await params;
    if (!UUID.test(id)) return NextResponse.json({ error: "Klant niet gevonden" }, { status: 404 });
    const [lijst, profiel] = await Promise.all([haalWerkgeverBeoordelingenVoorAdmin(id), haalWerkgeverProfiel(id)]);
    return NextResponse.json({ ...lijst, profiel }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    captureRouteError(error, { route: ROUTE, action: "GET" });
    return NextResponse.json({ error: "Ophalen mislukt" }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { isAdmin, email, role } = await verifyAdmin(request);
  if (!isAdmin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!hasRequiredAdminRole(role, ["owner", "operations"])) {
    return NextResponse.json({ error: "Onvoldoende rechten" }, { status: 403 });
  }
  try {
    const { id } = await params;
    const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
    const beoordelingId = body?.beoordeling_id;
    if (!UUID.test(id) || typeof beoordelingId !== "string" || !UUID.test(beoordelingId) || typeof body?.verborgen !== "boolean") {
      return NextResponse.json({ error: "beoordeling_id en verborgen (true/false) zijn verplicht." }, { status: 400 });
    }
    const verborgen = body.verborgen;
    const { beschikbaar, bijgewerkt } = await zetWerkgeverBeoordelingVerborgen(id, beoordelingId, verborgen, email ?? null);
    if (!beschikbaar) {
      return NextResponse.json(
        { error: "Werkgevers beoordelen is nog niet beschikbaar.", code: "werkgever_beoordelingen_niet_beschikbaar" },
        { status: 503 },
      );
    }
    if (!bijgewerkt) return NextResponse.json({ error: "Beoordeling niet gevonden" }, { status: 404 });

    await logAuditEvent({
      actorEmail: email,
      actorRole: role,
      action: verborgen ? "werkgever_beoordeling_verborgen" : "werkgever_beoordeling_getoond",
      targetTable: "werkgever_beoordelingen",
      targetId: beoordelingId,
      summary: `Beoordeling van werkgever ${id} ${verborgen ? "verborgen" : "weer zichtbaar gemaakt"} door ${email || "admin"}`,
      metadata: { klant_id: id },
    });
    return NextResponse.json({ success: true, id: bijgewerkt.id, verborgen_op: bijgewerkt.verborgen_op });
  } catch (error) {
    captureRouteError(error, { route: ROUTE, action: "PATCH" });
    return NextResponse.json({ error: "Bijwerken mislukt" }, { status: 500 });
  }
}
