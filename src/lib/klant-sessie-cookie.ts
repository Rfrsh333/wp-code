import { cookies } from "next/headers";
import { signKlantSession, type KlantSession } from "@/lib/session";

/**
 * Geeft een nieuwe klantsessie uit (zelfde cookie-instellingen als /api/klant/login).
 * Gebruikt na wachtwoord wijzigen (oude sessies zijn dan ingetrokken) en na profielwijziging
 * (contactpersoon zit in de JWT). Geeft het token terug voor Bearer-clients (native app).
 */
export async function zetKlantSessie(klant: Pick<KlantSession, "id" | "bedrijfsnaam" | "contactpersoon" | "email">): Promise<string> {
  const token = await signKlantSession({
    id: klant.id,
    bedrijfsnaam: klant.bedrijfsnaam,
    contactpersoon: klant.contactpersoon,
    email: klant.email,
  });
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
