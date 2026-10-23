import { NextRequest, NextResponse } from "next/server";
import { getKlantSession } from "@/lib/portal-auth";
import { getMedewerkerSessieInclGepauzeerd } from "@/lib/medewerker/sessie-boete";

// Startcontrole van de app: is het bewaarde token nog geldig, en voor welke rol?
// Een gepauzeerd medewerkeraccount blijft ingelogd (B5): `status` vertelt de app dat alleen
// status, boete en betalen werken; de andere portaal-API's geven dan 403 `account_gepauzeerd`.
export async function GET(request: NextRequest) {
  const medewerker = await getMedewerkerSessieInclGepauzeerd(request);
  if (medewerker) {
    return NextResponse.json({
      rol: "medewerker",
      status: medewerker.status,
      gebruiker: { id: medewerker.id, naam: medewerker.naam, email: medewerker.email, functie: medewerker.functie },
    });
  }
  const klant = await getKlantSession(request);
  if (klant) {
    return NextResponse.json({
      rol: "klant",
      gebruiker: { id: klant.id, bedrijfsnaam: klant.bedrijfsnaam, contactpersoon: klant.contactpersoon, email: klant.email },
    });
  }
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}
