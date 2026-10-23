import { getKlantSession } from "@/lib/portal-auth";
import { getMedewerkerSessieInclGepauzeerd } from "@/lib/medewerker/sessie-boete";
import type { MeldingUserType } from "@/lib/meldingen/meldingen-regels";
import type { MeldingGebruiker } from "@/lib/meldingen/meldingen-opslag";

/**
 * Wie vraagt er meldingen op? Bestaande sessies (cookie of Bearer, met statuscheck en
 * sessie-intrekking). Een gepauzeerde medewerker mag zijn meldingen ook zien (zoals /api/app/me),
 * anders zou de app na een pauze uitloggen en mist hij juist de melding over die pauze.
 *
 * `rol` kiest de sessie als iemand in hetzelfde browserprofiel als medewerker én werkgever is
 * ingelogd (de portalen geven hem altijd mee). Zonder `rol`: eerst medewerker, dan klant.
 */
export async function haalMeldingGebruiker(request: Request, rol: MeldingUserType | null): Promise<MeldingGebruiker | null> {
  if (rol !== "klant") {
    const medewerker = await getMedewerkerSessieInclGepauzeerd(request);
    if (medewerker) return { type: "medewerker", id: medewerker.id };
  }
  if (rol !== "medewerker") {
    const klant = await getKlantSession(request);
    if (klant) return { type: "klant", id: klant.id };
  }
  return null;
}
