import { supabaseAdmin } from "@/lib/supabase";
import { sendEmail } from "@/lib/email-service";
import { sendTelegramAlert } from "@/lib/telegram";
import { sendPushToAllOfType, sendPushToUsers } from "@/lib/push-notifications";
import { bepaalPushDoelgroep, pushNaarMedewerkers } from "@/lib/medewerker/push-doelgroep";
import { captureRouteError } from "@/lib/sentry-utils";
import { isOntbrekendeKolom } from "@/lib/db-kolom-fallback";
import { isDemoKlant } from "@/lib/demo";
import { markeerGecontroleerd } from "@/lib/klant-onboarding";
import {
  DIENST_STATUS_IN_CONTROLE,
  dienstRegel,
  eersteDienstInControleMelding,
  type ControleDienst,
  type ControleKlant,
} from "@/lib/klant-controle-regels";

/**
 * Eerste-dienstcontrole (server-kant). Regels: lib/klant-controle-regels.ts.
 * - meldDienstInControle: Telegram + mail aan TopTalent (zelfde route als een nieuwe aanvraag).
 * - keurKlantGoed: klant gecontroleerd, zijn diensten in_controle → open, push naar medewerkers.
 * - wijsKlantDienstenAf: diensten in_controle → geannuleerd (geen push); klant blijft ongecontroleerd.
 */

/**
 * Push "Nieuwe dienst beschikbaar!" (stap 3: gericht). Alleen naar actieve medewerkers uit de wereld
 * van de klant (demo blijft gescheiden) bij wie functie, beschikbaarheid, afstand en "werkgever niet
 * verborgen" kloppen (lib/medewerker/push-doelgroep-regels.ts). Zonder migratie, zonder dienst-ids of
 * bij een databasefout bij het bepalen van de doelgroep: zoals voorheen naar alle medewerkers van die
 * wereld (sendPushToAllOfType).
 */
export async function pushNieuweDienst(
  omschrijving: string,
  datum: string,
  demo: boolean,
  dienstIds: readonly string[] = [],
): Promise<{ sent: number; failed: number }> {
  const payload = {
    title: "Nieuwe dienst beschikbaar!",
    body: omschrijving,
    url: "/medewerker/diensten/",
    tag: `nieuwe-dienst-${datum}`,
  };
  let doelgroep: Awaited<ReturnType<typeof bepaalPushDoelgroep>>;
  try {
    doelgroep = await bepaalPushDoelgroep(dienstIds, demo);
  } catch (e) {
    captureRouteError(e, { route: "lib/klant-controle", action: "PUSH_DOELGROEP" });
    doelgroep = { modus: "iedereen", reden: "databasefout" };
  }
  if (doelgroep.modus === "iedereen") return sendPushToAllOfType("medewerker", payload, { demo });
  // Alleen aantallen in de log (geen ids of namen).
  console.info(
    `[push] nieuwe dienst: ${doelgroep.ids.length} van ${doelgroep.kandidaten} actieve medewerkers` +
      (doelgroep.functieTerugval ? ` (functie-terugval voor ${doelgroep.functieTerugval} dienst(en))` : ""),
    doelgroep.redenen,
  );
  if (doelgroep.kandidaten > 0 && doelgroep.ids.length === 0) {
    // Niemand past: geen fout, maar wel opvallend (bv. functienamen die niet aansluiten).
    captureRouteError(new Error(`Gerichte push zonder ontvangers (${doelgroep.kandidaten} kandidaten): ${JSON.stringify(doelgroep.redenen)}`), {
      route: "lib/klant-controle",
      action: "PUSH_GEEN_ONTVANGERS",
    });
  }
  return pushNaarMedewerkers(doelgroep.ids, (blok) => sendPushToUsers(blok, "medewerker", payload));
}

async function laadControleKlant(klantId: string): Promise<ControleKlant> {
  const vol = await supabaseAdmin
    .from("klanten")
    .select("bedrijfsnaam, contactpersoon, email, telefoon, kvk_nummer")
    .eq("id", klantId)
    .maybeSingle();
  if (!isOntbrekendeKolom(vol.error)) return (vol.data as ControleKlant | null) ?? { bedrijfsnaam: null, contactpersoon: null, email: null, telefoon: null };
  const basis = await supabaseAdmin.from("klanten").select("bedrijfsnaam, contactpersoon, email, telefoon").eq("id", klantId).maybeSingle();
  return (basis.data as ControleKlant | null) ?? { bedrijfsnaam: null, contactpersoon: null, email: null, telefoon: null };
}

export async function meldDienstInControle(klantId: string, diensten: readonly ControleDienst[]): Promise<void> {
  const route = "lib/klant-controle";
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://www.toptalentjobs.nl";
  const klant = await laadControleKlant(klantId);
  const melding = eersteDienstInControleMelding(klant, diensten, `${baseUrl}/admin`);

  await sendTelegramAlert(melding.telegram).catch((e) => captureRouteError(e, { route, action: "TELEGRAM" }));
  try {
    const { error } = await sendEmail({
      from: "TopTalent Jobs <info@toptalentjobs.nl>",
      to: ["info@toptalentjobs.nl"],
      ...(klant.email ? { replyTo: klant.email } : {}),
      subject: melding.onderwerp,
      html: melding.html,
      emailType: "eerste_dienst_controle_admin",
    });
    if (error) captureRouteError(error, { route, action: "MAIL" });
  } catch (e) {
    captureRouteError(e, { route, action: "MAIL" });
  }
}

type DienstRij = ControleDienst & { id: string; klant_id: string };

/** Diensten in controle, gegroepeerd per klant (admin > Diensten). */
export async function haalDienstenInControle(): Promise<{ klant_id: string; klant: ControleKlant; diensten: DienstRij[] }[]> {
  const { data, error } = await supabaseAdmin
    .from("diensten")
    .select("id, klant_id, functie, aantal_nodig, datum, start_tijd, eind_tijd, locatie, uurtarief")
    .eq("status", DIENST_STATUS_IN_CONTROLE)
    .order("datum", { ascending: true })
    .limit(200);
  if (error) throw error;

  const perKlant = new Map<string, DienstRij[]>();
  for (const d of (data || []) as DienstRij[]) {
    if (!d.klant_id) continue;
    perKlant.set(d.klant_id, [...(perKlant.get(d.klant_id) || []), d]);
  }
  return Promise.all(
    [...perKlant.entries()].map(async ([klant_id, diensten]) => ({ klant_id, klant: await laadControleKlant(klant_id), diensten })),
  );
}

/**
 * Goedkeuren: klant gecontroleerd, diensten in_controle → open, push per groep (zelfde datum en
 * tijden, zoals één aanvraag). Geeft het aantal vrijgegeven diensten terug.
 */
export async function keurKlantGoed(klantId: string): Promise<number> {
  await markeerGecontroleerd(klantId, "lib/klant-controle");

  const { data, error } = await supabaseAdmin
    .from("diensten")
    .update({ status: "open" })
    .eq("klant_id", klantId)
    .eq("status", DIENST_STATUS_IN_CONTROLE)
    .select("id, klant_id, functie, aantal_nodig, datum, start_tijd, eind_tijd, locatie, uurtarief");
  if (error) throw error;

  const vrijgegeven = (data || []) as DienstRij[];
  const demo = await isDemoKlant(klantId);
  const groepen = new Map<string, DienstRij[]>();
  for (const d of vrijgegeven) {
    const sleutel = `${d.datum}|${d.start_tijd}|${d.eind_tijd}|${d.locatie || ""}`;
    groepen.set(sleutel, [...(groepen.get(sleutel) || []), d]);
  }
  for (const groep of groepen.values()) {
    const eerste = groep[0];
    const functies = groep.map((d) => `${d.functie || "dienst"} (${d.aantal_nodig || 1}x)`).join(", ");
    const omschrijving =
      groep.length === 1
        ? dienstRegel(eerste)
        : `${functies} op ${eerste.datum} (${eerste.start_tijd.slice(0, 5)} - ${eerste.eind_tijd.slice(0, 5)})${eerste.locatie ? ` in ${eerste.locatie}` : ""}`;
    await pushNieuweDienst(omschrijving, eerste.datum, demo, groep.map((d) => d.id)).catch((e) =>
      captureRouteError(e, { route: "lib/klant-controle", action: "PUSH" }),
    );
  }
  return vrijgegeven.length;
}

/** Afwijzen: diensten in controle annuleren, zonder push. De klant blijft ongecontroleerd. */
export async function wijsKlantDienstenAf(klantId: string): Promise<number> {
  const { data, error } = await supabaseAdmin
    .from("diensten")
    .update({ status: "geannuleerd" })
    .eq("klant_id", klantId)
    .eq("status", DIENST_STATUS_IN_CONTROLE)
    .select("id");
  if (error) throw error;
  return (data || []).length;
}
