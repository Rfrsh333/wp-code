import { cookies } from "next/headers";
import { signKlantSession, type KlantSession } from "@/lib/session";

/** Geldigheid van tokens voor de native app (zelfde als /api/app/login). */
export const APP_TOKEN_GELDIGHEID = "30d";

/**
 * Geeft een nieuwe klantsessie uit (zelfde cookie-instellingen als /api/klant/login).
 * Gebruikt na wachtwoord wijzigen (oude sessies zijn dan ingetrokken) en na profielwijziging
 * (contactpersoon zit in de JWT). Geeft het token terug voor Bearer-clients (native app).
 * Bearer-request (app): token 30 dagen geldig, géén cookie. Anders: 7 dagen + cookie.
 */
export async function zetKlantSessie(
  klant: Pick<KlantSession, "id" | "bedrijfsnaam" | "contactpersoon" | "email">,
  request: Request,
): Promise<string> {
  const app = isBearerRequest(request);
  const token = await signKlantSession(
    {
      id: klant.id,
      bedrijfsnaam: klant.bedrijfsnaam,
      contactpersoon: klant.contactpersoon,
      email: klant.email,
    },
    app ? APP_TOKEN_GELDIGHEID : undefined,
  );
  if (app) return token;
  const cookieStore = await cookies();
  cookieStore.set("klant_session", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    expires: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    path: "/",
  });
  return token;
}

export function isBearerRequest(request: Request): boolean {
  return (request.headers.get("authorization") ?? "").toLowerCase().startsWith("bearer ");
}
