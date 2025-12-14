import type { FunctieType, ErvaringType } from "./types";

// ============================================================================
// Horeca Tarieven 2024/2025
// ============================================================================
//
// Tarieven zijn gebaseerd op:
// - CAO Horeca 2024/2025
// - Marktgemiddelden voor uitzendwerk in de horeca
// - Werkgeverslasten van ~32% bovenop bruto loon (vast personeel)
//
// VAST PERSONEEL:
// - Bruto uurloon + 32% werkgeverslasten
// - Werkgeverslasten: vakantiegeld (8%), pensioen (6%), sociale premies (12%), verzekeringen (6%)
// - EXCLUSIEF: werving, training, ziekteverzuim, administratie, vervanging
//
// UITZENDKRACHT:
// - All-in tarief inclusief alle werkgeverslasten
// - Inclusief: werving, selectie, administratie, vervanging bij uitval
// - Marge uitzendbureau: ~35-45% bovenop bruto loon
//
// ZZP:
// - Uurtarief exclusief BTW
// - Risico: schijnzelfstandigheid bij structurele inzet
// - Geen werkgeverslasten, maar ook geen garanties

export const basisTarieven: Record<FunctieType, { vast: number; uitzend: number; zzp: number }> = {
  // Bediening: gemiddeld ervaren servicemedewerker
  bediening: { vast: 18.5, uitzend: 27.0, zzp: 25.5 },

  // Bar: barmedewerker met mixkennis
  bar: { vast: 18.5, uitzend: 27.0, zzp: 25.5 },

  // Keuken: kok/keukenhulp (hoger vanwege specialistische kennis)
  keuken: { vast: 19.5, uitzend: 28.0, zzp: 26.5 },

  // Afwas/Spoelkeuken: instapfunctie
  afwas: { vast: 17.0, uitzend: 25.0, zzp: 23.5 },
};

// ============================================================================
// Ervaring Multipliers
// ============================================================================
//
// Starter: weinig/geen horeca-ervaring, heeft begeleiding nodig
// Ervaren: 1-3 jaar ervaring, werkt zelfstandig
// Senior: 3+ jaar ervaring, kan team aansturen

export const ervaringsMultiplier: Record<ErvaringType, number> = {
  starter: 0.85,  // -15% t.o.v. ervaren
  ervaren: 1.0,   // baseline
  senior: 1.20,   // +20% t.o.v. ervaren
};

// ============================================================================
// Spoed Toeslag
// ============================================================================
//
// Regulier: aanvraag minimaal 48 uur van tevoren
// Spoed: aanvraag binnen 48 uur, +15% toeslag
// - Dekt extra wervingskosten en planning-inspanning

export const spoedToeslag = 0.15; // +15%

// ============================================================================
// Labels & Display
// ============================================================================

export const functieLabels: Record<FunctieType, string> = {
  bediening: "Bediening",
  bar: "Bar",
  keuken: "Keuken",
  afwas: "Afwas / Spoelkeuken",
};

export const functieIcons: Record<FunctieType, string> = {
  bediening: "🍽️",
  bar: "🍸",
  keuken: "👨‍🍳",
  afwas: "🧽",
};

export const ervaringLabels: Record<ErvaringType, string> = {
  starter: "Starter",
  ervaren: "Ervaren",
  senior: "Senior",
};

export const vergelijkingLabels: Record<string, string> = {
  vast: "Vast personeel",
  uitzend: "Uitzendkracht",
  zzp: "ZZP'er",
};

export const dagen = ["Ma", "Di", "Wo", "Do", "Vr", "Za", "Zo"];
