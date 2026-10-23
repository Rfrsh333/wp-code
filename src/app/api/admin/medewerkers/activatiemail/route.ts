import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { supabaseAdmin } from "@/lib/supabase";
import { hasRequiredAdminRole, verifyAdmin } from "@/lib/admin-auth";
import { logAuditEvent } from "@/lib/audit-log";
import { ACTIVATIE_GELDIG_DAGEN, verstuurActivatiemail } from "@/lib/medewerker-activation";

/**
 * B8: "Activatiemail opnieuw sturen" vanuit de admin. Maakt een nieuwe token (7 dagen geldig;
 * de vorige link vervalt) en verstuurt de activatiemail met controle op het resultaat.
 * Voorheen kon dit niet: na een mislukte mail of een verlopen link zat de medewerker vast.
 * Een account dat al een wachtwoord heeft, krijgt geen activatielink: dan is "Wachtwoord
 * vergeten" de weg.
 */

const schema = z.object({ medewerker_id: z.string().uuid() });

export async function POST(request: NextRequest) {
  const { isAdmin, email: adminEmail, role } = await verifyAdmin(request);
  if (!isAdmin) return NextResponse.json({ error: "Unauthorized - Admin access required" }, { status: 403 });
  if (!hasRequiredAdminRole(role, ["owner", "operations", "recruiter"])) {
    return NextResponse.json({ error: "Onvoldoende rechten" }, { status: 403 });
  }

  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Medewerker id ontbreekt" }, { status: 400 });

  const { data: medewerker } = await supabaseAdmin
    .from("medewerkers")
    .select("id, naam, email, wachtwoord")
    .eq("id", parsed.data.medewerker_id)
    .maybeSingle();
  if (!medewerker) return NextResponse.json({ error: "Medewerker niet gevonden" }, { status: 404 });
  if (!medewerker.email) return NextResponse.json({ error: "Deze medewerker heeft geen e-mailadres" }, { status: 400 });
  if (medewerker.wachtwoord) {
    return NextResponse.json(
      { error: "Dit account is al geactiveerd. Laat de medewerker 'Wachtwoord vergeten' gebruiken op de inlogpagina." },
      { status: 409 },
    );
  }

  const uitkomst = await verstuurActivatiemail(medewerker, "/api/admin/medewerkers/activatiemail");

  await logAuditEvent({
    actorEmail: adminEmail,
    actorRole: role,
    action: "admin_medewerker_activatiemail_opnieuw",
    targetTable: "medewerkers",
    targetId: medewerker.id,
    summary: uitkomst.ok ? "Activatiemail opnieuw verstuurd" : "Activatiemail opnieuw versturen mislukt",
    metadata: { geldigDagen: ACTIVATIE_GELDIG_DAGEN, ok: uitkomst.ok },
  });

  if (!uitkomst.ok) {
    return NextResponse.json({ error: `Activatiemail versturen mislukt: ${uitkomst.fout}` }, { status: 502 });
  }
  return NextResponse.json({ success: true, email: medewerker.email, geldig_dagen: ACTIVATIE_GELDIG_DAGEN });
}
