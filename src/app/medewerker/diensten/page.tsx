import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import MedewerkerDienstenClient from "./MedewerkerDienstenClient";
import { verifyMedewerkerSession } from "@/lib/session";

export default async function MedewerkerDiensten() {
  const cookieStore = await cookies();
  const session = cookieStore.get("medewerker_session");

  if (!session) {
    redirect("/medewerker/login");
  }

  // Verifieer JWT token - beschermt tegen token forgery
  const medewerker = await verifyMedewerkerSession(session.value);

  if (!medewerker) {
    console.warn("[SECURITY] Invalid medewerker session token - forcing re-login");
    redirect("/medewerker/login");
  }

  // Ensure functie is always an array
  const medewerkerData = {
    ...medewerker,
    functie: Array.isArray(medewerker.functie) ? medewerker.functie : [medewerker.functie]
  };

  return <MedewerkerDienstenClient medewerker={medewerkerData} />;
}
