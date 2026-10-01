import { getAllPricingOverview } from "@/lib/pricing/smart-pricing";
import { captureRouteError } from "@/lib/sentry-utils";
import type { TariefRegel } from "@/lib/pricing/ondergrens";

/**
 * Tarieven uit de bestaande prijsbron. Lukt het ophalen niet, dan een lege lijst (= geen
 * ondergrens) i.p.v. alle aanvragen te blokkeren.
 */
export async function haalTariefOverzicht(route: string): Promise<TariefRegel[]> {
  try {
    const { tarieven } = await getAllPricingOverview();
    return tarieven;
  } catch (e) {
    captureRouteError(e, { route, action: "TARIEVEN" });
    return [];
  }
}
