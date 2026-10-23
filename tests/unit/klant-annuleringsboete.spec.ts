import { test, expect } from "@playwright/test";
import {
  berekenAnnuleringsboete,
  geschatteKostenVoorBoete,
  STANDAARD_ANNULERINGSBELEID,
} from "../../src/lib/klant-annuleringsboete";

const dienst = { start_tijd: "18:00:00", eind_tijd: "23:00:00", uurtarief: 30, aantal_nodig: 2 };

test.describe("annuleringsboete (gedeeld door preview en annulering)", () => {
  test("ruim van tevoren: geen boete", () => {
    const r = berekenAnnuleringsboete({ dienst, beleid: STANDAARD_ANNULERINGSBELEID, urenVanTevoren: 30, annuleringenDezeMaand: 0 });
    expect(r).toEqual({ boeteToegepast: false, boeteBedrag: 0, boeteReden: "Geen boete: 30.0u van tevoren", binnenGrens: false });
  });

  test("binnen de grens: percentage van uurtarief × aantal × dienstduur", () => {
    const r = berekenAnnuleringsboete({ dienst, beleid: STANDAARD_ANNULERINGSBELEID, urenVanTevoren: 5, annuleringenDezeMaand: 0 });
    // 30 × 2 × 5u × 50%
    expect(r.boeteToegepast).toBe(true);
    expect(r.boeteBedrag).toBe(150);
    expect(r.boeteReden).toBe("Late annulering 5.0u van tevoren");
  });

  test("nachtdienst over middernacht telt de echte duur", () => {
    const r = berekenAnnuleringsboete({
      dienst: { ...dienst, start_tijd: "22:00", eind_tijd: "04:00", aantal_nodig: 1 },
      beleid: STANDAARD_ANNULERINGSBELEID,
      urenVanTevoren: 2,
      annuleringenDezeMaand: 0,
    });
    expect(r.boeteBedrag).toBe(30 * 6 * 0.5);
  });

  test("gratis annuleringen en vast bedrag volgens beleid", () => {
    const beleid = { ...STANDAARD_ANNULERINGSBELEID, geen_boete_eerste_x_keer: 2 };
    const gratis = berekenAnnuleringsboete({ dienst, beleid, urenVanTevoren: 1, annuleringenDezeMaand: 1 });
    expect(gratis).toEqual({ boeteToegepast: false, boeteBedrag: 0, boeteReden: "Gratis annulering 2/2", binnenGrens: true });
    const vast = berekenAnnuleringsboete({
      dienst,
      beleid: { ...beleid, gebruik_percentage: false, boete_vast_bedrag: 75 },
      urenVanTevoren: 1,
      annuleringenDezeMaand: 2,
    });
    expect(vast.boeteBedrag).toBe(75);
  });

  test("inactief beleid: nooit boete", () => {
    const r = berekenAnnuleringsboete({
      dienst,
      beleid: { ...STANDAARD_ANNULERINGSBELEID, is_actief: false },
      urenVanTevoren: 1,
      annuleringenDezeMaand: 5,
    });
    expect(r.boeteToegepast).toBe(false);
    expect(r.binnenGrens).toBe(false);
  });
});

test.describe("annuleringsboete met het tarief per aanmelding (tegenbod)", () => {
  // Dienst: € 30 per uur, 2 plekken, 18:00–23:00 (5 uur).
  const boete = (ingepland: Parameters<typeof geschatteKostenVoorBoete>[1]) =>
    berekenAnnuleringsboete({ dienst, beleid: STANDAARD_ANNULERINGSBELEID, urenVanTevoren: 5, annuleringenDezeMaand: 0, ingepland });

  test("zonder ingeplande medewerkers (of zonder migratie): het tarief van de dienst, zoals voorheen", () => {
    expect(geschatteKostenVoorBoete(dienst)).toBe(300);
    expect(geschatteKostenVoorBoete(dienst, [])).toBe(300);
    // Aanmelding zonder voorwaarden = tarief en tijden van de dienst.
    expect(geschatteKostenVoorBoete(dienst, [{}, { voorgesteld_uurtarief: null }])).toBe(300);
    expect(boete([]).boeteBedrag).toBe(150);
  });

  test("tegenbod: die plek kost tegenbod + € 4 per uur, de open plek het diensttarief", () => {
    // (22 + 4) × 5 = 130, plus de open plek 30 × 5 = 150 → 280; boete 50% = 140.
    expect(geschatteKostenVoorBoete(dienst, [{ voorgesteld_uurtarief: 22 }])).toBe(280);
    expect(boete([{ voorgesteld_uurtarief: 22 }]).boeteBedrag).toBe(140);
    // Een hoger tegenbod maakt de boete hoger: (31 + 4) × 5 = 175, plus 150 → 325; boete 162,50.
    expect(boete([{ voorgesteld_uurtarief: 31 }]).boeteBedrag).toBe(162.5);
  });

  test("eigen tijden tellen mee: alleen de afgesproken uren van die aanmelding", () => {
    // (30 + 4) × 3 uur (18:00–21:00) = 102, plus de tweede medewerker op de hele dienst 30 × 5 = 150.
    const ingepland = [
      { voorgesteld_uurtarief: 30, voorgestelde_start_tijd: "18:00:00", voorgestelde_eind_tijd: "21:00:00" },
      {},
    ];
    expect(geschatteKostenVoorBoete(dienst, ingepland)).toBe(252);
    expect(boete(ingepland).boeteBedrag).toBe(126);
  });

  test("meer ingeplande medewerkers dan plekken: iedere aanmelding telt", () => {
    const eenPlek = { ...dienst, aantal_nodig: 1 };
    expect(geschatteKostenVoorBoete(eenPlek, [{}, { voorgesteld_uurtarief: 26 }])).toBe(150 + 150);
  });

  test("buiten de boetegrens of met een vast bedrag maakt het tarief niet uit", () => {
    const ruim = berekenAnnuleringsboete({
      dienst,
      beleid: STANDAARD_ANNULERINGSBELEID,
      urenVanTevoren: 30,
      annuleringenDezeMaand: 0,
      ingepland: [{ voorgesteld_uurtarief: 50 }],
    });
    expect(ruim.boeteBedrag).toBe(0);
    const vast = berekenAnnuleringsboete({
      dienst,
      beleid: { ...STANDAARD_ANNULERINGSBELEID, gebruik_percentage: false, boete_vast_bedrag: 75 },
      urenVanTevoren: 1,
      annuleringenDezeMaand: 0,
      ingepland: [{ voorgesteld_uurtarief: 50 }],
    });
    expect(vast.boeteBedrag).toBe(75);
  });

  test("bedrag op centen afgerond", () => {
    // (19,99 + 4) × 5 = 119,95, plus 150 → 269,95; 33% = 89,0835 → 89,08 (geen float-staart).
    expect(geschatteKostenVoorBoete(dienst, [{ voorgesteld_uurtarief: 19.99 }])).toBe(269.95);
    const r = berekenAnnuleringsboete({
      dienst,
      beleid: { ...STANDAARD_ANNULERINGSBELEID, boete_percentage: 33 },
      urenVanTevoren: 5,
      annuleringenDezeMaand: 0,
      ingepland: [{ voorgesteld_uurtarief: 19.99 }],
    });
    expect(r.boeteBedrag).toBe(89.08);
  });
});
