import { Redis } from "@upstash/redis";
import { supabaseAdmin } from "@/lib/supabase";
import { haalDemoIds } from "@/lib/demo";
import { sendPushToUser } from "@/lib/push-notifications";
import { captureRouteError } from "@/lib/sentry-utils";
import { meldingUrenBeoordeeld, type UrenActie } from "@/lib/meldingen/meldingen-teksten";

/**
 * Uren & geld (stap 5, aanvulling): de medewerker krijgt een push (en daarmee een melding,
 * categorie uren_geld) als de werkgever zijn uren goedkeurt, aanpast of afwijst, of als TopTalent
 * ze definitief goedkeurt (of aanpast/afwijst).
 *
 * Bundelen: "Alles goedkeuren" in de app stuurt per regel een verzoek, tegelijk. Per medewerker,
 * actie en afzender telt een Redis-teller (Upstash, atomair); alleen het eerste verzoek wacht kort
 * (BUNDEL_MS) en stuurt dan één push met het totaal ("5 urenregistraties goedgekeurd"). Zonder
 * Redis (lokaal) of bij een Redis-fout gaat de push meteen, per regel.
 *
 * Demo: niets naar demo-medewerkers en niets vanuit een demo-werkgever.
 * Aanroepen via after(): de wachttijd houdt het antwoord van de route niet op. Gooit nooit.
 */

const BUNDEL_MS = 4000;
const BUNDEL_TTL_S = 60;

const redis =
  process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN
    ? new Redis({ url: process.env.UPSTASH_REDIS_REST_URL, token: process.env.UPSTASH_REDIS_REST_TOKEN })
    : null;

type Een<T> = T | T[] | null | undefined;
const een = <T,>(v: Een<T>): T | null => (Array.isArray(v) ? (v[0] ?? null) : (v ?? null));

type Regel = {
  medewerkerId: string;
  klantId: string | null;
  klantNaam: string | null;
  functie: string | null;
  datum: string | null;
  uren: number | null;
};

async function laadRegel(urenId: string, actie: UrenActie): Promise<Regel | null> {
  const { data, error } = await supabaseAdmin
    .from("uren_registraties")
    .select(
      "id, gewerkte_uren, klant_gewerkte_uren, aanmelding:dienst_aanmeldingen(medewerker_id, dienst:diensten(klant_id, klant_naam, datum, functie))",
    )
    .eq("id", urenId)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  const aanmelding = een(data.aanmelding as Een<{ medewerker_id: string | null; dienst: unknown }>);
  const dienst = een(
    aanmelding?.dienst as Een<{ klant_id: string | null; klant_naam: string | null; datum: string | null; functie: string | null }>,
  );
  if (!aanmelding?.medewerker_id) return null;
  const uren = actie === "aangepast" ? data.klant_gewerkte_uren : data.gewerkte_uren;
  return {
    medewerkerId: aanmelding.medewerker_id,
    klantId: dienst?.klant_id ?? null,
    klantNaam: dienst?.klant_naam ?? null,
    functie: dienst?.functie ?? null,
    datum: dienst?.datum ?? null,
    uren: uren == null ? null : Number(uren),
  };
}

const wacht = (ms: number) => new Promise((klaar) => setTimeout(klaar, ms));

/** 0 = een ander verzoek stuurt deze bundel; anders het aantal regels in de bundel. */
async function bundel(sleutel: string): Promise<number> {
  if (!redis) return 1;
  try {
    const [aantal] = await redis.multi().incr(sleutel).expire(sleutel, BUNDEL_TTL_S).exec<[number, number]>();
    if (aantal > 1) return 0;
  } catch (e) {
    captureRouteError(e, { route: "lib/meldingen/uren", action: "BUNDEL" });
    return 1;
  }
  await wacht(BUNDEL_MS);
  try {
    const totaal = Number(await redis.getdel(sleutel));
    return Number.isFinite(totaal) && totaal >= 1 ? totaal : 1;
  } catch (e) {
    captureRouteError(e, { route: "lib/meldingen/uren", action: "BUNDEL" });
    return 1;
  }
}

export async function meldUrenBeoordeeld(urenId: string, actie: UrenActie, door: "klant" | "admin"): Promise<void> {
  try {
    const regel = await laadRegel(urenId, actie);
    if (!regel) return;

    const demo = await haalDemoIds();
    if (demo.medewerkers.has(regel.medewerkerId) || (regel.klantId && demo.klanten.has(regel.klantId))) return;

    const afzender = door === "admin" ? "admin" : (regel.klantId ?? "onbekend");
    const aantal = await bundel(`meldingbundel:uren:${actie}:${afzender}:${regel.medewerkerId}`);
    if (aantal === 0) return;

    await sendPushToUser(
      regel.medewerkerId,
      "medewerker",
      meldingUrenBeoordeeld({
        actie,
        door,
        aantal,
        klantNaam: regel.klantNaam,
        functie: regel.functie,
        datum: regel.datum,
        uren: regel.uren,
      }),
    );
  } catch (e) {
    captureRouteError(e, { route: "lib/meldingen/uren", action: actie.toUpperCase() });
  }
}
