import { NextResponse, type NextRequest } from "next/server";

const REDIRECT_TARGET = "https://www.toptalentjobs.nl/";
const ADMIN_LOGIN = "/admin/login";
const KLANT_LOGIN = "/klant/login";
const MEDEWERKER_LOGIN = "/medewerker/login";
const CSRF_EXEMPT = ["/api/webhooks/"];

export function proxy(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const pathname = request.nextUrl.pathname.replace(/\/+$/, "") || "/";

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
  const isAdminPublicPage = pathname === ADMIN_LOGIN || pathname === "/admin/wachtwoord-vergeten" || pathname === "/admin/wachtwoord-reset";
  if (pathname.startsWith("/admin") && !pathname.startsWith("/api/") && !isAdminPublicPage) {
    const hasSupabaseCookie = request.cookies.getAll().some(
      (c) => c.name.startsWith("sb-") || c.name === "supabase-auth-token",
    );

    if (!hasSupabaseCookie) {
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
  const rawPathname = request.nextUrl.pathname;
  if (rawPathname.startsWith("/api/") && rawPathname.length > 5 && rawPathname.endsWith("/")) {
    const rewriteUrl = request.nextUrl.clone();
    rewriteUrl.pathname = rawPathname.slice(0, -1);
    return NextResponse.rewrite(rewriteUrl);
  }

  // --- Legacy redirects ---
  const isGonePath =
    pathname === "/horeca-evenementen" ||
    pathname === "/employer-public";
  const isWpJsonPath =
    pathname === "/wp-json" || pathname.startsWith("/wp-json/");
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
    pathname === "/" ||
    pathname === "/diensten" ||
    pathname === "/diensten/uitzenden" ||
    pathname === "/diensten/detachering" ||
    pathname === "/diensten/recruitment" ||
    pathname === "/locaties" ||
    pathname.startsWith("/locaties/");

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
