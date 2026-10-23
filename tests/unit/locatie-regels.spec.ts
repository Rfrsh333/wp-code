import { test, expect } from "@playwright/test";
import {
  afstandKm,
  afstandLabel,
  afstandTussen,
  leesPdokAntwoord,
  naarCoordinaat,
  normaliseerPostcode,
  parseCentroideLl,
  parseMaxAfstandKm,
  postcodeUitTekst,
  postcodeVoorDienst,
  rondCoordinaat,
} from "../../src/lib/locatie/locatie-regels";
import { _leegPdokCache, geocodeerPostcode } from "../../src/lib/locatie/pdok";

// Openbaar voorbeeld (Oudegracht, Utrecht), zoals PDOK het op 23-10-2026 teruggaf.
const PDOK_3511AB = {
  response: {
    numFound: 1,
    start: 0,
    docs: [{ type: "postcode", postcode: "3511AB", woonplaatsnaam: "Utrecht", centroide_ll: "POINT(5.11603355 52.09584531)" }],
  },
};
const PDOK_LEEG = { response: { numFound: 0, start: 0, docs: [] } };

test.describe("postcodes", () => {
  test("normaliseerPostcode: spaties en kleine letters weg, alleen geldige NL-postcodes", () => {
    expect(normaliseerPostcode("3511 ab")).toBe("3511AB");
    expect(normaliseerPostcode(" 3511AB ")).toBe("3511AB");
    expect(normaliseerPostcode("0511AB")).toBeNull(); // begint nooit met 0
    expect(normaliseerPostcode("3511SA")).toBeNull(); // SA, SD en SS bestaan niet
    expect(normaliseerPostcode("3511A")).toBeNull();
    expect(normaliseerPostcode(3511)).toBeNull();
    expect(normaliseerPostcode(null)).toBeNull();
  });

  test("postcodeUitTekst: eerste postcode uit een vrije locatie, geen woorden als postcode", () => {
    expect(postcodeUitTekst("Oudegracht 1, 3511 AB Utrecht")).toBe("3511AB");
    expect(postcodeUitTekst("Oudegracht 1, 3511AB, Utrecht")).toBe("3511AB");
    expect(postcodeUitTekst("Damrak 1 1012lg amsterdam")).toBe("1012LG");
    expect(postcodeUitTekst("Plein 1940 de Bilt")).toBeNull();
    expect(postcodeUitTekst("Zaal 2 (1e verdieping)")).toBeNull();
    expect(postcodeUitTekst("Hal 12345 AB")).toBeNull();
    expect(postcodeUitTekst("")).toBeNull();
    expect(postcodeUitTekst(undefined)).toBeNull();
  });

  test("postcodeVoorDienst: locatie gaat voor, anders de postcode van de klant", () => {
    expect(postcodeVoorDienst("Oudegracht 1, 3511 AB Utrecht", "1012 LG")).toBe("3511AB");
    expect(postcodeVoorDienst("Restaurant aan de gracht", "1012 lg")).toBe("1012LG");
    expect(postcodeVoorDienst(null, null)).toBeNull();
  });
});

test.describe("coördinaten en afstand", () => {
  test("parseCentroideLl: POINT(lengte breedte) → afgerond op 3 decimalen", () => {
    expect(parseCentroideLl("POINT(5.11603355 52.09584531)")).toEqual({ lat: 52.096, lng: 5.116 });
    expect(parseCentroideLl("POINT(5.1 52.1")).toBeNull();
    expect(parseCentroideLl("POINT(-74.0 40.7)")).toBeNull(); // buiten Nederland
    expect(parseCentroideLl(null)).toBeNull();
  });

  test("leesPdokAntwoord: alleen een treffer voor precies deze postcode telt", () => {
    expect(leesPdokAntwoord(PDOK_3511AB, "3511AB")).toEqual({ lat: 52.096, lng: 5.116 });
    expect(leesPdokAntwoord(PDOK_3511AB, "3511AC")).toBeNull();
    expect(leesPdokAntwoord(PDOK_LEEG, "3511AB")).toBeNull();
    expect(leesPdokAntwoord({ fout: true }, "3511AB")).toBeNull();
    expect(leesPdokAntwoord(null, "3511AB")).toBeNull();
  });

  test("naarCoordinaat: getallen of strings uit de database, null bij onbekend of onzin", () => {
    expect(naarCoordinaat("52.096", "5.116")).toEqual({ lat: 52.096, lng: 5.116 });
    expect(naarCoordinaat(52.096, 5.116)).toEqual({ lat: 52.096, lng: 5.116 });
    expect(naarCoordinaat(null, 5.1)).toBeNull();
    expect(naarCoordinaat("", "")).toBeNull();
    expect(naarCoordinaat(0, 0)).toBeNull();
  });

  test("rondCoordinaat: 3 decimalen", () => {
    expect(rondCoordinaat(52.09584531)).toBe(52.096);
    expect(rondCoordinaat(5.11603355)).toBe(5.116);
  });

  test("afstandKm: hemelsbreed (haversine), Utrecht centrum → Amsterdam Dam ± 34 km", () => {
    const utrecht = { lat: 52.096, lng: 5.116 };
    const dam = { lat: 52.373, lng: 4.893 };
    const km = afstandKm(utrecht, dam);
    expect(km).toBeGreaterThan(33);
    expect(km).toBeLessThan(36);
    expect(afstandKm(utrecht, utrecht)).toBe(0);
    expect(afstandTussen(utrecht, dam)).toBe(Math.round(km * 10) / 10);
    expect(afstandTussen(utrecht, null)).toBeNull();
  });

  test("afstandLabel: altijd met 'hemelsbreed'", () => {
    expect(afstandLabel(12.4)).toBe("± 12 km hemelsbreed");
    expect(afstandLabel(0.4)).toBe("minder dan 1 km hemelsbreed");
    expect(afstandLabel(null)).toBeNull();
  });

  test("parseMaxAfstandKm: leeg = geen grens, 1 t/m 200 km, afgerond", () => {
    expect(parseMaxAfstandKm(null)).toEqual({ ok: true, waarde: null });
    expect(parseMaxAfstandKm("")).toEqual({ ok: true, waarde: null });
    expect(parseMaxAfstandKm(25)).toEqual({ ok: true, waarde: 25 });
    expect(parseMaxAfstandKm("12,6")).toEqual({ ok: true, waarde: 13 });
    expect(parseMaxAfstandKm(0).ok).toBe(false);
    expect(parseMaxAfstandKm(201).ok).toBe(false);
    expect(parseMaxAfstandKm("ver").ok).toBe(false);
  });
});

test.describe("geocodeerPostcode (PDOK, met nep-fetch: er gaat niets naar buiten)", () => {
  test.beforeEach(() => _leegPdokCache());

  const nepFetch = (antwoord: unknown, status = 200) => {
    const urls: string[] = [];
    const fn = (async (url: string | URL | Request) => {
      urls.push(String(url));
      return new Response(JSON.stringify(antwoord), { status, headers: { "Content-Type": "application/json" } });
    }) as typeof fetch;
    return { fn, urls };
  };

  test("stuurt alleen de postcode en geeft de afgeronde locatie", async () => {
    const { fn, urls } = nepFetch(PDOK_3511AB);
    expect(await geocodeerPostcode("3511 ab", { fetchFn: fn })).toEqual({ soort: "ok", lat: 52.096, lng: 5.116 });
    expect(urls).toHaveLength(1);
    const url = new URL(urls[0]);
    expect(url.origin + url.pathname).toBe("https://api.pdok.nl/bzk/locatieserver/search/v3_1/free");
    expect(url.searchParams.get("q")).toBe("3511AB");
    expect(url.searchParams.get("fq")).toBe("type:postcode");
    expect(url.searchParams.get("rows")).toBe("1");
  });

  test("onbekende postcode → geen; ongeldige postcode gaat niet naar PDOK", async () => {
    const { fn, urls } = nepFetch(PDOK_LEEG);
    expect(await geocodeerPostcode("9999ZZ", { fetchFn: fn })).toEqual({ soort: "geen" });
    expect(await geocodeerPostcode("Oudegracht 1", { fetchFn: fn })).toEqual({ soort: "geen" });
    expect(urls).toHaveLength(1);
  });

  test("HTTP-fout of netwerkfout → fout (niet blokkeren, later opnieuw)", async () => {
    const { fn } = nepFetch({}, 503);
    expect(await geocodeerPostcode("3511AB", { fetchFn: fn })).toEqual({ soort: "fout", reden: "http_503" });
    const kapot = (async () => {
      throw new DOMException("time-out", "TimeoutError");
    }) as typeof fetch;
    expect(await geocodeerPostcode("3511AB", { fetchFn: kapot })).toEqual({ soort: "fout", reden: "TimeoutError" });
  });

  test("tweede keer dezelfde postcode komt uit de cache", async () => {
    const { fn, urls } = nepFetch(PDOK_3511AB);
    await geocodeerPostcode("3511AB", { fetchFn: fn });
    await geocodeerPostcode("3511 AB", { fetchFn: fn });
    expect(urls).toHaveLength(1);
  });
});
