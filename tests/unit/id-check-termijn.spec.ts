import { test, expect } from "@playwright/test";
import { idBeoordelingTeLaat, idBeoordelingUiterlijk } from "../../src/lib/id-check/termijn";

// Een ID-check die een mens moet bekijken: uiterlijk 2 werkdagen na binnenkomst (DPIA O11).

test.describe("termijn handmatige ID-beoordeling", () => {
  test("doordeweeks: 2 werkdagen later", () => {
    // ma 26-10-2026 10:00 NL
    expect(idBeoordelingUiterlijk("2026-10-26T09:00:00Z")).toBe("2026-10-28");
  });

  test("vrijdag en weekend tellen door naar dinsdag", () => {
    expect(idBeoordelingUiterlijk("2026-10-30T09:00:00Z")).toBe("2026-11-03"); // vr
    expect(idBeoordelingUiterlijk("2026-10-31T09:00:00Z")).toBe("2026-11-03"); // za
    expect(idBeoordelingUiterlijk("2026-11-01T09:00:00Z")).toBe("2026-11-03"); // zo
  });

  test("datum in Nederlandse tijd: 23:30 UTC op zondag is al maandag in Amsterdam", () => {
    expect(idBeoordelingUiterlijk("2026-11-01T23:30:00Z")).toBe("2026-11-04");
  });

  test("feestdagen tellen niet mee (Tweede Kerstdag 2026 = za; 1e Kerstdag vr)", () => {
    // do 24-12-2026 → vr 25-12 feestdag, za/zo weekend → ma 28-12, di 29-12
    expect(idBeoordelingUiterlijk("2026-12-24T09:00:00Z")).toBe("2026-12-29");
  });

  test("te laat pas ná de laatste dag", () => {
    const binnen = "2026-10-26T09:00:00Z";
    expect(idBeoordelingTeLaat(binnen, "2026-10-28")).toBe(false);
    expect(idBeoordelingTeLaat(binnen, "2026-10-29")).toBe(true);
  });

  test("ongeldige datum: geen termijn, niet te laat", () => {
    expect(idBeoordelingUiterlijk("geen datum")).toBeNull();
    expect(idBeoordelingTeLaat("geen datum", "2030-01-01")).toBe(false);
  });
});
