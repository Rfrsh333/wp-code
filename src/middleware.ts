import { NextRequest, NextResponse } from "next/server";

/**
 * Centralized route protection middleware.
 *
 * - Admin pages:       require Supabase auth token in cookie `sb-access-token`
 * - Klant pages:       require JWT in cookie `klant_session`
 * - Medewerker pages:  require JWT in cookie `medewerker_session`
 *
 * API routes still perform their own full verification (token decode + role checks).
 * This middleware acts as a fast gatekeeper to redirect unauthenticated users
 * before the page even renders.
 */

const ADMIN_LOGIN = "/admin/login";
const KLANT_LOGIN = "/klant/login";
const MEDEWERKER_LOGIN = "/medewerker/login";

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // --- Admin pages (not API, not login page itself) ---
  if (pathname.startsWith("/admin") && !pathname.startsWith("/api/") && pathname !== ADMIN_LOGIN) {
    const supabaseToken =
      request.cookies.get("sb-access-token")?.value ||
      request.cookies.get("supabase-auth-token")?.value;

    if (!supabaseToken) {
      return NextResponse.redirect(new URL(ADMIN_LOGIN, request.url));
    }
  }

  // --- Klant pages ---
  if (pathname.startsWith("/klant") && !pathname.startsWith("/api/") && pathname !== KLANT_LOGIN) {
    const klantSession = request.cookies.get("klant_session")?.value;

    if (!klantSession) {
      return NextResponse.redirect(new URL(KLANT_LOGIN, request.url));
    }
  }

  // --- Medewerker pages ---
  if (
    pathname.startsWith("/medewerker") &&
    !pathname.startsWith("/api/") &&
    pathname !== MEDEWERKER_LOGIN
  ) {
    const medewerkerSession = request.cookies.get("medewerker_session")?.value;

    if (!medewerkerSession) {
      return NextResponse.redirect(new URL(MEDEWERKER_LOGIN, request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*", "/klant/:path*", "/medewerker/:path*"],
};
