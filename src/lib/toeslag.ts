import { berekenToeslag, type ToeslagType } from "@/lib/compliance/arbeidstijden";
import { roundCurrency } from "@/lib/reiskosten";

export interface ToeslagRegel {
  type: ToeslagType;
  percentage: number;
  /** Toeslagbedrag berekend over `uren × uurtarief × percentage`. */
  bedrag: number;
  reden: string;
}

/**
 * Bereken het toeslagbedrag (avond/nacht/weekend/feestdag) voor één dienst.
 *
 * Aanname (bevestigd 12-7-2026): het opgegeven `uurtarief` is het BASIS-tarief en de
 * toeslag komt daar bovenop. Roep aan met het klanttarief voor de factuur en met het
 * medewerkerloon voor de uitbetaling, zodat de toeslag zowel doorbelast als uitbetaald wordt.
 *
 * Geeft een bedrag van 0 (type "geen") terug bij ontbrekende gegevens, zodat aanroepers
 * de toeslag veilig altijd kunnen optellen.
 */
export function berekenToeslagRegel(
  uren: number,
  uurtarief: number,
  datum: string | null | undefined,
  startTijd: string | null | undefined,
  eindTijd: string | null | undefined,
): ToeslagRegel {
  if (!datum || !startTijd || !eindTijd || !(uren > 0) || !(uurtarief > 0)) {
    return { type: "geen", percentage: 0, bedrag: 0, reden: "" };
  }
  const t = berekenToeslag(datum, startTijd, eindTijd);
  const bedrag = roundCurrency(uren * uurtarief * (t.percentage / 100));
  return { type: t.type, percentage: t.percentage, bedrag, reden: t.reden };
}

/** Leesbaar label voor op de factuur / in overzichten. */
export function toeslagLabel(type: ToeslagType): string {
  switch (type) {
    case "avond":
      return "Avondtoeslag";
    case "nacht":
      return "Nachttoeslag";
    case "weekend":
      return "Weekendtoeslag";
    case "feestdag":
      return "Feestdagtoeslag";
    default:
      return "Toeslag";
  }
}
