import { NextResponse, type NextRequest } from "next/server";

const REDIRECT_TARGET = "https://toptalentjobs.nl/";

export function proxy(request: NextRequest) {
  const { pathname, searchParams } = request.nextUrl;
  const normalizedPath = pathname !== "/" && pathname.endsWith("/")
    ? pathname.slice(0, -1)
    : pathname;
  const isGonePath =
    normalizedPath === "/horeca-evenementen" ||
    normalizedPath === "/employer-public";
  const isWpJsonPath =
    normalizedPath === "/wp-json" || normalizedPath.startsWith("/wp-json/");
  const hasLegacyWpQuery = searchParams.has("p") || searchParams.has("cat");

  if (isGonePath) {
    return new NextResponse(null, { status: 410 });
  }

  if (isWpJsonPath || hasLegacyWpQuery) {
    return new NextResponse(null, { status: 410 });
  }

  const hasPageId = searchParams.has("page_id");
  const hasWprTemplates = searchParams.has("wpr_templates");
  const hasBare404 = searchParams.has("404") && searchParams.size === 1;

  if (hasPageId || hasWprTemplates || hasBare404) {
    return NextResponse.redirect(REDIRECT_TARGET, 301);
  }

  if (normalizedPath !== "/" && normalizedPath !== "/diensten") {
    const response = NextResponse.next();
    response.headers.set("X-Robots-Tag", "noindex, follow");
    return response;
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/|favicon.ico|robots.txt|sitemap.xml).*)"],
};
