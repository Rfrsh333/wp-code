import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import MedewerkerDienstenClient from "./MedewerkerDienstenClient";

export default async function MedewerkerDiensten() {
  const cookieStore = await cookies();
  const session = cookieStore.get("medewerker_session");

  if (!session) {
    redirect("/medewerker/login");
  }

  const medewerker = JSON.parse(session.value);

  return <MedewerkerDienstenClient medewerker={medewerker} />;
}
