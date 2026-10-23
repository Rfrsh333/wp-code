import { test, expect } from "@playwright/test";
import {
  bepaalAutopilotActie,
  MAX_DAGEN_IN_NIEUW,
  MIN_UREN_IN_NIEUW,
  type AutopilotKandidaat,
} from "../../src/lib/onboarding-autopilot-regels";

const nu = new Date("2026-10-23T08:00:00Z");
const urenGeleden = (u: number) => new Date(nu.getTime() - u * 3600_000).toISOString();

const nieuw = (extra: Partial<AutopilotKandidaat> = {}): AutopilotKandidaat => ({
  onboarding_status: "nieuw",
  ai_screening_score: null,
  created_at: urenGeleden(MIN_UREN_IN_NIEUW + 1),
  laatste_onboarding_actie: null,
  onboarding_portal_token_expires_at: null,
  ...extra,
});

test.describe("onboarding-autopilot (B2/B3)", () => {
  test("wacht niet meer op een AI-score: zonder score gaat het documentenverzoek gewoon", () => {
    expect(bepaalAutopilotActie(nieuw(), { aantalDocumenten: 0, nu })).toEqual({ soort: "documenten_opvragen" });
  });

  test("eerst TopTalent de kans geven; oude inschrijvingen niet ineens mailen", () => {
    expect(bepaalAutopilotActie(nieuw({ created_at: urenGeleden(2) }), { aantalDocumenten: 0, nu })).toEqual({ soort: "wachten" });
    const oud = bepaalAutopilotActie(nieuw({ created_at: urenGeleden(MAX_DAGEN_IN_NIEUW * 24 + 1) }), { aantalDocumenten: 0, nu });
    expect(oud.soort).toBe("handmatig");
    // Opnieuw ingeschreven (B13): laatste_onboarding_actie telt, niet de oude created_at.
    const herstart = nieuw({ created_at: urenGeleden(24 * 200), laatste_onboarding_actie: urenGeleden(MIN_UREN_IN_NIEUW + 1) });
    expect(bepaalAutopilotActie(herstart, { aantalDocumenten: 0, nu })).toEqual({ soort: "documenten_opvragen" });
  });

  test("een lage (handmatige) AI-score gaat naar handmatige beoordeling", () => {
    expect(bepaalAutopilotActie(nieuw({ ai_screening_score: 4 }), { aantalDocumenten: 0, nu })).toMatchObject({
      soort: "handmatig",
      status: "in_beoordeling",
    });
    expect(bepaalAutopilotActie(nieuw({ ai_screening_score: 8 }), { aantalDocumenten: 0, nu })).toEqual({ soort: "documenten_opvragen" });
  });

  test("na een upload alleen de status gelijktrekken; geen onboarding_step nodig", () => {
    const k = nieuw({ onboarding_status: "documenten_opvragen", onboarding_portal_token_expires_at: urenGeleden(-48) });
    expect(bepaalAutopilotActie(k, { aantalDocumenten: 2, nu })).toEqual({ soort: "documenten_ontvangen" });
    expect(bepaalAutopilotActie(k, { aantalDocumenten: 0, nu })).toEqual({ soort: "wachten" });
  });

  test("verlopen uploadlink zonder upload: naar handmatig", () => {
    const k = nieuw({ onboarding_status: "documenten_opvragen", onboarding_portal_token_expires_at: urenGeleden(1) });
    expect(bepaalAutopilotActie(k, { aantalDocumenten: 0, nu }).soort).toBe("handmatig");
  });

  test("goedkeuren of inzetbaar maken kan de autopilot niet", () => {
    for (const status of ["wacht_op_kandidaat", "goedgekeurd", "inzetbaar", "in_beoordeling"]) {
      expect(bepaalAutopilotActie(nieuw({ onboarding_status: status }), { aantalDocumenten: 5, nu })).toEqual({ soort: "wachten" });
    }
  });
});
