import { leesPdokAntwoord, normaliseerPostcode, type Coordinaat } from "@/lib/locatie/locatie-regels";

/**
 * Postcode → globale locatie via de PDOK Locatieserver (Kadaster/BZK, gratis, geen sleutel).
 * We sturen ALLEEN de postcode (zes tekens), nooit een straat, huisnummer, naam of id.
 *
 * Endpoint en antwoord gecontroleerd op 23-10-2026 met het openbare voorbeeld 3511AB:
 *   GET https://api.pdok.nl/bzk/locatieserver/search/v3_1/free?q=3511AB&fq=type:postcode&rows=1&fl=postcode,centroide_ll
 *   → { response: { numFound: 1, docs: [{ postcode: "3511AB", centroide_ll: "POINT(5.11603355 52.09584531)" }] } }
 *   Een onbekende postcode geeft numFound 0 en docs [].
 *
 * Korte time-out; een fout of geen resultaat blokkeert nooit (de aanroeper slaat dan geen locatie op).
 */

const PDOK_URL = "https://api.pdok.nl/bzk/locatieserver/search/v3_1/free";
export const PDOK_TIMEOUT_MS = 2500;

export type GeocodeResultaat =
  | ({ soort: "ok" } & Coordinaat)
  /** PDOK kent deze postcode niet. */
  | { soort: "geen" }
  /** Netwerk, time-out of onverwacht antwoord: later opnieuw proberen. */
  | { soort: "fout"; reden: string };

/** Per serverinstantie: dezelfde postcode niet steeds opnieuw opvragen (backfill, meerdere diensten). */
const CACHE_MS = 24 * 60 * 60 * 1000;
const cache = new Map<string, { tot: number; resultaat: GeocodeResultaat }>();

export async function geocodeerPostcode(
  postcode: string,
  opties: { timeoutMs?: number; fetchFn?: typeof fetch } = {},
): Promise<GeocodeResultaat> {
  const pc = normaliseerPostcode(postcode);
  if (!pc) return { soort: "geen" };

  const bewaard = cache.get(pc);
  if (bewaard && bewaard.tot > Date.now()) return bewaard.resultaat;

  const url = `${PDOK_URL}?${new URLSearchParams({ q: pc, fq: "type:postcode", rows: "1", fl: "postcode,centroide_ll" })}`;
  const doeFetch = opties.fetchFn ?? fetch;
  let resultaat: GeocodeResultaat;
  try {
    const res = await doeFetch(url, {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(opties.timeoutMs ?? PDOK_TIMEOUT_MS),
      cache: "no-store",
    });
    if (!res.ok) return { soort: "fout", reden: `http_${res.status}` };
    const c = leesPdokAntwoord(await res.json(), pc);
    resultaat = c ? { soort: "ok", ...c } : { soort: "geen" };
  } catch (e) {
    return { soort: "fout", reden: e instanceof Error ? e.name : "onbekend" };
  }
  cache.set(pc, { tot: Date.now() + CACHE_MS, resultaat });
  return resultaat;
}

/** Alleen voor tests. */
export function _leegPdokCache(): void {
  cache.clear();
}
