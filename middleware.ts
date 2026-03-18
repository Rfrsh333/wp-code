import { NextRequest, NextResponse } from "next/server";

/**
 * Next.js Middleware
 * - Beschermt admin API routes (vereist Bearer token)
 * - CSRF bescherming voor state-changing requests
 */
export function middleware(request: NextRequest) {
  // Admin API routes: vereisen een Bearer token
  if (request.nextUrl.pathname.startsWith("/api/admin")) {
    const authHeader = request.headers.get("authorization");
    const hasCookie = request.cookies.has("admin_session") || request.cookies.has("admin_token");

    if (!authHeader?.startsWith("Bearer ") && !hasCookie) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  // CSRF bescherming voor mutatie-requests
  if (["POST", "PUT", "PATCH", "DELETE"].includes(request.method)) {
    const origin = request.headers.get("origin");
    const host = request.headers.get("host");

    // Sla webhook endpoints over (hebben eigen signature verificatie)
    const isWebhook = request.nextUrl.pathname.startsWith("/api/webhooks/");
    const isCron = request.nextUrl.pathname.startsWith("/api/cron/");

    if (!isWebhook && !isCron && origin && host) {
      const originHost = new URL(origin).host;
      if (originHost !== host) {
        console.warn(`[CSRF] Blocked cross-origin request from ${origin} to ${host}`);
        return NextResponse.json({ error: "CSRF rejected" }, { status: 403 });
      }
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/api/:path*",
  ],
};
