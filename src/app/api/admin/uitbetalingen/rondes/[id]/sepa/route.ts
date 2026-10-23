import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { logAuditEvent } from "@/lib/audit-log";
import { captureRouteError } from "@/lib/sentry-utils";
import { UITBETALING_BUCKET } from "@/lib/uitbetaling/config";
import { uitbetalingToegang } from "@/lib/uitbetaling/admin-toegang";
import { isMigratieFout } from "@/lib/uitbetaling/db";

/**
 * SEPA-bestand (pain.001.001.03) van een ronde downloaden (alleen owner/finance). Het bestand bevat
 * IBAN's: niet cachen, elke download komt in het audit-log. Rachid uploadt het zelf in de bank.
 */
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const toegang = await uitbetalingToegang(request);
  if (!toegang.ok) return toegang.response;

  try {
    const { id } = await params;
    if (!/^[0-9a-f-]{36}$/i.test(id)) return NextResponse.json({ error: "Ronde niet gevonden" }, { status: 404 });
    const { data: ronde, error } = await supabaseAdmin
      .from("uitbetaalrondes")
      .select("id, bericht_id, status, sepa_pad")
      .eq("id", id)
      .maybeSingle();
    if (isMigratieFout(error)) return NextResponse.json({ error: "Ronde niet gevonden" }, { status: 404 });
    if (error) throw error;
    if (!ronde || ronde.status === "concept" || !ronde.sepa_pad) return NextResponse.json({ error: "Ronde niet gevonden" }, { status: 404 });

    const { data: bestand, error: downloadFout } = await supabaseAdmin.storage.from(UITBETALING_BUCKET).download(ronde.sepa_pad as string);
    if (downloadFout || !bestand) throw downloadFout ?? new Error("SEPA-bestand niet gevonden");
    const xml = await bestand.text();

    const nu = new Date().toISOString();
    await supabaseAdmin.from("uitbetaalrondes").update({ sepa_gedownload_op: nu, sepa_gedownload_door: toegang.email ?? null }).eq("id", id);
    await logAuditEvent({
      actorEmail: toegang.email,
      actorRole: toegang.role,
      action: "uitbetaalronde_sepa_gedownload",
      targetTable: "uitbetaalrondes",
      targetId: id,
      summary: `SEPA-bestand van ronde ${ronde.bericht_id} gedownload`,
      metadata: { bericht_id: ronde.bericht_id, status: ronde.status },
    });

    return new NextResponse(xml, {
      headers: {
        "Content-Type": "application/xml; charset=utf-8",
        "Content-Disposition": `attachment; filename="${ronde.bericht_id}.xml"`,
        "Cache-Control": "private, no-store",
      },
    });
  } catch (error) {
    captureRouteError(error, { route: "/api/admin/uitbetalingen/rondes/[id]/sepa", action: "GET" });
    return NextResponse.json({ error: "Downloaden mislukt" }, { status: 500 });
  }
}
