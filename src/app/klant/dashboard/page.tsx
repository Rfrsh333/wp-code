import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import dynamic from "next/dynamic";
import { verifyKlantSession } from "@/lib/session";

const KlantUrenClient = dynamic(() => import("../uren/KlantUrenClient"));

export default async function KlantDashboard() {
  const cookieStore = await cookies();
  const session = cookieStore.get("klant_session");

  if (!session) {
    redirect("/klant/login");
  }

  const klant = await verifyKlantSession(session.value);

  if (!klant) {
    console.warn("[SECURITY] Invalid klant session token - forcing re-login");
    redirect("/klant/login");
  }

  return <KlantUrenClient klant={klant} />;
}
