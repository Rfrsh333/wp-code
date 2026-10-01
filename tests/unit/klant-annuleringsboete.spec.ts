import { test, expect } from "@playwright/test";
import { berekenAnnuleringsboete, STANDAARD_ANNULERINGSBELEID } from "../../src/lib/klant-annuleringsboete";

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
