import { test, expect } from "@playwright/test";
import { basisTarieven } from "../../src/lib/calculator/tarieven";
import {
  alleRichtlijnen,
  contractNaarTariefType,
  medewerkerUurloonBij,
  offerteTarief,
  richtlijnBereikTekst,
  richtlijnVoorFunctie,
  standaardUitzendTarieven,
  tariefAdvies,
  WETTELIJK_MINIMUMUURLOON,
} from "../../src/lib/pricing/richtlijntarieven";

test.describe("richtlijntarieven: één bron, gebaseerd op de kosten-calculator", () => {
  test("standaard = uitzendtarief van de calculator (ervaren), bereik starter–senior", () => {
    const r = richtlijnVoorFunctie("bediening");
    expect(r).toEqual({ functie: "bediening", label: "Bediening", standaard: basisTarieven.bediening.uitzend, min: 22.95, max: 32.4 });
    expect(richtlijnBereikTekst(r!)).toBe("€ 22,95 – € 32,40");
    expect(richtlijnVoorFunctie("keuken")?.standaard).toBe(28);
    expect(richtlijnVoorFunctie("afwas")?.standaard).toBe(25);
  });

  test("namen uit formulieren en offertes vinden hun functie", () => {
    expect(richtlijnVoorFunctie("Ober/Serveerster")?.functie).toBe("bediening");
    expect(richtlijnVoorFunctie("Kok")?.functie).toBe("keuken");
    expect(richtlijnVoorFunctie("Barista")?.functie).toBe("bar");
    expect(richtlijnVoorFunctie("Gastheer/Gastvrouw")?.functie).toBe("gastheer");
    expect(richtlijnVoorFunctie("Afwasser")?.functie).toBe("afwas");
    expect(richtlijnVoorFunctie("Ruimtevaarder")).toBeNull();
    expect(richtlijnVoorFunctie(null)).toBeNull();
  });

  test("smart-pricing krijgt dezelfde basistarieven als voorheen", () => {
    expect(standaardUitzendTarieven()).toEqual({ bediening: 27, bar: 27, keuken: 28, afwas: 25, gastheer: 27.5, runner: 25.5 });
    expect(alleRichtlijnen()).toHaveLength(6);
  });
});

test.describe("richtlijntarieven: offerte en PDF zien dezelfde prijs", () => {
  test("AI-offerte en PDF: standaard uitzendtarief, niet meer € 14,50", () => {
    expect(offerteTarief("bediening", "uitzendkracht")).toEqual({ uurtarief: 27, weekend_tarief: 29.7, feestdag_tarief: 33.75 });
    expect(offerteTarief("Kok", undefined).uurtarief).toBe(28);
  });

  test("contractvorm volgt de calculator (vast/zzp)", () => {
    expect(contractNaarTariefType("loondienst")).toBe("vast");
    expect(contractNaarTariefType("zzp")).toBe("zzp");
    expect(contractNaarTariefType("uitzendkracht")).toBe("uitzend");
    expect(offerteTarief("bediening", "zzp").uurtarief).toBe(basisTarieven.bediening.zzp);
  });

  test("onbekende functie valt terug op bediening", () => {
    expect(offerteTarief("Iets anders", "uitzendkracht").uurtarief).toBe(27);
  });
});

test.describe("richtlijntarieven: zachte waarschuwing, geen blokkade", () => {
  test("binnen de richtlijn: niets", () => {
    expect(tariefAdvies(27, "bediening").waarschuwing).toBeNull();
    expect(tariefAdvies(22.95, "bediening").waarschuwing).toBeNull();
  });

  test("onder de richtlijn: waarschuwing met het bereik", () => {
    const a = tariefAdvies(21, "bediening");
    expect(a.onderRichtlijn).toBe(true);
    expect(a.onderMinimumloon).toBe(false);
    expect(a.waarschuwing).toContain("onder de richtlijn");
    expect(a.waarschuwing).toContain("€ 22,95 – € 32,40");
  });

  test("medewerker krijgt klanttarief min € 4; onder het minimumloon wordt expliciet genoemd", () => {
    expect(medewerkerUurloonBij(18)).toBe(14);
    const a = tariefAdvies(18, "bediening");
    expect(a.medewerkerUurloon).toBe(14);
    expect(a.onderMinimumloon).toBe(true);
    expect(a.waarschuwing).toContain("wettelijk minimumloon");
    expect(a.waarschuwing).toContain("€ 14,00 per uur");
    expect(WETTELIJK_MINIMUMUURLOON).toBe(14.99);
    // precies op de grens: geen minimumloon-waarschuwing
    expect(tariefAdvies(18.99, "onbekend").onderMinimumloon).toBe(false);
  });

  test("onbekende functie: alleen de minimumloon-check", () => {
    expect(tariefAdvies(30, "onbekend").waarschuwing).toBeNull();
    expect(tariefAdvies(15, "onbekend").waarschuwing).toContain("minimumloon");
  });
});
