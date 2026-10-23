import { supabaseAdmin } from "@/lib/supabase";
import { sendPushToUser } from "@/lib/push-notifications";
import { nlDatumKort } from "@/lib/nl-tijd";
import { haalVoorwaarden } from "@/lib/medewerker/reactie-voorwaarden";

/**
 * Pushmeldingen rond een aanmelding voor een dienst. Op één plek, zodat elke route
 * (webportaal, app, admin) dezelfde melding stuurt.
 */

const een = <T,>(v: T | T[] | null | undefined): T | undefined => (Array.isArray(v) ? v[0] : (v ?? undefined));

/** Klant: een medewerker heeft zich aangemeld voor een dienst. */
export async function notifyKlantNieuweAanmelding(medewerkerId: string, dienstId: string) {
  const [{ data: dienst }, { data: medewerker }] = await Promise.all([
    supabaseAdmin.from("diensten").select("klant_id, datum, functie").eq("id", dienstId).maybeSingle(),
    supabaseAdmin.from("medewerkers").select("naam").eq("id", medewerkerId).maybeSingle(),
  ]);
  if (!dienst?.klant_id) return { sent: 0, failed: 0 };

  const voornaam = medewerker?.naam?.trim().split(/\s+/)[0] || "Een medewerker";
  return sendPushToUser(dienst.klant_id, "klant", {
    title: "Nieuwe aanmelding!",
    body: `${voornaam} heeft zich aangemeld voor ${dienst.functie || "uw dienst"} op ${nlDatumKort(dienst.datum)}`,
    url: "/klant/uren/",
    tag: `aanmelding-${dienstId}`,
  });
}

/** Medewerker: de opdrachtgever (of TopTalent) heeft over een aanmelding beslist. */
export async function notifyMedewerkerAanmeldingBeslist(aanmeldingId: string, status: "geaccepteerd" | "afgewezen") {
  const { data: aanmelding } = await supabaseAdmin
    .from("dienst_aanmeldingen")
    .select("medewerker_id, dienst_id, dienst:diensten(klant_naam, datum, start_tijd, functie)")
    .eq("id", aanmeldingId)
    .maybeSingle();
  const dienst = een(aanmelding?.dienst as
    | { klant_naam: string | null; datum: string; start_tijd: string | null; functie: string | null }
    | { klant_naam: string | null; datum: string; start_tijd: string | null; functie: string | null }[]
    | null);
  if (!aanmelding?.medewerker_id || !dienst) return { sent: 0, failed: 0 };

  // Eigen tijden (uitgebreid reageren) gelden na acceptatie: noem dan de eigen begintijd.
  const voorstel = (await haalVoorwaarden([aanmeldingId])).get(aanmeldingId);
  const start = voorstel?.voorgestelde_start_tijd && voorstel.voorgestelde_eind_tijd ? voorstel.voorgestelde_start_tijd : dienst.start_tijd;
  const wat = `${dienst.functie || "de dienst"}${dienst.klant_naam ? ` bij ${dienst.klant_naam}` : ""}`;
  const wanneer = `${nlDatumKort(dienst.datum)}${start ? ` om ${start.slice(0, 5)}` : ""}`;
  return sendPushToUser(aanmelding.medewerker_id, "medewerker", status === "geaccepteerd"
    ? {
        title: "Je bent ingepland!",
        body: `Je staat ingepland voor ${wat} op ${wanneer}.`,
        url: "/medewerker/diensten/",
        tag: `aanmelding-${aanmelding.dienst_id}`,
      }
    : {
        title: "Niet gekozen voor deze dienst",
        body: `Voor ${wat} op ${nlDatumKort(dienst.datum)} is iemand anders gekozen. Bekijk de andere open diensten.`,
        url: "/medewerker/diensten/",
        tag: `aanmelding-${aanmelding.dienst_id}`,
      });
}

/** Medewerker: zijn reactie is automatisch ingetrokken (cron reacties-intrekken). */
export async function notifyMedewerkerReactieIngetrokken(input: {
  medewerkerId: string;
  dienstId: string;
  datum: string;
  functie: string | null;
  klantNaam: string | null;
  uren: number;
}) {
  const wat = `${input.functie || "de dienst"}${input.klantNaam ? ` bij ${input.klantNaam}` : ""}`;
  return sendPushToUser(input.medewerkerId, "medewerker", {
    title: "Reactie automatisch ingetrokken",
    body: `Je reactie op ${wat} op ${nlDatumKort(input.datum)} is ingetrokken: je was ${input.uren} uur voor de start nog niet gekozen.`,
    url: "/medewerker/shifts/",
    tag: `aanmelding-${input.dienstId}`,
  });
}
