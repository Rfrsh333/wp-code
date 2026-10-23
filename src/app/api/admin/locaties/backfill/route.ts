import { NextRequest, NextResponse } from "next/server";
import { hasRequiredAdminRole, verifyAdmin } from "@/lib/admin-auth";
import { logAuditEvent } from "@/lib/audit-log";
import { captureRouteError } from "@/lib/sentry-utils";
import { BACKFILL_MAX_LIMIET, BACKFILL_STANDAARD_LIMIET, backfillLocaties } from "@/lib/locatie/locatie-opslag";

/**
 * Eenmalige backfill van de globale locatie (postcode → PDOK) voor bestaande medewerkers en
 * diensten vanaf vandaag (stap 3, Ontdekken). Alleen admin (owner/operations).
 *
 *   POST /api/admin/locaties/backfill?limiet=50   (max. 200 rijen per aanroep)
 *   → { migratie, medewerkers: {opgeslagen, geen_postcode, geen_resultaat, fout},
 *       diensten: {…}, resterend: { medewerkers, diensten }, afgebroken }
 *
 * Idempotent: alleen rijen met geo_bijgewerkt_op = null; herhaal tot `resterend` 0 is (of alleen
 * nog PDOK-fouten over zijn). Naar PDOK gaat alleen de postcode. Geen mails of pushmeldingen.
 */
export const maxDuration = 60;

export async function POST(request: NextRequest) {
  const { isAdmin, email, role } = await verifyAdmin(request);
  if (!isAdmin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!hasRequiredAdminRole(role, ["owner", "operations"])) {
    return NextResponse.json({ error: "Onvoldoende rechten" }, { status: 403 });
  }

  const ruw = Number(request.nextUrl.searchParams.get("limiet") ?? BACKFILL_STANDAARD_LIMIET);
  const limiet = Number.isFinite(ruw) && ruw >= 1 ? Math.min(BACKFILL_MAX_LIMIET, Math.floor(ruw)) : BACKFILL_STANDAARD_LIMIET;

  try {
    const resultaat = await backfillLocaties(limiet);
    if (!resultaat.migratie) {
      return NextResponse.json(
        { migratie: false, error: "Draai eerst migratie 20261023_ontdekken_afstand_werkgevers.sql." },
        { status: 409 },
      );
    }
    await logAuditEvent({
      actorEmail: email,
      actorRole: role,
      action: "locaties_backfill",
      targetTable: "medewerkers",
      targetId: null,
      summary: `Locatie-backfill: ${resultaat.medewerkers.opgeslagen} medewerkers, ${resultaat.diensten.opgeslagen} diensten met locatie`,
      metadata: { limiet, resterend: resultaat.resterend, afgebroken: resultaat.afgebroken },
    });
    return NextResponse.json(resultaat);
  } catch (error) {
    captureRouteError(error, { route: "/api/admin/locaties/backfill", action: "POST" });
    return NextResponse.json({ error: "Backfill mislukt" }, { status: 500 });
  }
}
