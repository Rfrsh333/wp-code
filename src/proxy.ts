import { NextResponse, type NextRequest } from "next/server";

const REDIRECT_TARGET = "https://www.toptalentjobs.nl/";
const ADMIN_LOGIN = "/admin/login";
const KLANT_LOGIN = "/klant/login";
const MEDEWERKER_LOGIN = "/medewerker/login";
const CSRF_EXEMPT = ["/api/webhooks/"];

export function proxy(request: NextRequest) {
  const { pathname, searchParams } = request.nextUrl;

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
          return NextResponse.json({ error: "Ongeldige herkomst" }, { status: 403 });
        }
      } catch {
        return NextResponse.json({ error: "Ongeldige herkomst" }, { status: 403 });
      }
    }
  }

  // --- Admin pages auth ---
  if (pathname.startsWith("/admin") && !pathname.startsWith("/api/") && pathname !== ADMIN_LOGIN) {
    const supabaseToken =
      request.cookies.get("sb-access-token")?.value ||
      request.cookies.get("supabase-auth-token")?.value;

    if (!supabaseToken) {
      return NextResponse.redirect(new URL(ADMIN_LOGIN, request.url));
    }
  }

  // --- Klant pages auth ---
  if (pathname.startsWith("/klant") && !pathname.startsWith("/api/") && pathname !== KLANT_LOGIN) {
    const klantSession = request.cookies.get("klant_session")?.value;

    if (!klantSession) {
      return NextResponse.redirect(new URL(KLANT_LOGIN, request.url));
    }
  }

  // --- Medewerker pages auth ---
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

  // --- API trailing slash rewrite ---
  if (pathname.startsWith("/api/") && pathname.length > 5 && pathname.endsWith("/")) {
    const rewriteUrl = request.nextUrl.clone();
    rewriteUrl.pathname = pathname.slice(0, -1);
    return NextResponse.rewrite(rewriteUrl);
  }

  // --- Legacy redirects ---
  const normalizedPath = pathname !== "/" && pathname.endsWith("/")
    ? pathname.slice(0, -1)
    : pathname;
  const isGonePath =
    normalizedPath === "/horeca-evenementen" ||
    normalizedPath === "/employer-public";
  const isWpJsonPath =
    normalizedPath === "/wp-json" || normalizedPath.startsWith("/wp-json/");
  const hasLegacyWpQuery = searchParams.has("p") || searchParams.has("cat");

  if (isGonePath || isWpJsonPath || hasLegacyWpQuery) {
    return new NextResponse(null, { status: 410 });
  }

  const hasPageId = searchParams.has("page_id");
  const hasWprTemplates = searchParams.has("wpr_templates");
  const hasBare404 = searchParams.has("404") && searchParams.size === 1;

  if (hasPageId || hasWprTemplates || hasBare404) {
    return NextResponse.redirect(REDIRECT_TARGET, 301);
  }

  // --- SEO: noindex for non-indexable paths ---
  const isIndexablePath =
    normalizedPath === "/" ||
    normalizedPath === "/diensten" ||
    normalizedPath === "/diensten/uitzenden" ||
    normalizedPath === "/diensten/detachering" ||
    normalizedPath === "/diensten/recruitment" ||
    normalizedPath === "/locaties" ||
    normalizedPath.startsWith("/locaties/");

  if (!isIndexablePath) {
    const response = NextResponse.next();
    response.headers.set("X-Robots-Tag", "noindex, follow");
    return response;
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/|favicon.ico|robots.txt|sitemap.xml).*)"],
};
