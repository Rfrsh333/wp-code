import { supabaseAdmin } from "@/lib/supabase";
import { isOntbrekendeKolom } from "@/lib/db-kolom-fallback";
import { captureRouteError } from "@/lib/sentry-utils";
import { fotoVoorDienst, opslagPadVanUpload, type DienstFoto, type DienstFotoInvoer } from "@/lib/sfeerfotos";

/**
 * DB-kant van de sfeerfoto's (pure regels in lib/sfeerfotos.ts). klanten.foto_url bestaat pas na
 * migratie 20261023_bedrijfsfoto.sql; zolang die niet gedraaid is, heeft niemand een bedrijfsfoto
 * en krijgt elke dienst zonder eigen foto een standaardfoto. Een foto is nooit een reden voor een
 * 500: bij een andere fout gaat die naar Sentry en valt de dienst terug op de standaardfoto.
 */

export const BEDRIJFSFOTO_BUCKET = "dienst-afbeeldingen";

/** klant-id → foto_url (alleen klanten die er een hebben). */
export async function haalBedrijfsfotos(klantIds: readonly (string | null | undefined)[]): Promise<Map<string, string>> {
  const uit = new Map<string, string>();
  const ids = [...new Set(klantIds.filter((i): i is string => typeof i === "string" && i.length > 0))];
  for (let i = 0; i < ids.length; i += 150) {
    const { data, error } = await supabaseAdmin.from("klanten").select("id, foto_url").in("id", ids.slice(i, i + 150));
    if (isOntbrekendeKolom(error)) return uit;
    if (error) {
      captureRouteError(error, { route: "lib/sfeerfotos-opslag", action: "BEDRIJFSFOTOS" });
      return uit;
    }
    for (const k of (data ?? []) as { id: string; foto_url: string | null }[]) {
      if (k.foto_url) uit.set(k.id, k.foto_url);
    }
  }
  return uit;
}

export type DienstMetKlant = DienstFotoInvoer & { klant_id?: string | null };

/** `foto` per dienst-id voor een lijst diensten (één query voor alle bedrijfsfoto's). */
export async function fotosVoorDiensten(diensten: readonly DienstMetKlant[]): Promise<Map<string, DienstFoto>> {
  const bedrijfsfotos = await haalBedrijfsfotos(diensten.map((d) => d.klant_id));
  return new Map(diensten.map((d) => [d.id, fotoVoorDienst(d, d.klant_id ? bedrijfsfotos.get(d.klant_id) : null)]));
}

/** Leest klanten.foto_url. `beschikbaar: false` zolang de migratie niet gedraaid is. */
export async function leesBedrijfsfoto(klantId: string): Promise<{ beschikbaar: boolean; fotoUrl: string | null }> {
  const { data, error } = await supabaseAdmin.from("klanten").select("foto_url").eq("id", klantId).maybeSingle();
  if (isOntbrekendeKolom(error)) return { beschikbaar: false, fotoUrl: null };
  if (error) throw error;
  return { beschikbaar: true, fotoUrl: (data as { foto_url?: string | null } | null)?.foto_url ?? null };
}

/**
 * Ruimt een eerder geüploade bedrijfsfoto van deze klant op (alleen uit bedrijven/<klantId>/, nooit
 * een catalogusfoto of een dienstfoto). Mislukt het, dan blijft er een los bestand staan: geen fout.
 */
export async function verwijderBedrijfsfotoBestand(klantId: string, fotoUrl: string | null | undefined): Promise<void> {
  const pad = opslagPadVanUpload(fotoUrl, { klantId, map: "bedrijven", supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL });
  if (!pad) return;
  const { error } = await supabaseAdmin.storage.from(BEDRIJFSFOTO_BUCKET).remove([pad]);
  if (error) captureRouteError(error, { route: "lib/sfeerfotos-opslag", action: "BEDRIJFSFOTO_OPRUIMEN" });
}

/**
 * `foto` per dienst-id als de query zelf geen functie/afbeelding_url ophaalt (bv. de uren-API's,
 * die via gedeelde queries in lib/medewerker/uren lopen). Eén extra query; een fout geeft een lege
 * map (de aanroeper valt dan terug op geen foto, nooit op een 500).
 */
export async function fotosVoorDienstIds(dienstIds: readonly (string | null | undefined)[]): Promise<Map<string, DienstFoto>> {
  const ids = [...new Set(dienstIds.filter((i): i is string => typeof i === "string" && i.length > 0))];
  const diensten: DienstMetKlant[] = [];
  for (let i = 0; i < ids.length; i += 150) {
    const { data, error } = await supabaseAdmin
      .from("diensten")
      .select("id, functie, afbeelding_url, klant_id")
      .in("id", ids.slice(i, i + 150));
    if (error) {
      captureRouteError(error, { route: "lib/sfeerfotos-opslag", action: "FOTOS_DIENST_IDS" });
      return new Map();
    }
    diensten.push(...((data ?? []) as DienstMetKlant[]));
  }
  return fotosVoorDiensten(diensten);
}
