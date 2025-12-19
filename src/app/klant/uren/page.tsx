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

  const klant = await verifyKlantSession(session.value);
  if (!klant) {
    redirect("/klant/login");
  }

  return <KlantUrenClient klant={klant} />;
}
