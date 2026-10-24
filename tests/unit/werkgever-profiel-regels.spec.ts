import { test, expect } from "@playwright/test";
import {
  BETAAL_PERIODE_DAGEN,
  DIRECT_INGEPLAND_SECONDEN,
  LEEG_PROFIEL,
  MIN_WAARNEMINGEN,
  betaaltBinnen,
  betaaltBinnenTekst,
  bouwWerkgeverProfiel,
  compactProfiel,
  heeftKengetallen,
  isGekozen,
  kiesPercentage,
  kiestBinnen,
  kiestBinnenTekst,
  mediaan,
  scoreSamenvatting,
  scoreTekst,
  type BeoordelingRij,
  type BetaalRij,
  type ReactieRij,
} from "../../src/lib/werkgever-profiel-regels";

const NU = new Date("2026-10-23T12:00:00Z");
const urenGeleden = (u: number) => new Date(NU.getTime() - u * 3600_000).toISOString();
/** Aanmelding `aanmeldUren` geleden, beslissing `beslisUren` geleden. */
const beslis = (aanmeldUren: number, beslisUren: number) => ({ aangemeld_at: urenGeleden(aanmeldUren), beoordeeld_at: urenGeleden(beslisUren) });

test.describe("mediaan", () => {
  test("oneven, even, leeg", () => {
    expect(mediaan([5, 1, 3])).toBe(3);
    expect(mediaan([4, 1, 3, 2])).toBe(2.5);
    expect(mediaan([])).toBeNull();
  });
});

test.describe("scoreSamenvatting", () => {
  const r = (score: number, deel: Partial<BeoordelingRij> = {}): BeoordelingRij => ({ score, ...deel });

  test(`onder ${MIN_WAARNEMINGEN} beoordelingen geen gemiddelde, wel het aantal`, () => {
    const s = scoreSamenvatting([r(5), r(4)]);
    expect(s.gemiddelde).toBeNull();
    expect(s.aantal).toBe(2);
  });

  test("gemiddelde op 1 decimaal vanaf 3", () => {
    expect(scoreSamenvatting([r(5), r(4), r(4)]).gemiddelde).toBe(4.3);
    expect(scoreSamenvatting([r(5), r(5), r(4), r(3)]).gemiddelde).toBe(4.3);
  });

  test("verborgen (gemodereerde) en ongeldige beoordelingen tellen niet mee", () => {
    const s = scoreSamenvatting([r(1, { verborgen_op: "2026-10-01T00:00:00Z" }), r(5), r(5), r(5), r(0), r(6), { score: null }]);
    expect(s.aantal).toBe(3);
    expect(s.gemiddelde).toBe(5);
  });

  test("deelscores tellen apart, elk met het eigen minimum", () => {
    const s = scoreSamenvatting([
      r(5, { score_instructies: 4, score_sfeer: 5 }),
      r(4, { score_instructies: 3, score_sfeer: 5 }),
      r(3, { score_instructies: 2 }),
    ]);
    expect(s.deelscores.instructies).toBe(3);
    expect(s.aantal_deelscores.instructies).toBe(3);
    expect(s.deelscores.sfeer).toBeNull();
    expect(s.aantal_deelscores.sfeer).toBe(2);
    expect(s.deelscores.zoals_beschreven).toBeNull();
    expect(s.aantal_deelscores.zoals_beschreven).toBe(0);
  });
});

test.describe("kiestBinnen", () => {
  test("mediaan in uren over beslissingen in de laatste 90 dagen", () => {
    const k = kiestBinnen([beslis(10, 8), beslis(30, 20), beslis(50, 46)], NU);
    expect(k).toEqual({ uren: 4, aantal: 3 });
  });

  test("onder het minimum: null, met het aantal", () => {
    expect(kiestBinnen([beslis(10, 8), beslis(30, 20)], NU)).toEqual({ uren: null, aantal: 2 });
  });

  test("beslissingen ouder dan 90 dagen tellen niet", () => {
    const oud = beslis(91 * 24 + 5, 91 * 24);
    expect(kiestBinnen([oud, beslis(10, 8), beslis(30, 20)], NU).aantal).toBe(2);
  });

  test("directe inplanning door TopTalent (spoeddienst) telt niet", () => {
    const direct = { aangemeld_at: urenGeleden(5), beoordeeld_at: new Date(new Date(urenGeleden(5)).getTime() + DIRECT_INGEPLAND_SECONDEN * 1000).toISOString() };
    expect(kiestBinnen([direct, beslis(10, 8), beslis(30, 20)], NU).aantal).toBe(2);
  });

  test("ontbrekende of onlogische datums tellen niet", () => {
    const rijen = [
      { aangemeld_at: null, beoordeeld_at: urenGeleden(1) },
      { aangemeld_at: urenGeleden(1), beoordeeld_at: null },
      { aangemeld_at: "geen datum", beoordeeld_at: urenGeleden(1) },
      beslis(1, 3), // beslissing vóór aanmelding
      { aangemeld_at: urenGeleden(1), beoordeeld_at: new Date(NU.getTime() + 3600_000).toISOString() }, // toekomst
    ];
    expect(kiestBinnen(rijen, NU)).toEqual({ uren: null, aantal: 0 });
  });

  test("afronding op 1 decimaal", () => {
    expect(kiestBinnen([beslis(1.26, 0), beslis(2, 0), beslis(3, 0)], NU).uren).toBe(2);
    expect(kiestBinnen([beslis(1.2, 0), beslis(1.4, 0), beslis(3, 0), beslis(4, 0)], NU).uren).toBe(2.2);
  });
});

test.describe("kiesPercentage", () => {
  const r = (dienst_id: string, status: string, beoordeeld_at: string | null = null): ReactieRij => ({ dienst_id, status, beoordeeld_at });

  test("alleen diensten met minstens één reactie tellen", () => {
    const k = kiesPercentage(["a", "b", "c", "d", "leeg"], [
      r("a", "geaccepteerd", urenGeleden(1)),
      r("a", "afgewezen", urenGeleden(1)),
      r("b", "afgewezen", urenGeleden(1)),
      r("c", "bevestigd"),
      r("d", "aangemeld"),
    ]);
    expect(k).toEqual({ percentage: 50, aantal: 4 });
  });

  test("openstaande uitnodigingen zijn geen reactie", () => {
    const k = kiesPercentage(["a", "b", "c"], [r("a", "uitgenodigd"), r("b", "aangeboden"), r("c", "aangemeld")]);
    expect(k).toEqual({ percentage: null, aantal: 1 });
  });

  test("reacties op andere diensten tellen niet", () => {
    expect(kiesPercentage(["a"], [r("x", "geaccepteerd")]).aantal).toBe(0);
  });

  test("onder het minimum: null; vanaf 3 een heel percentage", () => {
    expect(kiesPercentage(["a", "b"], [r("a", "geaccepteerd"), r("b", "afgewezen")]).percentage).toBeNull();
    expect(kiesPercentage(["a", "b", "c"], [r("a", "geaccepteerd"), r("b", "afgewezen"), r("c", "afgewezen")]).percentage).toBe(33);
  });

  test("gekozen: ook als de medewerker daarna zelf afzei of een vervanger zocht", () => {
    expect(isGekozen({ status: "geannuleerd", beoordeeld_at: urenGeleden(2) })).toBe(true);
    expect(isGekozen({ status: "geannuleerd", beoordeeld_at: null })).toBe(false);
    expect(isGekozen({ status: "vervanging_gezocht" })).toBe(true);
    expect(isGekozen({ status: "voltooid" })).toBe(true);
    expect(isGekozen({ status: "afgewezen", beoordeeld_at: urenGeleden(2) })).toBe(false);
    expect(isGekozen({ status: "aangemeld" })).toBe(false);
  });
});

test.describe("betaaltBinnen (factuurdatum → betaald_op)", () => {
  /** Factuur `factuurDagen` geleden gemaakt, `betaaldDagen` geleden als betaald gemarkeerd. */
  const dagenGeleden = (d: number) => new Date(NU.getTime() - d * 24 * 3600_000).toISOString();
  const f = (factuurDagen: number, betaaldDagen: number | null): BetaalRij => ({
    factuur_datum: dagenGeleden(factuurDagen),
    betaald_op: betaaldDagen == null ? null : dagenGeleden(betaaldDagen),
  });

  test(`mediaan in hele dagen, pas vanaf ${MIN_WAARNEMINGEN} betaalde facturen`, () => {
    expect(betaaltBinnen([f(20, 10), f(30, 16)], NU)).toEqual({ dagen: null, aantal: 2 });
    // 10, 14 en 30 dagen → mediaan 14
    expect(betaaltBinnen([f(20, 10), f(30, 16), f(40, 10)], NU)).toEqual({ dagen: 14, aantal: 3 });
  });

  test("even aantal: halve mediaan naar boven afgerond (\"binnen\" moet kloppen)", () => {
    // 10, 13, 14, 30 → mediaan 13,5 → 14
    expect(betaaltBinnen([f(20, 10), f(23, 10), f(30, 16), f(40, 10)], NU).dagen).toBe(14);
  });

  test("facturen zonder betaald_op of factuurdatum tellen niet mee", () => {
    const zonder = [f(20, null), f(30, null), { factuur_datum: null, betaald_op: dagenGeleden(1) }];
    expect(betaaltBinnen([...zonder, f(20, 10), f(30, 16)], NU)).toEqual({ dagen: null, aantal: 2 });
    expect(betaaltBinnen([...zonder, f(20, 10), f(30, 16), f(25, 20)], NU)).toEqual({ dagen: 10, aantal: 3 });
  });

  test(`alleen betalingen uit de laatste ${BETAAL_PERIODE_DAGEN} dagen`, () => {
    const oud = [f(BETAAL_PERIODE_DAGEN + 30, BETAAL_PERIODE_DAGEN + 1), f(BETAAL_PERIODE_DAGEN + 40, BETAAL_PERIODE_DAGEN + 2)];
    expect(betaaltBinnen([...oud, f(20, 10)], NU)).toEqual({ dagen: null, aantal: 1 });
    // Factuur van vóór de periode maar binnen de periode betaald telt wel.
    expect(betaaltBinnen([f(BETAAL_PERIODE_DAGEN + 10, 5), f(20, 10), f(30, 16)], NU).aantal).toBe(3);
  });

  test("onzin telt niet mee: betaald vóór de factuurdatum, in de toekomst of ongeldige datum", () => {
    const onzin: BetaalRij[] = [
      f(5, 10),
      { factuur_datum: dagenGeleden(3), betaald_op: new Date(NU.getTime() + 3600_000).toISOString() },
      { factuur_datum: "geen datum", betaald_op: dagenGeleden(1) },
    ];
    expect(betaaltBinnen(onzin, NU)).toEqual({ dagen: null, aantal: 0 });
  });

  test("telt kalenderdagen in Nederlandse tijd, niet 24-uursblokken", () => {
    // Factuur op 1 okt om 23:30 NL (21:30 UTC), betaald op 2 okt om 00:30 NL: 1 dag, niet 0.
    const laat = { factuur_datum: "2026-10-01T21:30:00Z", betaald_op: "2026-10-01T22:30:00Z" };
    // Factuur op 5 okt 08:00 NL, betaald 19 okt 20:00 NL: 14 dagen (geen 14,5 → 15).
    const termijn = { factuur_datum: "2026-10-05T06:00:00Z", betaald_op: "2026-10-19T18:00:00Z" };
    // Zelfde dag betaald: 0 dagen.
    const zelfdeDag = { factuur_datum: "2026-10-10T07:00:00Z", betaald_op: "2026-10-10T15:00:00Z" };
    expect(betaaltBinnen([laat, laat, laat], NU).dagen).toBe(1);
    expect(betaaltBinnen([termijn, termijn, termijn], NU).dagen).toBe(14);
    expect(betaaltBinnen([zelfdeDag, zelfdeDag, zelfdeDag], NU).dagen).toBe(0);
  });
});

test.describe("bouwWerkgeverProfiel", () => {
  test("betaalt_binnen_dagen uit de betaalde facturen; zonder facturen null", () => {
    const leeg = bouwWerkgeverProfiel({ beoordelingen: [], beslissingen: [], dienstIds: [], reacties: [], nu: NU });
    expect(leeg.betaalt_binnen_dagen).toBeNull();
    expect(leeg.waarnemingen.betaalde_facturen).toBe(0);
    expect(LEEG_PROFIEL.betaalt_binnen_dagen).toBeNull();

    const betaald = (factuur: string, op: string): BetaalRij => ({ factuur_datum: factuur, betaald_op: op });
    const p = bouwWerkgeverProfiel({
      beoordelingen: [],
      beslissingen: [],
      dienstIds: [],
      reacties: [],
      betalingen: [
        betaald("2026-09-01T10:00:00Z", "2026-09-11T10:00:00Z"),
        betaald("2026-09-10T10:00:00Z", "2026-09-22T10:00:00Z"),
        betaald("2026-10-01T10:00:00Z", "2026-10-21T10:00:00Z"),
      ],
      nu: NU,
    });
    expect(p.betaalt_binnen_dagen).toBe(12);
    expect(p.waarnemingen.betaalde_facturen).toBe(3);
    expect(p.betaal_periode_dagen).toBe(BETAAL_PERIODE_DAGEN);
    expect(heeftKengetallen(compactProfiel(p))).toBe(true);
  });

  test("compact profiel bevat precies de vijf velden voor de dienstdata", () => {
    const p = bouwWerkgeverProfiel({
      beoordelingen: [{ score: 5 }, { score: 4 }, { score: 4 }],
      beslissingen: [beslis(10, 8), beslis(30, 20), beslis(50, 46)],
      dienstIds: ["a", "b", "c"],
      reacties: [
        { dienst_id: "a", status: "geaccepteerd" },
        { dienst_id: "b", status: "geaccepteerd" },
        { dienst_id: "c", status: "afgewezen", beoordeeld_at: urenGeleden(1) },
      ],
      nu: NU,
    });
    expect(compactProfiel(p)).toEqual({ gemiddelde: 4.3, aantal: 3, kiest_binnen_uren: 4, kies_percentage: 67, betaalt_binnen_dagen: null });
    expect(p.waarnemingen).toEqual({
      beoordelingen: 3,
      deelscores: { instructies: 0, sfeer: 0, zoals_beschreven: 0 },
      beslissingen: 3,
      diensten_met_reactie: 3,
      betaalde_facturen: 0,
    });
    expect(p.minimum_waarnemingen).toBe(MIN_WAARNEMINGEN);
    expect(heeftKengetallen(p)).toBe(true);
  });

  test("zonder genoeg gegevens: niets te tonen", () => {
    expect(heeftKengetallen(LEEG_PROFIEL)).toBe(false);
    expect(heeftKengetallen(null)).toBe(false);
    expect(LEEG_PROFIEL.beoordelingen_beschikbaar).toBe(false);
  });
});

test.describe("teksten", () => {
  test("kiestBinnenTekst rondt altijd naar boven af", () => {
    expect(kiestBinnenTekst(null)).toBeNull();
    expect(kiestBinnenTekst(0.4)).toBe("binnen een uur");
    expect(kiestBinnenTekst(1)).toBe("binnen 1 uur");
    expect(kiestBinnenTekst(5.2)).toBe("binnen 6 uur");
    expect(kiestBinnenTekst(24)).toBe("binnen 1 dag");
    expect(kiestBinnenTekst(25)).toBe("binnen 2 dagen");
    expect(kiestBinnenTekst(-1)).toBeNull();
  });

  test("betaaltBinnenTekst: hele dagen, minimaal 1", () => {
    expect(betaaltBinnenTekst(null)).toBeNull();
    expect(betaaltBinnenTekst(undefined)).toBeNull();
    expect(betaaltBinnenTekst(-1)).toBeNull();
    expect(betaaltBinnenTekst(0)).toBe("binnen 1 dag");
    expect(betaaltBinnenTekst(1)).toBe("binnen 1 dag");
    expect(betaaltBinnenTekst(14)).toBe("binnen 14 dagen");
    expect(betaaltBinnenTekst(13.5)).toBe("binnen 14 dagen");
  });

  test("scoreTekst met komma", () => {
    expect(scoreTekst(4.25)).toBe("4,3");
    expect(scoreTekst(5)).toBe("5,0");
  });
});
