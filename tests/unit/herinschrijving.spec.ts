import { test, expect } from "@playwright/test";
import { HERINSCHRIJVING_RESET, herinschrijvingKeuze } from "../../src/lib/inschrijving-regels";

test.describe("opnieuw inschrijven na afwijzing (B13)", () => {
  test("onbekend adres: gewoon een nieuwe inschrijving", () => {
    expect(herinschrijvingKeuze([])).toEqual({ soort: "nieuw" });
  });

  test("alleen afgewezen inschrijvingen: de nieuwste wordt hergebruikt", () => {
    expect(
      herinschrijvingKeuze([
        { id: "oud", onboarding_status: "afgewezen", created_at: "2025-01-01T00:00:00Z" },
        { id: "recent", onboarding_status: "afgewezen", created_at: "2026-03-01T00:00:00Z" },
      ]),
    ).toEqual({ soort: "hergebruik", id: "recent" });
  });

  test("loopt er nog een inschrijving, dan blijft het 'bestaat al'", () => {
    expect(
      herinschrijvingKeuze([
        { id: "a", onboarding_status: "afgewezen" },
        { id: "b", onboarding_status: "in_beoordeling" },
      ]),
    ).toEqual({ soort: "bestaat" });
    expect(herinschrijvingKeuze([{ id: "c", onboarding_status: null }])).toEqual({ soort: "bestaat" });
  });

  test("hergebruik begint de onboarding opnieuw", () => {
    expect(HERINSCHRIJVING_RESET.onboarding_status).toBe("nieuw");
    expect(HERINSCHRIJVING_RESET.onboarding_portal_token).toBeNull();
    expect(HERINSCHRIJVING_RESET.inzetbaar_op).toBeNull();
  });
});
