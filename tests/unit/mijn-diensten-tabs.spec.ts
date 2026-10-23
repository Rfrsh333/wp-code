import { test, expect } from "@playwright/test";
import { aanmeldStatussenVoorTab } from "../../src/lib/medewerker/dienst-regels";
import { INGEPLAND_STATUSSEN } from "../../src/lib/dienst-status";

test.describe("Mijn diensten: tabs (B9)", () => {
  test("openstaande aanmeldingen hebben een eigen tab", () => {
    expect(aanmeldStatussenVoorTab("aangemeld")).toEqual(["aangemeld"]);
  });

  test("bestaande tabs blijven hetzelfde", () => {
    expect(aanmeldStatussenVoorTab("aangeboden")).toEqual(["uitgenodigd"]);
    expect(aanmeldStatussenVoorTab("gepland")).toEqual([...INGEPLAND_STATUSSEN]);
    expect(aanmeldStatussenVoorTab("voltooid")).toEqual([...INGEPLAND_STATUSSEN]);
    expect(aanmeldStatussenVoorTab(null)).toEqual([...INGEPLAND_STATUSSEN]);
  });

  test("geen tab toont 'aangemeld' dubbel of een ingeplande dienst als aanmelding", () => {
    for (const s of INGEPLAND_STATUSSEN) expect(aanmeldStatussenVoorTab("aangemeld")).not.toContain(s);
  });
});
