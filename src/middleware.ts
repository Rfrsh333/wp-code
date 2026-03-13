import { NextRequest, NextResponse } from "next/server";

/**
 * Centralized route protection middleware.
 *
 * 1. CSRF: Origin header validation on mutation API requests (POST/PUT/PATCH/DELETE)
 * 2. Auth:  redirect unauthenticated users from protected pages
 *
 * API routes still perform their own full verification (token decode + role checks).
 * This middleware acts as a fast gatekeeper.
 */

const ADMIN_LOGIN = "/admin/login";
const KLANT_LOGIN = "/klant/login";
const MEDEWERKER_LOGIN = "/medewerker/login";

// Paths exempt from CSRF origin check (webhooks receive external POST requests)
const CSRF_EXEMPT = ["/api/webhooks/"];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // --- CSRF: Origin validation for mutation API requests ---
  if (
    pathname.startsWith("/api/") &&
    ["POST", "PUT", "PATCH", "DELETE"].includes(request.method) &&
    !CSRF_EXEMPT.some((p) => pathname.startsWith(p))
  ) {
    const origin = request.headers.get("origin");
    const host = request.headers.get("host");

    if (origin && host) {
      try {
        const originHost = new URL(origin).host;
        if (originHost !== host) {
          return NextResponse.json(
            { error: "Ongeldige herkomst" },
            { status: 403 }
          );
        }
      } catch {
        return NextResponse.json(
          { error: "Ongeldige herkomst" },
          { status: 403 }
        );
      }
    }
  }

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
  matcher: ["/admin/:path*", "/klant/:path*", "/medewerker/:path*", "/api/:path*"],
};
