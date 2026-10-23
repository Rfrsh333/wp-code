import { NextRequest, NextResponse } from "next/server";
import { hasRequiredAdminRole, verifyAdmin } from "@/lib/admin-auth";
import { supabaseAdmin } from "@/lib/supabase";
import { logAuditEvent } from "@/lib/audit-log";
import { captureRouteError } from "@/lib/sentry-utils";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * POST /api/admin/offertes/[id]/afwijzen
 *
 * Zet een offerte op `afgewezen` met de service role. Voorheen deed de admin dit met de
 * browserclient van Supabase, terwijl RLS op `offertes` alleen service_role toelaat
 * (20260422_rls_security_hardening.sql): een update op 0 rijen zonder foutmelding.
 * Een geaccepteerde offerte blijft geaccepteerd. Een afgewezen offerte kan de klant daarna
 * niet meer online accepteren (api/offerte/[token]/accept).
 */
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { isAdmin, email, role } = await verifyAdmin(request);
  if (!isAdmin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!hasRequiredAdminRole(role, ["owner", "operations"])) {
    return NextResponse.json({ error: "Onvoldoende rechten om offertes af te wijzen" }, { status: 403 });
  }

  const { id } = await params;
  if (!UUID.test(id)) return NextResponse.json({ error: "Ongeldige offerte" }, { status: 400 });

  try {
    const { data, error } = await supabaseAdmin
      .from("offertes")
      .update({ status: "afgewezen" })
      .eq("id", id)
      .is("accepted_at", null)
      .neq("status", "geaccepteerd")
      .select("id, offerte_nummer");

    if (error) {
      captureRouteError(error, { route: "/api/admin/offertes/[id]/afwijzen", action: "POST" });
      return NextResponse.json({ error: "Afwijzen mislukt" }, { status: 500 });
    }
    if (!data || data.length === 0) {
      const { data: bestaand } = await supabaseAdmin.from("offertes").select("id").eq("id", id).maybeSingle();
      return bestaand
        ? NextResponse.json({ error: "Deze offerte is al geaccepteerd en kan niet meer worden afgewezen" }, { status: 409 })
        : NextResponse.json({ error: "Offerte niet gevonden" }, { status: 404 });
    }

    await logAuditEvent({
      actorEmail: email,
      actorRole: role,
      action: "offerte_afwijzen",
      targetTable: "offertes",
      targetId: id,
      summary: `Offerte ${data[0].offerte_nummer} afgewezen`,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    captureRouteError(error, { route: "/api/admin/offertes/[id]/afwijzen", action: "POST" });
    return NextResponse.json({ error: "Afwijzen mislukt" }, { status: 500 });
  }
}
