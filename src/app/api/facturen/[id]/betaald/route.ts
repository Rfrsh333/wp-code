import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { verifyAdmin } from "@/lib/admin-auth";
import { logAuditEvent } from "@/lib/audit-log";
import { captureRouteError } from "@/lib/sentry-utils";

/**
 * Markeer een factuur handmatig als betaald.
 *
 * Voorheen werd een factuur nergens op 'betaald' gezet (geen bankreconciliatie), waardoor
 * de herinneringen-cron betalende klanten bleef aanmanen en het klant-dashboard elke
 * factuur eeuwig als 'open' toonde (audit P1-11).
 */
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { isAdmin, email } = await verifyAdmin(request);
    if (!isAdmin) {
      return NextResponse.json({ error: "Unauthorized - Admin access required" }, { status: 403 });
    }

    const { id } = await params;

    // Idempotent: alleen bijwerken als de factuur nog niet op 'betaald' staat.
    const { data, error } = await supabaseAdmin
      .from("facturen")
      .update({ status: "betaald" })
      .eq("id", id)
      .neq("status", "betaald")
      .select("id, factuur_nummer")
      .maybeSingle();

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
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    captureRouteError(error, { route: "/api/facturen/[id]/betaald", action: "POST" });
    return NextResponse.json({ error: "Er ging iets mis" }, { status: 500 });
  }
}
