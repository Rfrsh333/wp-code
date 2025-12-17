import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import KlantUrenClient from "./KlantUrenClient";

export default async function KlantUren() {
  const cookieStore = await cookies();
  const session = cookieStore.get("klant_session");

  if (!session) {
    redirect("/klant/login");
  }

  const klant = JSON.parse(session.value);
  return <KlantUrenClient klant={klant} />;
}
