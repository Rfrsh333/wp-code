import { test, expect } from "@playwright/test";
import {
  isGeldigBtwNummer,
  isGeldigKvkNummer,
  normaliseerBtwNummer,
  normaliseerKvkNummer,
} from "../../src/lib/medewerker/zzp-gegevens";

test.describe("zzp-gegevens (B1, B11)", () => {
  test("KvK-nummer: precies 8 cijfers, spaties en punten mogen", () => {
    expect(isGeldigKvkNummer("12345678")).toBe(true);
    expect(isGeldigKvkNummer("1234 5678")).toBe(true);
    expect(normaliseerKvkNummer("12.34.56.78")).toBe("12345678");
    expect(isGeldigKvkNummer("1234567")).toBe(false);
    expect(isGeldigKvkNummer("123456789")).toBe(false);
    expect(isGeldigKvkNummer("1234567a")).toBe(false);
    expect(isGeldigKvkNummer(null)).toBe(false);
  });

  test("btw-nummer: NL + 9 cijfers + B + 2 cijfers", () => {
    expect(isGeldigBtwNummer("NL123456789B01")).toBe(true);
    expect(isGeldigBtwNummer("nl 1234.56789 b01")).toBe(true);
    expect(normaliseerBtwNummer("nl123456789b01")).toBe("NL123456789B01");
    expect(isGeldigBtwNummer("NL12345678B01")).toBe(false);
    expect(isGeldigBtwNummer("BE0123456789")).toBe(false);
    expect(isGeldigBtwNummer("")).toBe(false);
  });
});
