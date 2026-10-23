import { NextRequest, NextResponse } from "next/server";
import { hasRequiredAdminRole, verifyAdmin } from "@/lib/admin-auth";
import { logAuditEvent } from "@/lib/audit-log";
import { captureRouteError } from "@/lib/sentry-utils";
import { haalDienstenInControle, keurKlantGoed, wijsKlantDienstenAf } from "@/lib/klant-controle";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Eerste-dienstcontrole van zelf geregistreerde klanten (lib/klant-controle-regels.ts).
 * GET  → { klanten: [{ klant_id, klant, diensten }] } met alle diensten in status in_controle.
 * POST { klant_id, actie: "goedkeuren" | "afwijzen" }
 *   goedkeuren: klant gecontroleerd, diensten → open + push naar medewerkers; volgende diensten
 *               van deze klant gaan direct live.
 *   afwijzen:   diensten → geannuleerd, geen push; de klant blijft ongecontroleerd.
 */
export async function GET(request: NextRequest) {
  const { isAdmin } = await verifyAdmin(request);
  if (!isAdmin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    return NextResponse.json({ klanten: await haalDienstenInControle() });
  } catch (error) {
    captureRouteError(error, { route: "/api/admin/diensten/controle", action: "GET" });
    return NextResponse.json({ klanten: [], error: "Ophalen mislukt" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const { isAdmin, email, role } = await verifyAdmin(request);
  if (!isAdmin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!hasRequiredAdminRole(role, ["owner", "operations"])) {
    return NextResponse.json({ error: "Onvoldoende rechten" }, { status: 403 });
  }

  const body = await request.json().catch(() => ({}));
  const klantId = typeof body?.klant_id === "string" ? body.klant_id : "";
  const actie = body?.actie;
  if (!UUID.test(klantId) || (actie !== "goedkeuren" && actie !== "afwijzen")) {
    return NextResponse.json({ error: "klant_id en actie (goedkeuren of afwijzen) zijn verplicht" }, { status: 400 });
  }

  try {
    const aantal = actie === "goedkeuren" ? await keurKlantGoed(klantId) : await wijsKlantDienstenAf(klantId);
    await logAuditEvent({
      actorEmail: email,
      actorRole: role,
      action: actie === "goedkeuren" ? "eerste_dienst_goedkeuren" : "eerste_dienst_afwijzen",
      targetTable: "klanten",
      targetId: klantId,
      summary: actie === "goedkeuren" ? `Klant gecontroleerd, ${aantal} dienst(en) vrijgegeven` : `${aantal} dienst(en) in controle geannuleerd`,
    });
    return NextResponse.json({ success: true, aantal });
  } catch (error) {
    captureRouteError(error, { route: "/api/admin/diensten/controle", action: "POST" });
    return NextResponse.json({ error: "Opslaan mislukt" }, { status: 500 });
  }
}
