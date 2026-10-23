import { supabaseAdmin } from "@/lib/supabase";
import { haalDemoIds, zelfdeWereld } from "@/lib/demo";
import { nlVandaag, plusDagen } from "@/lib/nl-tijd";
import { isOntbrekendeKolom } from "@/lib/db-kolom-fallback";
import { isOntbrekendeTabel } from "@/lib/medewerker/werkgever-voorkeuren";
import { vergeetWerkgeverProfiel } from "@/lib/werkgever-profiel";
import {
  BEOORDEEL_TERMIJN_DAGEN,
  beoordelenTot,
  binnenBeoordeelTermijn,
  eigenBeoordelingenPerDienst,
  isAfgerondVoorBeoordeling,
  type EigenWerkgeverBeoordeling,
  type WerkgeverBeoordelingInvoer,
} from "@/lib/medewerker/werkgever-beoordeling-regels";
import { fotoVoorDienst, type DienstFoto } from "@/lib/sfeerfotos";
import { haalBedrijfsfotos } from "@/lib/sfeerfotos-opslag";

/**
 * Medewerker beoordeelt werkgever (stap 4 "Vertrouwen zoals YoungOnes"): tabel werkgever_beoordelingen
 * (migratie 20261023_werkgever_beoordelingen.sql). Regels in werkgever-beoordeling-regels.ts.
 *
 * Wie ziet wat:
 *   medewerker   zijn eigen openstaande beoordelingen; geeft een beoordeling (één per dienst)
 *   werkgever    alleen gemiddelden (vanaf 3), nooit namen, datums per beoordeling of opmerkingen
 *   TopTalent    alles, inclusief opmerking en naam, en kan een beoordeling verbergen (moderatie)
 *
 * Zolang de tabel niet bestaat (42P01/PGRST205): `beschikbaar: false`, indienen geeft 503.
 */

type Een<T> = T | T[] | null | undefined;
const een = <T,>(v: Een<T>): T | null => (Array.isArray(v) ? (v[0] ?? null) : (v ?? null));

type DienstRij = {
  id: string;
  datum: string | null;
  start_tijd: string | null;
  eind_tijd: string | null;
  status: string | null;
  klant_id: string | null;
  klant_naam: string | null;
  functie: string | null;
  locatie: string | null;
  afbeelding_url: string | null;
};

type AanmeldingRij = {
  id: string;
  dienst_id: string;
  medewerker_id: string;
  status: string | null;
  uren_registraties: Een<{ status: string | null }> | { status: string | null }[];
  dienst: Een<DienstRij>;
};

const AANMELDING_SELECT =
  "id, dienst_id, medewerker_id, status, uren_registraties(status), dienst:diensten!inner(id, datum, start_tijd, eind_tijd, status, klant_id, klant_naam, functie, locatie, afbeelding_url)";

function urenStatussen(r: AanmeldingRij): (string | null)[] {
  const u = r.uren_registraties;
  if (!u) return [];
  return (Array.isArray(u) ? u : [u]).map((x) => x?.status ?? null);
}

function isAfgerond(r: AanmeldingRij, d: DienstRij, nu: Date): boolean {
  return isAfgerondVoorBeoordeling({ aanmelding_status: r.status, uren_statussen: urenStatussen(r), dienst: d }, nu);
}

export type OpenstaandeBeoordeling = {
  aanmelding_id: string;
  dienst_id: string;
  klant_id: string;
  bedrijfsnaam: string;
  bedrijf_foto_url: string | null;
  functie: string | null;
  datum: string;
  start_tijd: string | null;
  eind_tijd: string | null;
  locatie: string | null;
  foto: DienstFoto;
  /** Laatste dag (YYYY-MM-DD) waarop beoordelen kan. */
  beoordelen_tot: string;
};

/** Ids van de diensten die deze medewerker al beoordeeld heeft; null als de tabel niet bestaat. */
async function alBeoordeeld(medewerkerId: string, dienstIds: readonly string[]): Promise<Set<string> | null> {
  if (dienstIds.length === 0) {
    // Toch even kijken of de tabel bestaat, zodat `beschikbaar` klopt.
    const { error } = await supabaseAdmin.from("werkgever_beoordelingen").select("id").eq("medewerker_id", medewerkerId).limit(1);
    if (isOntbrekendeTabel(error)) return null;
    if (error) throw error;
    return new Set();
  }
  const { data, error } = await supabaseAdmin
    .from("werkgever_beoordelingen")
    .select("dienst_id")
    .eq("medewerker_id", medewerkerId)
    .in("dienst_id", [...dienstIds]);
  if (isOntbrekendeTabel(error)) return null;
  if (error) throw error;
  return new Set(((data ?? []) as { dienst_id: string }[]).map((r) => r.dienst_id));
}

/**
 * Afgeronde diensten van de laatste 14 dagen die de medewerker nog kan beoordelen (nieuwste eerst).
 * Alleen diensten met een werkgever (klant_id) uit dezelfde wereld (demo-scheiding).
 */
export async function haalOpenstaandeBeoordelingen(
  medewerkerId: string,
  nu: Date = new Date(),
): Promise<{ beschikbaar: boolean; openstaand: OpenstaandeBeoordeling[] }> {
  const vandaag = nlVandaag();
  const { data, error } = await supabaseAdmin
    .from("dienst_aanmeldingen")
    .select(AANMELDING_SELECT)
    .eq("medewerker_id", medewerkerId)
    .gte("dienst.datum", plusDagen(vandaag, -BEOORDEEL_TERMIJN_DAGEN))
    .lte("dienst.datum", vandaag)
    .limit(200);
  if (error) throw error;

  const demoIds = await haalDemoIds();
  const kandidaten: { a: AanmeldingRij; d: DienstRij & { klant_id: string; datum: string } }[] = [];
  for (const a of (data ?? []) as unknown as AanmeldingRij[]) {
    const d = een(a.dienst);
    if (!d?.klant_id || !d.datum) continue;
    if (!zelfdeWereld(demoIds, medewerkerId, d.klant_id)) continue;
    if (!binnenBeoordeelTermijn(d.datum, vandaag) || !isAfgerond(a, d, nu)) continue;
    kandidaten.push({ a, d: d as DienstRij & { klant_id: string; datum: string } });
  }

  const beoordeeld = await alBeoordeeld(medewerkerId, kandidaten.map((k) => k.d.id));
  if (beoordeeld === null) return { beschikbaar: false, openstaand: [] };
  const open = kandidaten.filter((k) => !beoordeeld.has(k.d.id));
  if (open.length === 0) return { beschikbaar: true, openstaand: [] };

  const klantIds = [...new Set(open.map((k) => k.d.klant_id))];
  type KlantRij = { id: string; bedrijfsnaam: string | null; bedrijf_foto_url?: string | null };
  const [vol, bedrijfsfotos] = await Promise.all([
    supabaseAdmin.from("klanten").select("id, bedrijfsnaam, bedrijf_foto_url").in("id", klantIds),
    haalBedrijfsfotos(klantIds),
  ]);
  const klanten = isOntbrekendeKolom(vol.error) ? await supabaseAdmin.from("klanten").select("id, bedrijfsnaam").in("id", klantIds) : vol;
  if (klanten.error) throw klanten.error;
  const perKlant = new Map(((klanten.data ?? []) as KlantRij[]).map((k) => [k.id, k]));

  const openstaand = open
    .map(({ a, d }): OpenstaandeBeoordeling => {
      const k = perKlant.get(d.klant_id);
      return {
        aanmelding_id: a.id,
        dienst_id: d.id,
        klant_id: d.klant_id,
        bedrijfsnaam: k?.bedrijfsnaam || d.klant_naam || "Onbekende werkgever",
        bedrijf_foto_url: k?.bedrijf_foto_url ?? null,
        functie: d.functie,
        datum: d.datum,
        start_tijd: d.start_tijd,
        eind_tijd: d.eind_tijd,
        locatie: d.locatie,
        foto: fotoVoorDienst(d, bedrijfsfotos.get(d.klant_id) ?? null),
        beoordelen_tot: beoordelenTot(d.datum),
      };
    })
    .sort((x, y) => y.datum.localeCompare(x.datum) || (y.start_tijd ?? "").localeCompare(x.start_tijd ?? ""));
  return { beschikbaar: true, openstaand };
}

export type IndienFout =
  | "niet_gevonden"
  | "geen_werkgever"
  | "niet_afgerond"
  | "termijn_verlopen"
  | "al_beoordeeld"
  | "niet_beschikbaar";

export type IndienResultaat =
  | { ok: true; beoordeling: { id: string; dienst_id: string; klant_id: string; score: number; created_at: string } }
  | { ok: false; fout: IndienFout };

/**
 * Beoordeling opslaan voor de dienst `dienstId` (of de aanmelding `aanmeldingId`) van deze medewerker.
 * Controleert eigenaarschap, demo-wereld, "afgerond" en de termijn; de unieke index
 * (medewerker_id, dienst_id) voorkomt een tweede beoordeling, ook bij twee gelijktijdige verzoeken.
 */
export async function dienWerkgeverBeoordelingIn(
  medewerkerId: string,
  dienst: { dienstId?: string | null; aanmeldingId?: string | null },
  waarde: WerkgeverBeoordelingInvoer,
  nu: Date = new Date(),
): Promise<IndienResultaat> {
  let q = supabaseAdmin.from("dienst_aanmeldingen").select(AANMELDING_SELECT).eq("medewerker_id", medewerkerId);
  if (dienst.aanmeldingId) q = q.eq("id", dienst.aanmeldingId);
  else if (dienst.dienstId) q = q.eq("dienst_id", dienst.dienstId);
  else return { ok: false, fout: "niet_gevonden" };
  const { data, error } = await q.limit(1);
  if (error) throw error;
  const a = ((data ?? []) as unknown as AanmeldingRij[])[0];
  const d = a ? een(a.dienst) : null;
  if (!a || !d) return { ok: false, fout: "niet_gevonden" };
  if (!d.klant_id) return { ok: false, fout: "geen_werkgever" };
  if (!zelfdeWereld(await haalDemoIds(), medewerkerId, d.klant_id)) return { ok: false, fout: "niet_gevonden" };
  if (!isAfgerond(a, d, nu)) return { ok: false, fout: "niet_afgerond" };
  if (!binnenBeoordeelTermijn(d.datum, nlVandaag())) return { ok: false, fout: "termijn_verlopen" };

  const { data: rij, error: insertFout } = await supabaseAdmin
    .from("werkgever_beoordelingen")
    .insert({
      medewerker_id: medewerkerId,
      klant_id: d.klant_id,
      dienst_id: d.id,
      aanmelding_id: a.id,
      ...waarde,
    })
    .select("id, dienst_id, klant_id, score, created_at")
    .single();
  if (isOntbrekendeTabel(insertFout)) return { ok: false, fout: "niet_beschikbaar" };
  if (insertFout?.code === "23505") return { ok: false, fout: "al_beoordeeld" };
  if (insertFout) throw insertFout;
  vergeetWerkgeverProfiel(d.klant_id);
  return { ok: true, beoordeling: rij as { id: string; dienst_id: string; klant_id: string; score: number; created_at: string } };
}

/**
 * Eigen beoordelingen van de medewerker voor deze diensten (`werkgever_beoordeling` in de dienstdata:
 * "Beoordeeld ★4" op elk toestel). Zonder tabel (migratie) een lege map.
 */
export async function haalEigenWerkgeverBeoordelingen(
  medewerkerId: string,
  dienstIds: readonly (string | null | undefined)[],
): Promise<Map<string, EigenWerkgeverBeoordeling>> {
  const ids = [...new Set(dienstIds.filter((id): id is string => !!id))];
  const rijen: { dienst_id: string | null; score: unknown }[] = [];
  for (let i = 0; i < ids.length; i += 150) {
    const { data, error } = await supabaseAdmin
      .from("werkgever_beoordelingen")
      .select("dienst_id, score")
      .eq("medewerker_id", medewerkerId)
      .in("dienst_id", ids.slice(i, i + 150));
    if (isOntbrekendeTabel(error)) return new Map();
    if (error) throw error;
    rijen.push(...((data ?? []) as { dienst_id: string | null; score: unknown }[]));
  }
  return eigenBeoordelingenPerDienst(rijen);
}

/**
 * Bij een verzoek om accountverwijdering: de beoordelingen van deze medewerker direct wissen (vallen
 * niet onder een bewaarplicht; privacybeleid 10e). Zonder tabel: niets te doen.
 */
export async function wisWerkgeverBeoordelingenMedewerker(medewerkerId: string): Promise<void> {
  const { data, error } = await supabaseAdmin
    .from("werkgever_beoordelingen")
    .delete()
    .eq("medewerker_id", medewerkerId)
    .select("klant_id");
  if (isOntbrekendeTabel(error)) return;
  if (error) throw error;
  for (const r of (data ?? []) as { klant_id: string }[]) vergeetWerkgeverProfiel(r.klant_id);
}

// ---------------------------------------------------------------------------------------------
// TopTalent (admin): lijst met opmerkingen en moderatie
// ---------------------------------------------------------------------------------------------

export type AdminWerkgeverBeoordeling = {
  id: string;
  score: number;
  score_instructies: number | null;
  score_sfeer: number | null;
  score_zoals_beschreven: number | null;
  opmerking: string | null;
  created_at: string;
  verborgen_op: string | null;
  verborgen_door: string | null;
  medewerker: { id: string; naam: string | null } | null;
  dienst: { id: string; datum: string | null; functie: string | null } | null;
};

/** Alle beoordelingen van een werkgever voor het klantdetail (nieuwste eerst, max. 200). */
export async function haalWerkgeverBeoordelingenVoorAdmin(
  klantId: string,
): Promise<{ beschikbaar: boolean; beoordelingen: AdminWerkgeverBeoordeling[] }> {
  const { data, error } = await supabaseAdmin
    .from("werkgever_beoordelingen")
    .select(
      "id, score, score_instructies, score_sfeer, score_zoals_beschreven, opmerking, created_at, verborgen_op, verborgen_door, medewerker:medewerkers(id, naam), dienst:diensten(id, datum, functie)",
    )
    .eq("klant_id", klantId)
    .order("created_at", { ascending: false })
    .limit(200);
  if (isOntbrekendeTabel(error)) return { beschikbaar: false, beoordelingen: [] };
  if (error) throw error;
  type Rij = Omit<AdminWerkgeverBeoordeling, "medewerker" | "dienst"> & {
    medewerker: Een<{ id: string; naam: string | null }>;
    dienst: Een<{ id: string; datum: string | null; functie: string | null }>;
  };
  return {
    beschikbaar: true,
    beoordelingen: ((data ?? []) as unknown as Rij[]).map((r) => ({ ...r, medewerker: een(r.medewerker), dienst: een(r.dienst) })),
  };
}

/**
 * Verbergen of weer tonen (moderatie). Een verborgen beoordeling telt nergens meer mee. Geeft null
 * als de beoordeling niet (bij deze klant) bestaat.
 */
export async function zetWerkgeverBeoordelingVerborgen(
  klantId: string,
  beoordelingId: string,
  verborgen: boolean,
  door: string | null,
): Promise<{ beschikbaar: boolean; bijgewerkt: { id: string; verborgen_op: string | null } | null }> {
  const { data, error } = await supabaseAdmin
    .from("werkgever_beoordelingen")
    .update(verborgen ? { verborgen_op: new Date().toISOString(), verborgen_door: door } : { verborgen_op: null, verborgen_door: null })
    .eq("id", beoordelingId)
    .eq("klant_id", klantId)
    .select("id, verborgen_op")
    .maybeSingle();
  if (isOntbrekendeTabel(error) || isOntbrekendeKolom(error)) return { beschikbaar: false, bijgewerkt: null };
  if (error) throw error;
  vergeetWerkgeverProfiel(klantId);
  return { beschikbaar: true, bijgewerkt: (data as { id: string; verborgen_op: string | null } | null) ?? null };
}
