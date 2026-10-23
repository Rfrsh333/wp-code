import { test, expect } from "@playwright/test";
import {
  dienstenFilter,
  filterOpWereld,
  GEEN_DEMO_IDS,
  isDemoEmail,
  NIL_UUID,
  zelfdeWereld,
  type DemoIds,
} from "../../src/lib/demo-regels";

const ids: DemoIds = {
  klanten: new Set(["k-demo"]),
  medewerkers: new Set(["m-demo"]),
  emails: new Set(["review@voorbeeld.nl"]),
};

test.describe("demo-regels", () => {
  test("zelfdeWereld: demo met demo, echt met echt; dienst zonder klant is echt", () => {
    expect(zelfdeWereld(ids, "m-demo", "k-demo")).toBe(true);
    expect(zelfdeWereld(ids, "m-echt", "k-echt")).toBe(true);
    expect(zelfdeWereld(ids, "m-echt", null)).toBe(true);
    expect(zelfdeWereld(ids, "m-demo", "k-echt")).toBe(false);
    expect(zelfdeWereld(ids, "m-demo", null)).toBe(false);
    expect(zelfdeWereld(ids, "m-echt", "k-demo")).toBe(false);
  });

  test("zonder demo-accounts (kolom ontbreekt) is iedereen echt", () => {
    expect(zelfdeWereld(GEEN_DEMO_IDS, "m", "k")).toBe(true);
    expect(dienstenFilter(GEEN_DEMO_IDS, false)).toBeNull();
    expect(filterOpWereld(["a", "b"], GEEN_DEMO_IDS.medewerkers, false)).toEqual(["a", "b"]);
  });

  test("dienstenFilter: demo alleen demo-klanten, echt houdt diensten zonder klant", () => {
    expect(dienstenFilter(ids, true)).toEqual({ soort: "in", waarden: ["k-demo"] });
    expect(dienstenFilter(GEEN_DEMO_IDS, true)).toEqual({ soort: "in", waarden: [NIL_UUID] });
    expect(dienstenFilter(ids, false)).toEqual({ soort: "or", filter: "klant_id.is.null,klant_id.not.in.(k-demo)" });
  });

  test("filterOpWereld en isDemoEmail", () => {
    expect(filterOpWereld(["m-demo", "m-echt"], ids.medewerkers, true)).toEqual(["m-demo"]);
    expect(filterOpWereld(["m-demo", "m-echt"], ids.medewerkers, false)).toEqual(["m-echt"]);
    expect(isDemoEmail(ids, " Review@Voorbeeld.nl ")).toBe(true);
    expect(isDemoEmail(ids, "iemand@voorbeeld.nl")).toBe(false);
    expect(isDemoEmail(ids, null)).toBe(false);
  });
});
