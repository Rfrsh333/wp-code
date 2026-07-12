import { NextResponse } from "next/server";
import { cookies } from "next/headers";

async function clearSession() {
  const cookieStore = await cookies();
  cookieStore.delete("medewerker_session");
}

/**
 * POST — gebruikt door de app-UI (`fetch(..., { method: "POST" })`).
 * Wist de httpOnly-sessiecookie en bevestigt met JSON zodat de client `res.ok` ziet.
 * Voorheen bestond alleen een GET-handler, waardoor de POST een 405 kreeg en de
 * sessiecookie bleef leven (sessie-lek op gedeelde toestellen).
 */
export async function POST() {
  await clearSession();
  return NextResponse.json({ ok: true });
}

/**
 * GET — ondersteunt directe uitlog-links (`<a href="/api/medewerker/logout">`).
 * Wist de cookie en stuurt door naar de loginpagina.
 */
export async function GET() {
  await clearSession();
  return NextResponse.redirect(
    new URL("/medewerker/login", process.env.NEXT_PUBLIC_SITE_URL || "https://www.toptalentjobs.nl"),
  );
}
