import { test, expect } from "@playwright/test";
import { kiesUurtarief, laagsteBasistarief, tariefBereik } from "../../src/lib/pricing/ondergrens";

const tarieven = [
  { functie: "bediening", basis: 27, weekend: 29.7, feestdag: 33.75, piek: 29.7 },
  { functie: "afwas", basis: 25, weekend: 27.5, feestdag: 31.25, piek: 27.5 },
];

test.describe("tariefondergrens", () => {
  test("laagsteBasistarief en bereik volgen de prijsbron", () => {
    expect(laagsteBasistarief(tarieven)).toBe(25);
    expect(laagsteBasistarief([])).toBe(0);
    expect(tariefBereik(tarieven)).toEqual({ min: 25, max: 33.75 });
    expect(tariefBereik([])).toBeNull();
  });

  test("kiesUurtarief: nooit onder de ondergrens, fallback op functie of minimum", () => {
    expect(kiesUurtarief(14, "bediening", tarieven)).toBe(25);
    expect(kiesUurtarief(30, "bediening", tarieven)).toBe(30);
    expect(kiesUurtarief("28,50", "bediening", tarieven)).toBe(28.5);
    expect(kiesUurtarief(null, "bediening", tarieven)).toBe(27);
    expect(kiesUurtarief(undefined, "onbekend", tarieven)).toBe(25);
    expect(kiesUurtarief(null, "bediening", [])).toBeNull();
    expect(kiesUurtarief(20, "bediening", [])).toBe(20);
  });
});
