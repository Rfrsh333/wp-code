import { supabaseAdmin } from "@/lib/supabase";
import { INGEPLAND_STATUSSEN } from "@/lib/dienst-status";
import { isTeRegistreren, type UrenRegel } from "@/lib/medewerker/uren-regels";

/**
 * Gedeelde queries voor dashboard, Uren en Financieel.
 *
 * `uren_registraties.medewerker_id` wordt bij geen enkele insert gevuld (medewerker- en
 * admin-route zetten alleen aanmelding_id), dus filteren we altijd via de aanmelding
 * (`dienst_aanmeldingen!inner` + `aanmelding.medewerker_id`). De oude filter op
 * `uren_registraties.medewerker_id` gaf daardoor lege lijsten en €0.
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

  return (data ?? []).map((u) => {
    const aanmelding = een(u.aanmelding as Embed<{ dienst: Embed<Record<string, unknown>> }>);
    const dienst = een(aanmelding?.dienst as Embed<Record<string, unknown>>);
    const klant = een(dienst?.klant as Embed<{ bedrijfsnaam?: string }>);
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
      klant_uurtarief: (dienst?.uurtarief as number | undefined) ?? 0,
      locatie: (dienst?.locatie as string | undefined) ?? "",
      klant_naam: klant?.bedrijfsnaam || (dienst?.klant_naam as string | undefined) || "Onbekend",
    };
  });
}

export type TeRegistreren = {
  id: string;
  aanmelding_id: string;
  datum: string;
  start_tijd: string;
  eind_tijd: string;
  locatie: string;
  uurtarief: number;
  klant: { bedrijfsnaam: string };
};

/** Ingeplande (geaccepteerd/bevestigd), afgelopen diensten zonder uren-registratie. */
export async function haalTeRegistreren(medewerkerId: string, nu: Date = new Date()): Promise<TeRegistreren[]> {
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

  const resultaat: TeRegistreren[] = [];
  for (const a of data ?? []) {
    const dienst = een(a.dienst as Embed<Record<string, unknown>>);
    if (!dienst) continue;
    const klant = een(dienst.klant as Embed<{ bedrijfsnaam?: string; qr_verplicht?: boolean | null }>);
    const uren = (a.uren as unknown[] | null) ?? [];
    const teDoen = isTeRegistreren(
      {
        datum: (dienst.datum as string) ?? null,
        start_tijd: (dienst.start_tijd as string) ?? null,
        eind_tijd: (dienst.eind_tijd as string) ?? null,
        check_in_at: (a.check_in_at as string | null) ?? null,
        qr_verplicht: klant?.qr_verplicht ?? null,
        heeft_uren: uren.length > 0,
      },
      nu,
    );
    if (!teDoen) continue;
    resultaat.push({
      id: dienst.id as string,
      aanmelding_id: a.id as string,
      datum: dienst.datum as string,
      start_tijd: dienst.start_tijd as string,
      eind_tijd: dienst.eind_tijd as string,
      locatie: (dienst.locatie as string) || "",
      uurtarief: (dienst.uurtarief as number) || 0,
      klant: { bedrijfsnaam: klant?.bedrijfsnaam || (dienst.klant_naam as string) || "Onbekend" },
    });
  }
  return resultaat.sort((x, y) => y.datum.localeCompare(x.datum));
}
