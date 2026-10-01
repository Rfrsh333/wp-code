import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getKlantSession, revokeSessions } from "@/lib/portal-auth";

/**
 * Uitloggen.
 * - Web (GET vanuit de browser): cookie wissen en terug naar de loginpagina.
 * - Native app / fetch (Bearer-token of `Accept: application/json`): JSON-antwoord i.p.v. een
 *   redirect naar een HTML-pagina, zodat de client niets hoeft te parsen dat hij niet verwacht.
 *   De cookie wissen is voor zo'n client een no-op; het token zelf verwijdert de app lokaal.
 * - POST `{ "overal": true }`: trekt álle sessies van dit account in (ook op andere apparaten).
 */

function wilJson(request: NextRequest): boolean {
  const auth = request.headers.get("authorization") ?? "";
  const accept = request.headers.get("accept") ?? "";
  return auth.toLowerCase().startsWith("bearer ") || (accept.includes("application/json") && !accept.includes("text/html"));
}

async function wisCookie() {
  const cookieStore = await cookies();
  cookieStore.delete("klant_session");
}

export async function GET(request: NextRequest) {
  await wisCookie();
  if (wilJson(request)) {
    return NextResponse.json({ success: true });
  }
  return NextResponse.redirect(new URL("/klant/login", process.env.NEXT_PUBLIC_SITE_URL || "https://www.toptalentjobs.nl"));
}

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}));
  if (body?.overal === true) {
    const klant = await getKlantSession(request);
    if (klant) await revokeSessions("klanten", klant.id);
  }
  await wisCookie();
  return NextResponse.json({ success: true });
}
