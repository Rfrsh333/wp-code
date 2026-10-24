import { supabaseAdmin } from "@/lib/supabase";
import { captureRouteError } from "@/lib/sentry-utils";
import { wisOntdekGegevensMedewerker } from "@/lib/locatie/locatie-opslag";
import { bereidIdGegevensVoorAccountVerwijderen, verwijderIdKopieBestanden } from "@/lib/id-check/bewaartermijn";

/**
 * Een medewerkeraccount definitief verwijderen. Elke route die een medewerker verwijdert, gebruikt
 * dit (nu alleen POST /api/admin/medewerkers action "delete"; het verzoek in het portaal of de app
 * verwijdert zelf niets, zie api/medewerker/account-verwijderen).
 *
 * 1. ID-gegevens voorbereiden (lib/id-check/bewaartermijn): een Wav-kopie van het ID (buiten de
 *    EER/Zwitserland) blijft tot bewaar_tot (privacyverklaring 2.6, 10f), het controlerecord blijft,
 *    Didit-sessies worden gewist. Kan een kopie niet veilig bewaard blijven, dan stopt het hier en
 *    blijft het account bestaan.
 * 2. Ontdekken-gegevens wissen (de cascade ruimt ze ook op, maar zo staat het vast).
 * 3. De medewerker verwijderen (documentrijen e.d. gaan mee via on delete cascade).
 * 4. ID-kopieën zonder grondslag (EER/Zwitserland, afgekeurd) uit de opslag halen.
 */

const ROUTE = "lib/medewerker/account-verwijderen";

export type AccountVerwijderResultaat =
  | { ok: true; idKopieenBewaard: number; idKopieenVerwijderd: number }
  | { ok: false; status: number; fout: string };

export async function verwijderMedewerkerAccount(medewerkerId: string): Promise<AccountVerwijderResultaat> {
  const voorbereiding = await bereidIdGegevensVoorAccountVerwijderen(medewerkerId);
  if (!voorbereiding.ok) return voorbereiding;

  await wisOntdekGegevensMedewerker(medewerkerId).catch((e) => captureRouteError(e, { route: ROUTE, action: "ONTDEKKEN_WISSEN" }));

  const { error } = await supabaseAdmin.from("medewerkers").delete().eq("id", medewerkerId);
  if (error) {
    captureRouteError(error, { route: ROUTE, action: "VERWIJDEREN" });
    return { ok: false, status: 500, fout: "Er is een fout opgetreden" };
  }

  const idKopieenVerwijderd = await verwijderIdKopieBestanden(voorbereiding.teVerwijderenKopieen);
  return { ok: true, idKopieenBewaard: voorbereiding.bewaardeKopieen, idKopieenVerwijderd };
}
