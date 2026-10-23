import { dienstUren } from "@/lib/nl-tijd";
import { geldendeTijden, klantUurtariefVoorAanmelding, type VoorgesteldeTijden } from "@/lib/medewerker/reactie-regels";

/**
 * Annuleringsboete voor een klant — pure berekening, gedeeld door de echte annulering
 * (POST /api/klant/annuleren) en de preview (GET /api/klant/annuleren?dienst_id=…), zodat beide
 * exact hetzelfde rekenen. De DB-kant (beleid, aantal annuleringen deze maand en de voorwaarden van
 * de ingeplande aanmeldingen) staat in de route.
 */

export type AnnuleringsBeleid = {
  uren_van_tevoren_min: number;
  boete_percentage: number;
  gebruik_percentage: boolean;
  geen_boete_eerste_x_keer: number;
  is_actief: boolean;
  boete_vast_bedrag?: number | null;
};

/** Beleid als de klant geen eigen beleid heeft (ongewijzigd t.o.v. de oude route). */
export const STANDAARD_ANNULERINGSBELEID: AnnuleringsBeleid = {
  uren_van_tevoren_min: 24,
  boete_percentage: 50,
  gebruik_percentage: true,
  geen_boete_eerste_x_keer: 0,
  is_actief: true,
};

export type BoeteDienst = {
  start_tijd: string;
  eind_tijd: string;
  uurtarief?: number | null;
  aantal_nodig?: number | null;
};

/**
 * Een ingeplande aanmelding op de dienst (uitgebreid reageren): het tegenbod en de eigen tijden.
 * Null/ontbrekend = het tarief en de tijden van de dienst.
 */
export type BoeteAanmelding = VoorgesteldeTijden & { voorgesteld_uurtarief?: number | null };

const rondCenten = (n: number) => Math.round(n * 100) / 100;

/** Duur in uren ("HH:MM[:SS]"); nachtdiensten over middernacht tellen goed, onbekend = 6 uur (zoals voorheen). */
function duurUren(start: string, eind: string): number {
  const duur = dienstUren(String(start).slice(0, 5), String(eind).slice(0, 5));
  return Number.isFinite(duur) && duur > 0 ? duur : 6;
}

/**
 * Geschatte kosten van de dienst waarover de boete gaat: per plek wat de werkgever per uur betaalt
 * × de uren. Een plek met een ingeplande medewerker rekent met het tarief van díe aanmelding
 * (tegenbod + € 4, klantUurtariefVoorAanmelding) en zijn geldende tijden (geldendeTijden); een
 * open plek met het tarief en de duur van de dienst. Zonder ingeplande medewerkers is dit
 * uurtarief × aantal_nodig × dienstduur, zoals voorheen.
 */
export function geschatteKostenVoorBoete(dienst: BoeteDienst, ingepland: readonly BoeteAanmelding[] = []): number {
  const plekken = Math.max(dienst.aantal_nodig || 1, ingepland.length);
  const dienstDuur = duurUren(dienst.start_tijd, dienst.eind_tijd);
  let totaal = (plekken - ingepland.length) * (dienst.uurtarief || 0) * dienstDuur;
  for (const a of ingepland) {
    const tijden = geldendeTijden(dienst, a);
    const uren = tijden.eigen_tijden ? duurUren(tijden.start_tijd, tijden.eind_tijd) : dienstDuur;
    totaal += klantUurtariefVoorAanmelding(dienst.uurtarief, a.voorgesteld_uurtarief) * uren;
  }
  return rondCenten(totaal);
}

export type BoeteUitkomst = {
  boeteToegepast: boolean;
  boeteBedrag: number;
  boeteReden: string;
  /** Valt de annulering binnen de boetegrens (ook als een gratis annulering wordt gebruikt)? */
  binnenGrens: boolean;
};

/**
 * @param urenVanTevoren uren tussen nu en de dienststart (NL-tijd), ≥ 0
 * @param annuleringenDezeMaand eerdere annuleringen van deze klant in de lopende maand
 * @param ingepland de ingeplande aanmeldingen (tegenbod/eigen tijden); leeg = tarief van de dienst
 */
export function berekenAnnuleringsboete(input: {
  dienst: BoeteDienst;
  beleid: AnnuleringsBeleid;
  urenVanTevoren: number;
  annuleringenDezeMaand: number;
  ingepland?: readonly BoeteAanmelding[];
}): BoeteUitkomst {
  const { dienst, beleid: policy, urenVanTevoren } = input;
  const binnenGrens = !!policy.is_actief && urenVanTevoren < policy.uren_van_tevoren_min;

  if (!binnenGrens) {
    return { boeteToegepast: false, boeteBedrag: 0, boeteReden: `Geen boete: ${urenVanTevoren.toFixed(1)}u van tevoren`, binnenGrens };
  }

  const count = input.annuleringenDezeMaand;
  if (count >= policy.geen_boete_eerste_x_keer) {
    // Per plek het tarief en de tijden van de aanmelding (tegenbod), anders die van de dienst.
    const geschat = geschatteKostenVoorBoete(dienst, input.ingepland);
    const boeteBedrag = policy.gebruik_percentage ? rondCenten(geschat * (policy.boete_percentage / 100)) : policy.boete_vast_bedrag || 0;
    return {
      boeteToegepast: true,
      boeteBedrag,
      boeteReden: `Late annulering ${urenVanTevoren.toFixed(1)}u van tevoren`,
      binnenGrens,
    };
  }

  return {
    boeteToegepast: false,
    boeteBedrag: 0,
    boeteReden: `Gratis annulering ${count + 1}/${policy.geen_boete_eerste_x_keer}`,
    binnenGrens,
  };
}
