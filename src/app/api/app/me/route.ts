import { NextRequest, NextResponse } from "next/server";
import { getKlantSession, getMedewerkerSession } from "@/lib/portal-auth";

// Startcontrole van de app: is het bewaarde token nog geldig, en voor welke rol?
export async function GET(request: NextRequest) {
  const medewerker = await getMedewerkerSession(request);
  if (medewerker) {
    return NextResponse.json({
      rol: "medewerker",
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
