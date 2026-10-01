import { test, expect } from "@playwright/test";
import { dienstUren, maandGrenzen, nlDatum, nlMoment, plusDagen } from "../../src/lib/nl-tijd";

test.describe("nl-tijd", () => {
  test("nlDatum: 00:30 NL is al de volgende dag, terwijl UTC nog gisteren is", () => {
    // 30 sept 22:30 UTC = 1 okt 00:30 NL (zomertijd)
    expect(nlDatum(new Date("2026-09-30T22:30:00Z"))).toBe("2026-10-01");
    // winter: 31 dec 23:30 UTC = 1 jan 00:30 NL
    expect(nlDatum(new Date("2026-12-31T23:30:00Z"))).toBe("2027-01-01");
  });

  test("nlMoment: NL-wandkloktijd → juist UTC-moment, zomer en winter", () => {
    expect(nlMoment("2026-07-01", "18:00").toISOString()).toBe("2026-07-01T16:00:00.000Z");
    expect(nlMoment("2026-12-01", "18:00").toISOString()).toBe("2026-12-01T17:00:00.000Z");
    // dag van de wintertijdovergang (25 okt 2026), 12:00 is al CET
    expect(nlMoment("2026-10-25", "12:00").toISOString()).toBe("2026-10-25T11:00:00.000Z");
  });

  test("dienstUren: nachtdienst over middernacht", () => {
    expect(dienstUren("22:00", "03:00")).toBe(5);
    expect(dienstUren("16:00", "22:00", 30)).toBe(5.5);
    expect(dienstUren("09:00", "09:00")).toBe(24);
    expect(Number.isNaN(dienstUren("", "17:00"))).toBe(true);
  });

  test("maandGrenzen en plusDagen", () => {
    expect(maandGrenzen(2026, 2)).toEqual({ start: "2026-02-01", eind: "2026-02-28" });
    expect(maandGrenzen(2028, 2).eind).toBe("2028-02-29");
    expect(plusDagen("2026-10-31", 1)).toBe("2026-11-01");
  });
});
