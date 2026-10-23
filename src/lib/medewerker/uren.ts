import { supabaseAdmin } from "@/lib/supabase";
import { INGEPLAND_STATUSSEN } from "@/lib/dienst-status";
import { isTeRegistreren, wachtOpCheckin, type UrenRegel } from "@/lib/medewerker/uren-regels";
import { nlVandaag, plusDagen } from "@/lib/nl-tijd";
import { geldendeTijden, klantUurtariefVoorAanmelding } from "@/lib/medewerker/reactie-regels";
import { haalDienstExtras, haalVoorwaarden } from "@/lib/medewerker/reactie-voorwaarden";

/**
 * Gedeelde queries voor dashboard, Uren en Financieel.
 *
 * `uren_registraties.medewerker_id` wordt bij geen enkele insert gevuld (medewerker- en
 * admin-route zetten alleen aanmelding_id), dus filteren we altijd via de aanmelding
 * (`dienst_aanmeldingen!inner` + `aanmelding.medewerker_id`). De oude filter op
 * `uren_registraties.medewerker_id` gaf daardoor lege lijsten en €0.
 *
 * Uitgebreid reageren: `klant_uurtarief` is het tarief van de AANMELDING (tegenbod + € 4 als de
 * medewerker een eigen tarief had voorgesteld, anders het dienst-tarief). Zo rekenen dashboard,
 * Uren en Financieel automatisch met het afgesproken tarief.
 */

type Embed<T> = T | T[] | null | undefined;
const een = <T,>(v: Embed<T>): T | null => (Array.isArray(v) ? (v[0] ?? null) : (v ?? null));

export type UrenRij = UrenRegel & {
  id: string;
  aanmelding_id: string;
  created_at: string;
  pauze_minuten: number | null;
  dienst_id: string | null;
  locatie: string;
  klant_naam: string;
};

export async function haalUrenRegistraties(medewerkerId: string, limiet = 500): Promise<UrenRij[]> {
  const { data, error } = await supabaseAdmin
    .from("uren_registraties")
    .select(`
      id, aanmelding_id, gewerkte_uren, start_tijd, eind_tijd, pauze_minuten, status, created_at,
      aanmelding:dienst_aanmeldingen!inner (
        medewerker_id,
        dienst:diensten!dienst_id (
          id, datum, locatie, uurtarief, klant_naam,
          klant:klanten!klant_id ( bedrijfsnaam )
        )
      )
    `)
    .eq("aanmelding.medewerker_id", medewerkerId)
    .order("created_at", { ascending: false })
    .limit(limiet);

  if (error) throw error;

  const voorwaarden = await haalVoorwaarden((data ?? []).map((u) => u.aanmelding_id as string));

  return (data ?? []).map((u) => {
    const aanmelding = een(u.aanmelding as Embed<{ dienst: Embed<Record<string, unknown>> }>);
    const dienst = een(aanmelding?.dienst as Embed<Record<string, unknown>>);
    const klant = een(dienst?.klant as Embed<{ bedrijfsnaam?: string }>);
    const tegenbod = voorwaarden.get(u.aanmelding_id as string)?.voorgesteld_uurtarief;
    return {
      id: u.id as string,
      aanmelding_id: u.aanmelding_id as string,
      created_at: u.created_at as string,
      status: u.status as string,
      gewerkte_uren: (u.gewerkte_uren as number | null) ?? 0,
      start_tijd: (u.start_tijd as string | null) ?? null,
      eind_tijd: (u.eind_tijd as string | null) ?? null,
      pauze_minuten: (u.pauze_minuten as number | null) ?? null,
      dienst_id: (dienst?.id as string | undefined) ?? null,
      datum: (dienst?.datum as string | undefined) ?? null,
      klant_uurtarief: klantUurtariefVoorAanmelding((dienst?.uurtarief as number | undefined) ?? 0, tegenbod),
      locatie: (dienst?.locatie as string | undefined) ?? "",
      klant_naam: klant?.bedrijfsnaam || (dienst?.klant_naam as string | undefined) || "Onbekend",
    };
  });
}

export type TeRegistreren = {
  id: string;
  aanmelding_id: string;
  datum: string;
  /** Geldende tijden van de aanmelding (eigen tijden na acceptatie): vooringevuld bij uren. */
  start_tijd: string;
  eind_tijd: string;
  locatie: string;
  /** Klanttarief van de aanmelding (tegenbod + € 4, anders de dienst); medewerker = − € 4. */
  uurtarief: number;
  klant: { bedrijfsnaam: string };
  /** Pauze van de dienst in minuten (vooringevuld bij uren); null = niet opgegeven. */
  pauze_minuten: number | null;
  dienst_start_tijd: string;
  dienst_eind_tijd: string;
  eigen_tijden: boolean;
};

export type NietIngecheckt = TeRegistreren & {
  reden: "geen_checkin";
  /** Dienst was vandaag: de werkgever kan de QR-code vandaag nog scannen (api/klant/checkin). */
  werkgever_kan_nog_scannen: boolean;
};

/**
 * Hoe ver terug afgelopen diensten zonder check-in nog getoond worden. Oudere blijven bij
 * TopTalent (admin kan uren handmatig invoeren); anders staan maanden-oude diensten eeuwig open.
 */
export const NIET_INGECHECKT_DAGEN = 30;

/** Ingeplande (geaccepteerd/bevestigd), afgelopen diensten zonder uren-registratie. */
export async function haalTeRegistreren(medewerkerId: string, nu: Date = new Date()): Promise<TeRegistreren[]> {
  return (await haalAfgelopenZonderUren(medewerkerId, nu)).teRegistreren;
}

/**
 * Afgelopen ingeplande diensten zonder uren, gesplitst in:
 * - `teRegistreren`: indienen kan (ingecheckt of QR niet verplicht);
 * - `nietIngecheckt`: de backend weigert indienen omdat de QR-check-in ontbreekt.
 */
export async function haalAfgelopenZonderUren(
  medewerkerId: string,
  nu: Date = new Date(),
): Promise<{ teRegistreren: TeRegistreren[]; nietIngecheckt: NietIngecheckt[] }> {
  const { data, error } = await supabaseAdmin
    .from("dienst_aanmeldingen")
    .select(`
      id, check_in_at,
      dienst:diensten!dienst_id (
        id, datum, start_tijd, eind_tijd, locatie, uurtarief, klant_naam,
        klant:klanten!klant_id ( bedrijfsnaam, qr_verplicht )
      ),
      uren:uren_registraties!aanmelding_id ( id )
    `)
    .eq("medewerker_id", medewerkerId)
    .in("status", [...INGEPLAND_STATUSSEN])
    .limit(500);

  if (error) throw error;

  const rijen = data ?? [];
  const [voorwaarden, extras] = await Promise.all([
    haalVoorwaarden(rijen.map((a) => a.id as string)),
    haalDienstExtras(rijen.map((a) => een(a.dienst as Embed<{ id?: string }>)?.id)),
  ]);

  const vandaag = nlVandaag();
  const grens = plusDagen(vandaag, -NIET_INGECHECKT_DAGEN);
  const teRegistreren: TeRegistreren[] = [];
  const nietIngecheckt: NietIngecheckt[] = [];
  for (const a of rijen) {
    const dienst = een(a.dienst as Embed<Record<string, unknown>>);
    if (!dienst) continue;
    const klant = een(dienst.klant as Embed<{ bedrijfsnaam?: string; qr_verplicht?: boolean | null }>);
    const uren = (a.uren as unknown[] | null) ?? [];
    const regel = {
      datum: (dienst.datum as string) ?? null,
      start_tijd: (dienst.start_tijd as string) ?? null,
      eind_tijd: (dienst.eind_tijd as string) ?? null,
      check_in_at: (a.check_in_at as string | null) ?? null,
      qr_verplicht: klant?.qr_verplicht ?? null,
      heeft_uren: uren.length > 0,
    };
    // "Afgelopen" blijft op de tijden van de dienst (een eigen eindtijd ligt binnen de dienst);
    // vooringevuld worden de tijden en het tarief die voor deze aanmelding gelden.
    const v = voorwaarden.get(a.id as string);
    const tijden = geldendeTijden({ start_tijd: dienst.start_tijd as string, eind_tijd: dienst.eind_tijd as string }, v);
    const item: TeRegistreren = {
      id: dienst.id as string,
      aanmelding_id: a.id as string,
      datum: dienst.datum as string,
      start_tijd: tijden.start_tijd,
      eind_tijd: tijden.eind_tijd,
      locatie: (dienst.locatie as string) || "",
      uurtarief: klantUurtariefVoorAanmelding((dienst.uurtarief as number) || 0, v?.voorgesteld_uurtarief),
      klant: { bedrijfsnaam: klant?.bedrijfsnaam || (dienst.klant_naam as string) || "Onbekend" },
      pauze_minuten: extras.get(dienst.id as string)?.pauze_minuten ?? null,
      dienst_start_tijd: dienst.start_tijd as string,
      dienst_eind_tijd: dienst.eind_tijd as string,
      eigen_tijden: tijden.eigen_tijden,
    };
    if (isTeRegistreren(regel, nu)) {
      teRegistreren.push(item);
    } else if (wachtOpCheckin(regel, nu) && item.datum >= grens) {
      nietIngecheckt.push({ ...item, reden: "geen_checkin", werkgever_kan_nog_scannen: item.datum === vandaag });
    }
  }
  const nieuwsteEerst = (x: TeRegistreren, y: TeRegistreren) => y.datum.localeCompare(x.datum);
  return { teRegistreren: teRegistreren.sort(nieuwsteEerst), nietIngecheckt: nietIngecheckt.sort(nieuwsteEerst) };
}
