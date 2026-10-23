/**
 * Pure regels voor afstand in Ontdekken en de gerichte push (stap 3, "Ontdekken zoals YoungOnes").
 * Geen database en geen fetch: ook in de browser te gebruiken en getest in
 * tests/unit/locatie-regels.spec.ts. Het ophalen staat in lib/locatie/pdok.ts, het opslaan in
 * lib/locatie/locatie-opslag.ts.
 *
 * Privacy: we geocoderen ALLEEN een postcode (zes tekens, geen huisnummer of straat) naar het
 * middelpunt van dat postcodegebied, via de PDOK Locatieserver van de overheid. De coördinaten
 * worden afgerond op 3 decimalen (± 100 m) opgeslagen. Afstand = hemelsbreed (haversine), geen
 * reistijd of route.
 */

export type Coordinaat = { lat: number; lng: number };

/** Nederlandse postcode zonder spatie, hoofdletters: "3511AB". SA, SD en SS worden niet uitgegeven. */
const POSTCODE = /^[1-9][0-9]{3}(?!SA|SD|SS)[A-Z]{2}$/;

/** "3511 ab" / " 3511AB " → "3511AB"; anders null. */
export function normaliseerPostcode(waarde: unknown): string | null {
  if (typeof waarde !== "string") return null;
  const schoon = waarde.replace(/\s+/g, "").toUpperCase();
  return POSTCODE.test(schoon) ? schoon : null;
}

/**
 * Eerste Nederlandse postcode in vrije tekst (de locatie van een dienst), bv.
 * "Oudegracht 1, 3511 AB Utrecht" → "3511AB". Letters in hoofdletters (met of zonder spatie) of
 * kleine letters direct na de cijfers ("3511ab"), zodat "Plein 1940 de Bilt" geen postcode wordt.
 */
export function postcodeUitTekst(tekst: unknown): string | null {
  if (typeof tekst !== "string" || !tekst) return null;
  const patroon = /(?:^|[^0-9A-Za-z])([1-9][0-9]{3})(?: ?([A-Z]{2})|([a-z]{2}))(?![0-9A-Za-z])/g;
  for (const m of tekst.matchAll(patroon)) {
    const kandidaat = normaliseerPostcode(`${m[1]}${m[2] ?? m[3] ?? ""}`);
    if (kandidaat) return kandidaat;
  }
  return null;
}

/** Postcode voor een dienst: uit de locatie, anders die van de klant. */
export function postcodeVoorDienst(locatie: unknown, klantPostcode: unknown): string | null {
  return postcodeUitTekst(locatie) ?? normaliseerPostcode(klantPostcode);
}

/** Afronden op 3 decimalen (± 100 m): genoeg voor "± X km", niet herleidbaar tot een adres. */
export function rondCoordinaat(n: number): number {
  return Math.round(n * 1000) / 1000;
}

/** Ruime grenzen van Nederland (incl. Wadden en Zuid-Limburg): alles daarbuiten is een fout. */
function inNederland(c: Coordinaat): boolean {
  return c.lat >= 50.6 && c.lat <= 53.7 && c.lng >= 3.2 && c.lng <= 7.3;
}

/** Waarden uit de database (numeric kan als string binnenkomen) → Coordinaat, of null. */
export function naarCoordinaat(lat: unknown, lng: unknown): Coordinaat | null {
  if (lat == null || lng == null || lat === "" || lng === "") return null;
  const c = { lat: Number(lat), lng: Number(lng) };
  if (!Number.isFinite(c.lat) || !Number.isFinite(c.lng)) return null;
  return inNederland(c) ? c : null;
}

/** "POINT(5.11603355 52.09584531)" (lengte, breedte) → afgeronde Coordinaat, of null. */
export function parseCentroideLl(waarde: unknown): Coordinaat | null {
  if (typeof waarde !== "string") return null;
  const m = /^POINT\(\s*(-?\d+(?:\.\d+)?)\s+(-?\d+(?:\.\d+)?)\s*\)$/.exec(waarde.trim());
  if (!m) return null;
  return naarCoordinaat(rondCoordinaat(Number(m[2])), rondCoordinaat(Number(m[1])));
}

/**
 * Antwoord van de PDOK Locatieserver (free, fq=type:postcode, rows=1) lezen. Alleen een
 * resultaat voor precies déze postcode telt (geen "lijkt op"-treffer van een andere postcode).
 */
export function leesPdokAntwoord(json: unknown, postcode: string): Coordinaat | null {
  const docs = (json as { response?: { docs?: unknown } } | null)?.response?.docs;
  if (!Array.isArray(docs)) return null;
  for (const doc of docs as Record<string, unknown>[]) {
    if (normaliseerPostcode(doc?.postcode) !== postcode) continue;
    const c = parseCentroideLl(doc?.centroide_ll);
    if (c) return c;
  }
  return null;
}

/** Hemelsbrede afstand in km (haversine, aardstraal 6371 km). */
export function afstandKm(a: Coordinaat, b: Coordinaat): number {
  const rad = (g: number) => (g * Math.PI) / 180;
  const dLat = rad(b.lat - a.lat);
  const dLng = rad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * 6371 * Math.asin(Math.min(1, Math.sqrt(h)));
}

/** Afstand voor de API: 1 decimaal, of null als een van beide locaties onbekend is. */
export function afstandTussen(a: Coordinaat | null, b: Coordinaat | null): number | null {
  if (!a || !b) return null;
  return Math.round(afstandKm(a, b) * 10) / 10;
}

/** "± 12 km hemelsbreed" / "minder dan 1 km hemelsbreed"; null bij onbekende afstand. */
export function afstandLabel(km: number | null | undefined): string | null {
  if (km == null || !Number.isFinite(km)) return null;
  if (km < 1) return "minder dan 1 km hemelsbreed";
  return `± ${Math.round(km)} km hemelsbreed`;
}

/** Grens voor `max_afstand_km` (instelling en filter). */
export const MAX_AFSTAND_GRENS_KM = 200;
/** Keuzes in het portaal (en de app); de API accepteert elk geheel getal van 1 t/m 200. */
export const MAX_AFSTAND_OPTIES_KM = [5, 10, 15, 25, 40, 60] as const;

export type AfstandResultaat = { ok: true; waarde: number | null } | { ok: false; error: string };

/** `max_afstand_km` uit een body of querystring: null/"" = geen grens, anders 1 t/m 200 km. */
export function parseMaxAfstandKm(waarde: unknown): AfstandResultaat {
  if (waarde === null || waarde === undefined || waarde === "") return { ok: true, waarde: null };
  const n = typeof waarde === "number" ? waarde : typeof waarde === "string" ? Number(waarde.trim().replace(",", ".")) : NaN;
  if (!Number.isFinite(n) || n < 1 || n > MAX_AFSTAND_GRENS_KM) {
    return { ok: false, error: `Kies een maximale afstand tussen 1 en ${MAX_AFSTAND_GRENS_KM} km, of geen grens.` };
  }
  return { ok: true, waarde: Math.round(n) };
}

/**
 * Velden om de globale locatie te wissen bij een verwijderverzoek (medewerker) of het verwijderen
 * van een account (diensten van een klant). `geo_bijgewerkt_op` krijgt een tijdstip, zodat de
 * backfill de rij niet opnieuw oppakt.
 */
export function gewisteGeoVelden(nu: Date = new Date()): {
  geo_lat: null;
  geo_lng: null;
  geo_postcode: null;
  geo_bijgewerkt_op: string;
} {
  return { geo_lat: null, geo_lng: null, geo_postcode: null, geo_bijgewerkt_op: nu.toISOString() };
}

/** Bij een medewerker ook de maximale afstand (een eigen instelling) wissen. */
export function gewisteOntdekVeldenMedewerker(nu: Date = new Date()): ReturnType<typeof gewisteGeoVelden> & { max_afstand_km: null } {
  return { ...gewisteGeoVelden(nu), max_afstand_km: null };
}
