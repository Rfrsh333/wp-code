import { NextRequest, NextResponse } from "next/server";
import { hasRequiredAdminRole, verifyAdmin, type AdminRole } from "@/lib/admin-auth";
import { UITBETALING_ROLLEN } from "@/lib/uitbetaling/config";

/**
 * Toegang tot de uitbetaal-routes: ingelogde admin (Bearer-token + ADMIN_EMAILS) én een geld-rol
 * (UITBETALING_ROLLEN, zelfde als de andere geld-routes). Geeft de actor terug voor het audit-log.
 */
export async function uitbetalingToegang(
  request: NextRequest,
): Promise<{ ok: true; email?: string; role?: AdminRole } | { ok: false; response: NextResponse }> {
  const { isAdmin, email, role } = await verifyAdmin(request);
  if (!isAdmin) {
    console.warn(`[SECURITY] Unauthorized uitbetalingen access attempt by: ${email || "unknown"}`);
    return { ok: false, response: NextResponse.json({ error: "Unauthorized - Admin access required" }, { status: 403 }) };
  }
  if (!hasRequiredAdminRole(role, UITBETALING_ROLLEN)) {
    return { ok: false, response: NextResponse.json({ error: "Onvoldoende rechten — finance vereist" }, { status: 403 }) };
  }
  return { ok: true, email, role };
}

export const GEEN_CACHE = { "Cache-Control": "private, no-store" } as const;
