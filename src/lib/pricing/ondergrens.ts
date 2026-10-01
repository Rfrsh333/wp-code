/**
 * Ondergrens en bereik van het klant-uurtarief, afgeleid van de bestaande prijsbron
 * (BASIS_TARIEVEN via getAllPricingOverview in smart-pricing). Gedeeld door de aanvraag-route
 * (validatie) en de AI-offerte (prompt + suggestie), zodat beide hetzelfde minimum hanteren.
 * De pure functies hier hebben geen imports en zijn los testbaar.
 */

export type TariefRegel = { functie: string; basis: number; weekend?: number; feestdag?: number; piek?: number };

const geldig = (n: unknown): n is number => typeof n === "number" && Number.isFinite(n) && n > 0;

/** Laagste basistarief; 0 als er geen (geldige) tarieven zijn = geen ondergrens. */
export function laagsteBasistarief(tarieven: readonly TariefRegel[]): number {
  const basis = tarieven.map((t) => t.basis).filter(geldig);
  return basis.length ? Math.min(...basis) : 0;
}

/** Bereik voor een suggestie: van het laagste basistarief tot het hoogste toeslagtarief. */
export function tariefBereik(tarieven: readonly TariefRegel[]): { min: number; max: number } | null {
  const min = laagsteBasistarief(tarieven);
  if (!min) return null;
  const alle = tarieven.flatMap((t) => [t.basis, t.weekend, t.feestdag, t.piek]).filter(geldig);
  return { min, max: Math.max(min, ...alle) };
}

/**
 * Uurtarief voor de AI-offerte: de suggestie van het model, maar nooit onder de ondergrens.
 * Zonder bruikbare suggestie het basistarief van de functie, anders de ondergrens; null als er
 * helemaal geen tarief bekend is.
 */
export function kiesUurtarief(
  suggestie: unknown,
  functie: unknown,
  tarieven: readonly TariefRegel[],
): number | null {
  const min = laagsteBasistarief(tarieven);
  const voorFunctie = tarieven.find((t) => t.functie === functie)?.basis;
  const n = typeof suggestie === "string" ? Number(suggestie.replace(",", ".")) : suggestie;
  if (geldig(n)) return Math.max(n, min);
  if (geldig(voorFunctie)) return voorFunctie;
  return min > 0 ? min : null;
}
