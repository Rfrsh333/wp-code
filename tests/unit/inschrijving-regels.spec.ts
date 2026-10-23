import { test, expect } from "@playwright/test";
import {
  inschrijfFoutmelding,
  ontbrekendeInschrijfVelden,
  type InschrijfVelden,
} from "../../src/lib/inschrijving-regels";

const volledig: InschrijfVelden = {
  voornaam: "Sanne",
  achternaam: "de Vries",
  email: "sanne@example.nl",
  telefoon: "0612345678",
  stad: "Utrecht",
  geboortedatum: "2000-01-01",
  geslacht: "vrouw",
  horecaErvaring: "1-3 jaar",
  functies: ["bediening"],
  talen: ["Nederlands"],
  beschikbaarheid: "weekend",
  beschikbaarVanaf: "2026-11-01",
  uitbetalingswijze: "loondienst",
  hoeGekomen: "Instagram",
};

test.describe("inschrijving-regels", () => {
  test("volledig formulier zonder motivatie is geldig (motivatie is optioneel)", () => {
    expect(ontbrekendeInschrijfVelden(volledig)).toEqual([]);
  });

  test("lege en alleen-spatie velden en lege lijsten tellen als ontbrekend", () => {
    expect(
      ontbrekendeInschrijfVelden({ ...volledig, stad: "  ", functies: [], hoeGekomen: "" })
    ).toEqual(["stad", "functies", "hoeGekomen"]);
  });

  test("foutmelding noemt welk veld ontbreekt", () => {
    expect(inschrijfFoutmelding(["stad"])).toBe("Vul het verplichte veld in: woonplaats");
    expect(inschrijfFoutmelding(["talen", "hoeGekomen"])).toBe(
      "Vul de verplichte velden in: talen, hoe je bij ons bent gekomen"
    );
  });
});
