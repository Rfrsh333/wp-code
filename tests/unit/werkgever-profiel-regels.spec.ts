import { test, expect } from "@playwright/test";
import {
  DIRECT_INGEPLAND_SECONDEN,
  LEEG_PROFIEL,
  MIN_WAARNEMINGEN,
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

test.describe("bouwWerkgeverProfiel", () => {
  test("betaalt_binnen_dagen is altijd null (geen betaaldatum bekend)", () => {
    const p = bouwWerkgeverProfiel({ beoordelingen: [], beslissingen: [], dienstIds: [], reacties: [], nu: NU });
    expect(p.betaalt_binnen_dagen).toBeNull();
    expect(LEEG_PROFIEL.betaalt_binnen_dagen).toBeNull();
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

  test("scoreTekst met komma", () => {
    expect(scoreTekst(4.25)).toBe("4,3");
    expect(scoreTekst(5)).toBe("5,0");
  });
});
