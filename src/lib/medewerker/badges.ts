/**
 * Badge-niveaus uit `medewerkers.badge` (gevuld door de bestaande gamification-logica) met de
 * voortgang naar het volgende niveau. Overgenomen uit de oude ProfielPage (dode code), zodat de
 * Badges-pagina echte gegevens toont i.p.v. vaste nepbadges.
 */

export interface BadgeInfo {
  badge: "starter" | "rising" | "star" | "toptalent";
  label: string;
  icon: string;
}

export const BADGE_CONFIG: Record<BadgeInfo["badge"], BadgeInfo> = {
  starter: { badge: "starter", label: "Starter", icon: "🌱" },
  rising: { badge: "rising", label: "Rising Star", icon: "📈" },
  star: { badge: "star", label: "Star", icon: "⭐" },
  toptalent: { badge: "toptalent", label: "TopTalent", icon: "🏆" },
};

export function huidigeBadge(badge: string | null | undefined): BadgeInfo {
  return BADGE_CONFIG[(badge ?? "starter") as BadgeInfo["badge"]] ?? BADGE_CONFIG.starter;
}

export interface VolgendeBadge {
  label: string;
  /** 0–100, op basis van het aantal diensten. */
  progress: number;
  dienstenNodig: number;
  scoreNodig: number;
  scoreOk: boolean;
}

// Gelijk aan de berekening in /api/klant/beoordelingen: méér dan 5/20/50 beoordeelde diensten
// (dus 6/21/51) én een minimale gemiddelde score. `medewerkers.totaal_diensten` = aantal beoordelingen.
const DREMPELS: Record<Exclude<BadgeInfo["badge"], "toptalent">, { volgende: string; diensten: number; score: number }> = {
  starter: { volgende: "Rising Star", diensten: 6, score: 3.5 },
  rising: { volgende: "Star", diensten: 21, score: 4 },
  star: { volgende: "TopTalent", diensten: 51, score: 4.25 },
};

export function volgendeBadge(huidig: string, diensten: number, score: number): VolgendeBadge | null {
  if (huidig === "toptalent") return null;
  const d = DREMPELS[(huidig in DREMPELS ? huidig : "starter") as keyof typeof DREMPELS];
  return {
    label: d.volgende,
    progress: Math.round(Math.min(diensten / d.diensten, 1) * 100),
    dienstenNodig: d.diensten,
    scoreNodig: d.score,
    scoreOk: score >= d.score,
  };
}
