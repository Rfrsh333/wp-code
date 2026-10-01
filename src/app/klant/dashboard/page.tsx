import { redirect } from "next/navigation";
import dynamic from "next/dynamic";
import { getKlantSession } from "@/lib/portal-auth";

const KlantUrenClient = dynamic(() => import("../uren/KlantUrenClient"));

export default async function KlantDashboard() {
  // getKlantSession controleert naast de JWT ook de accountstatus en ingetrokken sessies,
  // zodat een gedeactiveerd of verwijderd account niet meer in het portaal komt.
  const klant = await getKlantSession();

  if (!klant) {
    redirect("/klant/login");
  }

  return <KlantUrenClient klant={klant} />;
}
