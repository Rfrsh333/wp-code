// ============================================================================
// C-21: ABU Fase A/B/C Systeem voor Uitzendovereenkomsten
// ============================================================================
//
// Fase A (uitzendbeding): max 78 gewerkte weken (1,5 jaar)
//   - Flexibel, eindig bij einde opdracht
//   - Maximaal 6 contracten
//
// Fase B (contractfase): max 4 jaar na Fase A
//   - Maximaal 6 contracten in max 4 jaar
//   - Na 6e contract of na 4 jaar -> Fase C
//
// Fase C (onbepaalde tijd):
//   - Contract voor onbepaalde tijd
//   - Volledige ontslagbescherming
//
// ============================================================================

import type { UitzendFase } from "@/types/contracten";

export interface FaseBerekening {
  huidigeFase: UitzendFase;
  wachtOpOvergang: boolean;
  volgendeFase?: UitzendFase;
  redenOvergang?: string;
  resterendeWeken?: number;
  resterendeContracten?: number;
}

export function berekenUitzendFase(
  gewerkte_weken: number,
  aantal_contracten: number,
  fase_start_datum: string,
): FaseBerekening {
  // Fase A: max 78 weken
  if (gewerkte_weken < 78 && aantal_contracten <= 6) {
    const resterend = 78 - gewerkte_weken;

    if (gewerkte_weken >= 72 || aantal_contracten >= 5) {
      return {
        huidigeFase: "A",
        wachtOpOvergang: true,
        volgendeFase: "B",
        redenOvergang: `Bijna einde Fase A: ${resterend} weken resterend, ${6 - aantal_contracten} contracten resterend.`,
        resterendeWeken: resterend,
        resterendeContracten: 6 - aantal_contracten,
      };
    }

    return {
      huidigeFase: "A",
      wachtOpOvergang: false,
      resterendeWeken: resterend,
      resterendeContracten: 6 - aantal_contracten,
    };
  }

  // Fase B: na Fase A, max 6 contracten in max 4 jaar
  const faseStart = new Date(fase_start_datum);
  const nu = new Date();
  const jarenInFaseB = (nu.getTime() - faseStart.getTime()) / (365.25 * 24 * 60 * 60 * 1000);

  if (aantal_contracten <= 6 && jarenInFaseB < 4) {
    if (aantal_contracten >= 5 || jarenInFaseB >= 3.5) {
      return {
        huidigeFase: "B",
        wachtOpOvergang: true,
        volgendeFase: "C",
        redenOvergang: `Bijna einde Fase B: ${6 - aantal_contracten} contracten resterend, ${(4 - jarenInFaseB).toFixed(1)} jaar resterend.`,
        resterendeContracten: 6 - aantal_contracten,
      };
    }

    return {
      huidigeFase: "B",
      wachtOpOvergang: false,
      resterendeContracten: 6 - aantal_contracten,
    };
  }

  // Fase C: onbepaalde tijd
  return {
    huidigeFase: "C",
    wachtOpOvergang: false,
    redenOvergang: "Contract voor onbepaalde tijd (Fase C). Volledige ontslagbescherming van toepassing.",
  };
}

export function getFaseLabel(fase: UitzendFase): string {
  switch (fase) {
    case "A": return "Fase A (Uitzendbeding)";
    case "B": return "Fase B (Contractfase)";
    case "C": return "Fase C (Onbepaalde tijd)";
  }
}

export function getFaseBeschrijving(fase: UitzendFase): string {
  switch (fase) {
    case "A": return "Max 78 gewerkte weken, max 6 contracten. Flexibel, eindig bij einde opdracht.";
    case "B": return "Max 4 jaar, max 6 contracten. Vaste contractperiodes.";
    case "C": return "Contract voor onbepaalde tijd. Volledige ontslagbescherming.";
  }
}
