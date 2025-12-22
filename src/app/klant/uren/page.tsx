import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import KlantUrenClient from "./KlantUrenClient";
import { verifyKlantSession } from "@/lib/session";

export default async function KlantUren() {
  const cookieStore = await cookies();
  const session = cookieStore.get("klant_session");

  if (!session) {
    redirect("/klant/login");
  }

  // Verifieer JWT token - beschermt tegen token forgery
  const klant = await verifyKlantSession(session.value);

  if (!klant) {
    console.warn("[SECURITY] Invalid klant session token - forcing re-login");
    redirect("/klant/login");
  }

  return <KlantUrenClient klant={klant} />;
}
