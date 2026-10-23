import { supabaseAdmin } from "@/lib/supabase";
import { isOntbrekendeKolom, type DbFout } from "@/lib/db-kolom-fallback";
import type { VoorkeurSoort } from "@/lib/medewerker/ontdekken-regels";

/**
 * Werkgevers bewaren (favoriet) of verbergen door de medewerker: tabel
 * medewerker_werkgever_voorkeuren (migratie 20261023_ontdekken_afstand_werkgevers.sql), één rij per
 * medewerker en klant, soort favoriet óf verborgen. Verbergen van een favoriet vervangt die dus.
 *
 * Zolang de tabel niet bestaat (42P01 / PostgREST PGRST205) is alles leeg en geeft opslaan
 * `beschikbaar: false`; de rest van Ontdekken werkt dan zoals voorheen.
 */

/** Tabel bestaat (nog) niet: Postgres 42P01, PostgREST PGRST205 ("Could not find the table"). */
export function isOntbrekendeTabel(fout: DbFout): boolean {
  return !!fout && (fout.code === "42P01" || fout.code === "PGRST205");
}

export type Voorkeuren = { beschikbaar: boolean; favoriet: Set<string>; verborgen: Set<string> };

export async function haalVoorkeuren(medewerkerId: string): Promise<Voorkeuren> {
  const { data, error } = await supabaseAdmin
    .from("medewerker_werkgever_voorkeuren")
    .select("klant_id, soort")
    .eq("medewerker_id", medewerkerId)
    .limit(1000);
  if (isOntbrekendeTabel(error)) return { beschikbaar: false, favoriet: new Set(), verborgen: new Set() };
  if (error) throw error;
  const favoriet = new Set<string>();
  const verborgen = new Set<string>();
  for (const r of (data ?? []) as { klant_id: string; soort: string }[]) {
    if (r.soort === "favoriet") favoriet.add(r.klant_id);
    else if (r.soort === "verborgen") verborgen.add(r.klant_id);
  }
  return { beschikbaar: true, favoriet, verborgen };
}

export type WerkgeverRegel = {
  klant_id: string;
  bedrijfsnaam: string;
  bedrijf_foto_url: string | null;
  /** Wanneer bewaard of verborgen (ISO). */
  sinds: string | null;
};

/** Lijsten voor Account → "Favoriete werkgevers" en "Verborgen werkgevers". */
export async function lijstVoorkeuren(
  medewerkerId: string,
): Promise<{ beschikbaar: boolean; favoriet: WerkgeverRegel[]; verborgen: WerkgeverRegel[] }> {
  const { data, error } = await supabaseAdmin
    .from("medewerker_werkgever_voorkeuren")
    .select("klant_id, soort, created_at")
    .eq("medewerker_id", medewerkerId)
    .order("created_at", { ascending: false })
    .limit(1000);
  if (isOntbrekendeTabel(error)) return { beschikbaar: false, favoriet: [], verborgen: [] };
  if (error) throw error;
  const rijen = (data ?? []) as { klant_id: string; soort: string; created_at: string | null }[];
  const ids = [...new Set(rijen.map((r) => r.klant_id))];

  const namen = new Map<string, { bedrijfsnaam: string | null; bedrijf_foto_url: string | null }>();
  if (ids.length > 0) {
    type KlantRij = { id: string; bedrijfsnaam: string | null; bedrijf_foto_url?: string | null };
    const vol = await supabaseAdmin.from("klanten").select("id, bedrijfsnaam, bedrijf_foto_url").in("id", ids);
    const klanten = isOntbrekendeKolom(vol.error) ? await supabaseAdmin.from("klanten").select("id, bedrijfsnaam").in("id", ids) : vol;
    if (klanten.error) throw klanten.error;
    for (const k of (klanten.data ?? []) as KlantRij[]) {
      namen.set(k.id, { bedrijfsnaam: k.bedrijfsnaam, bedrijf_foto_url: k.bedrijf_foto_url ?? null });
    }
  }

  const naarRegel = (r: (typeof rijen)[number]): WerkgeverRegel => ({
    klant_id: r.klant_id,
    bedrijfsnaam: namen.get(r.klant_id)?.bedrijfsnaam || "Onbekende werkgever",
    bedrijf_foto_url: namen.get(r.klant_id)?.bedrijf_foto_url ?? null,
    sinds: r.created_at,
  });
  return {
    beschikbaar: true,
    favoriet: rijen.filter((r) => r.soort === "favoriet").map(naarRegel),
    verborgen: rijen.filter((r) => r.soort === "verborgen").map(naarRegel),
  };
}

/** Favoriet of verborgen zetten (vervangt een eerdere keuze voor dezelfde werkgever). */
export async function zetVoorkeur(medewerkerId: string, klantId: string, soort: VoorkeurSoort): Promise<{ beschikbaar: boolean }> {
  const { error } = await supabaseAdmin
    .from("medewerker_werkgever_voorkeuren")
    .upsert({ medewerker_id: medewerkerId, klant_id: klantId, soort, created_at: new Date().toISOString() }, { onConflict: "medewerker_id,klant_id" });
  if (isOntbrekendeTabel(error)) return { beschikbaar: false };
  if (error) throw error;
  return { beschikbaar: true };
}

/** Opheffen; met `soort` alleen als het die soort is (bv. "niet meer verbergen" laat een favoriet staan). */
export async function verwijderVoorkeur(medewerkerId: string, klantId: string, soort?: VoorkeurSoort): Promise<{ beschikbaar: boolean }> {
  let q = supabaseAdmin.from("medewerker_werkgever_voorkeuren").delete().eq("medewerker_id", medewerkerId).eq("klant_id", klantId);
  if (soort) q = q.eq("soort", soort);
  const { error } = await q;
  if (isOntbrekendeTabel(error)) return { beschikbaar: false };
  if (error) throw error;
  return { beschikbaar: true };
}
