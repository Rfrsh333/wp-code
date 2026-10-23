/**
 * Beslisregels van de onboarding-autopilot (pure functies, getest in
 * tests/unit/onboarding-autopilot-regels.spec.ts). De route is api/cron/onboarding-autopilot.
 *
 * Wat de autopilot WEL doet: vervolgmails en herinneringen.
 * - `nieuw`: na MIN_UREN_IN_NIEUW zonder actie van TopTalent het documentenverzoek sturen
 *   (een neutrale vervolgmail; de herinneringen op dag 3 en 6 doet cron/document-reminders).
 * - `documenten_opvragen`: zodra er iets is geüpload de status gelijktrekken naar
 *   `wacht_op_kandidaat` ("documenten in beoordeling"). Dat is geen goedkeuring.
 *
 * Wat de autopilot NOOIT doet (B2):
 * - documenten goedkeuren of als goedgekeurd tellen: dat is een admin-beoordeling
 *   (lib/kandidaat-documentbeoordeling);
 * - iemand op `goedgekeurd` of `inzetbaar` zetten: "inzetbaar" is altijd een menselijke klik,
 *   die het account aanmaakt en de activatiemail stuurt (lib/kandidaat-inzetbaar).
 *
 * Vastlopen (B3): de oude versie wachtte op `ai_screening_score`, maar die wordt alleen met de
 * hand gezet (admin-route ai/screening). Zonder score gebeurde er niets. Daarna eiste hij een
 * `onboarding_step` die de uploadroute niet bijwerkte. Nu beslist alleen de status (plus tijd en
 * uploads); een AI-score wordt alleen gebruikt als die er is (laag = naar handmatige beoordeling).
 */

/** Statussen die de autopilot ophaalt. Andere statussen zijn aan TopTalent (of klaar). */
export const AUTOPILOT_STATUSSEN = ["nieuw", "documenten_opvragen"] as const;

/** Zo lang krijgt TopTalent de tijd om zelf te reageren voordat het documentenverzoek automatisch gaat. */
export const MIN_UREN_IN_NIEUW = 12;

/**
 * Ouder dan dit: geen automatische mail meer, naar handmatig. In de normale gang komt niemand
 * hieraan (de cron draait dagelijks en mailt na 12 uur); het voorkomt dat bij de eerste run na
 * de livegang oude inschrijvingen ineens een documentenverzoek krijgen.
 */
export const MAX_DAGEN_IN_NIEUW = 3;

/** Een (met de hand gedraaide) AI-score onder deze grens gaat naar handmatige beoordeling. */
export const MIN_AI_SCORE = 6;

/** onboarding_step per status, alleen ter informatie (er wordt niet meer op gefilterd). */
export const STAP_PER_STATUS: Record<string, number> = {
  nieuw: 0,
  in_beoordeling: 0,
  documenten_opvragen: 1,
  wacht_op_kandidaat: 2,
  goedgekeurd: 3,
  inzetbaar: 4,
};

export type AutopilotKandidaat = {
  onboarding_status: string | null;
  ai_screening_score: number | null;
  created_at: string;
  laatste_onboarding_actie: string | null;
  onboarding_portal_token_expires_at: string | null;
};

export type AutopilotActie =
  | { soort: "wachten" }
  | { soort: "documenten_opvragen" }
  | { soort: "documenten_ontvangen" }
  | { soort: "handmatig"; reden: string; status?: "in_beoordeling" };

const UUR = 60 * 60 * 1000;

export function bepaalAutopilotActie(
  kandidaat: AutopilotKandidaat,
  context: { aantalDocumenten: number; nu: Date },
): AutopilotActie {
  const nu = context.nu.getTime();
  const sinds = new Date(kandidaat.laatste_onboarding_actie ?? kandidaat.created_at).getTime();
  const urenSinds = Number.isFinite(sinds) ? (nu - sinds) / UUR : Infinity;

  if (kandidaat.onboarding_status === "nieuw") {
    if (kandidaat.ai_screening_score != null && kandidaat.ai_screening_score < MIN_AI_SCORE) {
      return { soort: "handmatig", reden: `AI-score ${kandidaat.ai_screening_score}: handmatig beoordelen`, status: "in_beoordeling" };
    }
    if (urenSinds > MAX_DAGEN_IN_NIEUW * 24) {
      return { soort: "handmatig", reden: `langer dan ${MAX_DAGEN_IN_NIEUW} dagen geleden ingeschreven: geen automatische mail` };
    }
    if (urenSinds < MIN_UREN_IN_NIEUW) return { soort: "wachten" };
    return { soort: "documenten_opvragen" };
  }

  if (kandidaat.onboarding_status === "documenten_opvragen") {
    if (context.aantalDocumenten > 0) return { soort: "documenten_ontvangen" };
    const verloopt = kandidaat.onboarding_portal_token_expires_at
      ? new Date(kandidaat.onboarding_portal_token_expires_at).getTime()
      : NaN;
    if (!Number.isFinite(verloopt) || verloopt < nu) {
      return { soort: "handmatig", reden: "geen geldige uploadlink en niets geüpload: nieuwe link of contact nodig" };
    }
    return { soort: "wachten" };
  }

  return { soort: "wachten" };
}
