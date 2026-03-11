import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import MedewerkerDashboard from "./MedewerkerDashboard";
import { verifyMedewerkerSession } from "@/lib/session";

export default async function MedewerkerDashboardPage() {
  const cookieStore = await cookies();
  const session = cookieStore.get("medewerker_session");

  if (!session) {
    redirect("/medewerker/login");
  }

  const medewerker = await verifyMedewerkerSession(session.value);

  if (!medewerker) {
    console.warn("[SECURITY] Invalid medewerker session token - forcing re-login");
    redirect("/medewerker/login");
  }

  const medewerkerData = {
    ...medewerker,
    functie: Array.isArray(medewerker.functie) ? medewerker.functie : [medewerker.functie || ""],
  };

  return <MedewerkerDashboard medewerker={medewerkerData} />;
}
