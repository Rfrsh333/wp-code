import { dienstUren } from "@/lib/nl-tijd";

/**
 * Annuleringsboete voor een klant — pure berekening, gedeeld door de echte annulering
 * (POST /api/klant/annuleren) en de preview (GET /api/klant/annuleren?dienst_id=…), zodat beide
 * exact hetzelfde rekenen. De DB-kant (beleid + aantal annuleringen deze maand) staat in de route.
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
 */
export function berekenAnnuleringsboete(input: {
  dienst: BoeteDienst;
  beleid: AnnuleringsBeleid;
  urenVanTevoren: number;
  annuleringenDezeMaand: number;
}): BoeteUitkomst {
  const { dienst, beleid: policy, urenVanTevoren } = input;
  const binnenGrens = !!policy.is_actief && urenVanTevoren < policy.uren_van_tevoren_min;

  if (!binnenGrens) {
    return { boeteToegepast: false, boeteBedrag: 0, boeteReden: `Geen boete: ${urenVanTevoren.toFixed(1)}u van tevoren`, binnenGrens };
  }

  const count = input.annuleringenDezeMaand;
  if (count >= policy.geen_boete_eerste_x_keer) {
    // dienstUren rekent nachtdiensten over middernacht goed (voorheen viel dat terug op 6 uur).
    const duur = dienstUren(String(dienst.start_tijd).slice(0, 5), String(dienst.eind_tijd).slice(0, 5));
    const geschatteUren = Number.isFinite(duur) && duur > 0 ? duur : 6;
    const geschat = (dienst.uurtarief || 0) * (dienst.aantal_nodig || 1) * geschatteUren;
    const boeteBedrag = policy.gebruik_percentage ? geschat * (policy.boete_percentage / 100) : policy.boete_vast_bedrag || 0;
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
