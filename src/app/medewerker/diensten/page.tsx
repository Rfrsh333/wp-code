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

  const medewerker = await verifyMedewerkerSession(session.value);
  if (!medewerker) {
    redirect("/medewerker/login");
  }

  const medewerkerNormalized = {
    ...medewerker,
    functie: Array.isArray(medewerker.functie)
      ? medewerker.functie
      : [medewerker.functie],
  };

  return <MedewerkerDienstenClient medewerker={medewerkerNormalized} />;
}
