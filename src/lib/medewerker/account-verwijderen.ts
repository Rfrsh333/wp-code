import { supabaseAdmin } from "@/lib/supabase";
import { captureRouteError } from "@/lib/sentry-utils";
import { wisOntdekGegevensMedewerker } from "@/lib/locatie/locatie-opslag";
import { bereidIdGegevensVoorAccountVerwijderen, verwijderIdKopieBestanden } from "@/lib/id-check/bewaartermijn";
import { bereidBestandenVoorAccountVerwijderen, verwijderAccountBestanden } from "@/lib/medewerker/account-bestanden";

/**
 * Een medewerkeraccount definitief verwijderen. Elke route die een medewerker verwijdert, gebruikt
 * dit (nu alleen POST /api/admin/medewerkers action "delete"; het verzoek in het portaal of de app
 * verwijdert zelf niets, zie api/medewerker/account-verwijderen).
 *
 * 1. ID-gegevens voorbereiden (lib/id-check/bewaartermijn): een Wav-kopie van het ID (buiten de
 *    EER/Zwitserland) blijft tot bewaar_tot (privacyverklaring 2.6, 10f), het controlerecord blijft,
 *    Didit-sessies worden gewist. Kan een kopie niet veilig bewaard blijven, dan stopt het hier en
 *    blijft het account bestaan.
 * 2. Overige bestanden voorbereiden (lib/medewerker/account-bestanden): paden verzamelen vóór de
 *    cascade; loonheffingsverklaring, contract en (buiten de EER) werk- of verblijfsvergunning
 *    vastleggen in bewaarde_documenten (termijn uit de privacyverklaring). Lukt dat vastleggen niet,
 *    dan stopt het hier.
 * 3. Ontdekken-gegevens wissen (de cascade ruimt ze ook op, maar zo staat het vast).
 * 4. De medewerker verwijderen (documentrijen e.d. gaan mee via on delete cascade).
 * 5. Bestanden zonder grondslag uit de opslag halen: ID-kopieën en vergunningen (EER/Zwitserland,
 *    afgekeurd), overige documenten (VOG, KvK, enz.) en de profielfoto. Fouten daarbij gaan naar
 *    Sentry; het account blijft verwijderd.
 */

const ROUTE = "lib/medewerker/account-verwijderen";

export type AccountVerwijderResultaat =
  | {
      ok: true;
      idKopieenBewaard: number;
      idKopieenVerwijderd: number;
      /** Bestanden met een bewaartermijn (loonheffingsverklaring, contract, vergunning buiten de EER) die blijven. */
      bestandenBewaard: number;
      /** Overige documenten en de profielfoto die uit de opslag zijn gehaald. */
      bestandenVerwijderd: number;
    }
  | { ok: false; status: number; fout: string };

export async function verwijderMedewerkerAccount(medewerkerId: string): Promise<AccountVerwijderResultaat> {
  const voorbereiding = await bereidIdGegevensVoorAccountVerwijderen(medewerkerId);
  if (!voorbereiding.ok) return voorbereiding;

  const bestanden = await bereidBestandenVoorAccountVerwijderen(medewerkerId);
  if (!bestanden.ok) return bestanden;

  await wisOntdekGegevensMedewerker(medewerkerId).catch((e) => captureRouteError(e, { route: ROUTE, action: "ONTDEKKEN_WISSEN" }));

  const { error } = await supabaseAdmin.from("medewerkers").delete().eq("id", medewerkerId);
  if (error) {
    captureRouteError(error, { route: ROUTE, action: "VERWIJDEREN" });
    return { ok: false, status: 500, fout: "Er is een fout opgetreden" };
  }

  const idKopieenVerwijderd = await verwijderIdKopieBestanden(voorbereiding.teVerwijderenKopieen).catch((e) => {
    captureRouteError(e, { route: ROUTE, action: "ID_KOPIEEN_OPSLAG" });
    return 0;
  });
  const bestandenVerwijderd = await verwijderAccountBestanden(bestanden.verwijderen).catch((e) => {
    captureRouteError(e, { route: ROUTE, action: "BESTANDEN_OPSLAG" });
    return 0;
  });
  return {
    ok: true,
    idKopieenBewaard: voorbereiding.bewaardeKopieen,
    idKopieenVerwijderd,
    bestandenBewaard: bestanden.bewaard,
    bestandenVerwijderd,
  };
}
