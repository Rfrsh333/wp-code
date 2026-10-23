import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { verifyAdmin, hasRequiredAdminRole } from "@/lib/admin-auth";
import { logAuditEvent } from "@/lib/audit-log";
import { captureRouteError } from "@/lib/sentry-utils";
import { schrijfMetKolomFallback } from "@/lib/db-kolom-fallback";

/**
 * Markeer een factuur handmatig als betaald.
 *
 * Voorheen werd een factuur nergens op 'betaald' gezet (geen bankreconciliatie), waardoor
 * de herinneringen-cron betalende klanten bleef aanmanen en het klant-dashboard elke
 * factuur eeuwig als 'open' toonde (audit P1-11).
 *
 * Stap 6 "Geld": dit is ook HET moment waarop uren uitbetaalbaar worden (uitbetalen pas na betaling
 * door de werkgever). Daarom leggen we vast wanneer (betaald_op, start van de uitbetaaltermijn).
 * Zonder migratie 20261024 bestaat betaald_op nog niet; dan alleen de status, zoals voorheen.
 */
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { isAdmin, email, role } = await verifyAdmin(request);
    if (!isAdmin) {
      return NextResponse.json({ error: "Unauthorized - Admin access required" }, { status: 403 });
    }
    // Geld-actie: alleen owner/finance.
    if (!hasRequiredAdminRole(role, ["owner", "finance"])) {
      return NextResponse.json({ error: "Onvoldoende rechten — finance vereist" }, { status: 403 });
    }

    const { id } = await params;

    // Idempotent: alleen bijwerken als de factuur nog niet op 'betaald' staat.
    const { data, error } = await schrijfMetKolomFallback<{ id: string; factuur_nummer: string }>(
      { status: "betaald", betaald_op: new Date().toISOString() },
      ["betaald_op"],
      (rij) =>
        supabaseAdmin
          .from("facturen")
          .update(rij)
          .eq("id", id)
          .neq("status", "betaald")
          .select("id, factuur_nummer")
          .maybeSingle(),
    );

    if (error) {
      captureRouteError(error, { route: "/api/facturen/[id]/betaald", action: "POST" });
      return NextResponse.json({ error: "Bijwerken mislukt" }, { status: 500 });
    }

    if (data) {
      await logAuditEvent({
        action: "factuur_gemarkeerd_betaald",
        targetTable: "facturen",
        targetId: id,
        summary: `Factuur ${data.factuur_nummer} handmatig op betaald gezet door ${email || "admin"}`,
        actorEmail: email,
        actorRole: role,
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    captureRouteError(error, { route: "/api/facturen/[id]/betaald", action: "POST" });
    return NextResponse.json({ error: "Er ging iets mis" }, { status: 500 });
  }
}
