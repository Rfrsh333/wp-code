import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { supabaseAdmin } from "@/lib/supabase";
import { logAuditEvent } from "@/lib/audit-log";
import { captureRouteError } from "@/lib/sentry-utils";
import { GEEN_CACHE, uitbetalingToegang } from "@/lib/uitbetaling/admin-toegang";

/**
 * Gefactureerde uren alsnog door TopTalent laten goedkeuren voor uitbetaling (owner/finance).
 *
 * Waarom: een werkgever kan zelf een factuur maken van uren die hij heeft goedgekeurd
 * (POST /api/klant/facturen, klant_goedgekeurd → gefactureerd). Die uren hebben dan nooit de
 * admin-goedkeuring (goedgekeurd_at) gehad, en uitbetalen mag pas na goedkeuring door de admin
 * (besluit Rachid). Zonder deze actie zouden ze nooit uitbetaalbaar worden.
 * Alleen uren met status 'gefactureerd' en zonder goedgekeurd_at; de status zelf blijft gelijk.
 *   POST { uren_ids: string[] } → 200 { success, aantal }
 */
const schema = z.object({ uren_ids: z.array(z.string().regex(/^[0-9a-f-]{36}$/i)).min(1).max(500) });

export async function POST(request: NextRequest) {
  const toegang = await uitbetalingToegang(request);
  if (!toegang.ok) return toegang.response;

  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Ongeldige selectie" }, { status: 400 });

  try {
    const nu = new Date().toISOString();
    const { data, error } = await supabaseAdmin
      .from("uren_registraties")
      .update({ goedgekeurd_at: nu })
      .in("id", parsed.data.uren_ids)
      .eq("status", "gefactureerd")
      .is("goedgekeurd_at", null)
      .select("id");
    if (error) throw error;

    const ids = (data ?? []).map((r) => r.id as string);
    if (ids.length > 0) {
      await logAuditEvent({
        actorEmail: toegang.email,
        actorRole: toegang.role,
        action: "uren_goedgekeurd_voor_uitbetaling",
        targetTable: "uren_registraties",
        summary: `${ids.length} gefactureerde urenregistratie(s) goedgekeurd voor uitbetaling door ${toegang.email || "admin"}`,
        metadata: { uren_ids: ids },
      });
    }
    return NextResponse.json({ success: true, aantal: ids.length }, { headers: GEEN_CACHE });
  } catch (error) {
    captureRouteError(error, { route: "/api/admin/uitbetalingen/goedkeuren", action: "POST" });
    return NextResponse.json({ error: "Goedkeuren mislukt" }, { status: 500 });
  }
}
