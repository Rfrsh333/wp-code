import type { CalculatorInputs, Resultaten, KostenResultaat, VergelijkingType } from "./types";
import { basisTarieven, ervaringsMultiplier, spoedToeslag } from "./tarieven";

// ============================================================================
// Server-side Calculation
// ============================================================================
//
// This function is used both client-side (preview) and server-side (validation).
// Server-side recalculation ensures data integrity and prevents manipulation.

export function berekenKosten(inputs: CalculatorInputs): Resultaten {
  const resultaten: Resultaten = {};

  // Get base multipliers
  const ervaringMult = ervaringsMultiplier[inputs.ervaring];
  const spoedMult = inputs.inzetType === "spoed" ? 1 + spoedToeslag : 1;
  const aantalDagen = inputs.dagenPerWeek.length;

  // Calculate for each selected comparison type
  inputs.vergelijkingen.forEach((type: VergelijkingType) => {
    const basisTarief = basisTarieven[inputs.functie][type];

    // Final hourly rate: base × experience × urgency
    const uurtarief = basisTarief * ervaringMult * spoedMult;

    // Cost per shift: hourly rate × hours × employees
    const perDienst = uurtarief * inputs.urenPerDienst * inputs.aantalMedewerkers;

    // Cost per week: per shift × number of days
    const perWeek = perDienst * aantalDagen;

    // Cost per month: per week × average weeks per month (4.33)
    // 4.33 = 52 weeks / 12 months
    const perMaand = perWeek * 4.33;

    resultaten[type] = {
      uurtarief: Math.round(uurtarief * 100) / 100,
      perDienst: Math.round(perDienst),
      perWeek: Math.round(perWeek),
      perMaand: Math.round(perMaand),
    };
  });

  return resultaten;
}

// ============================================================================
// Input Validation
// ============================================================================

export function validateInputs(inputs: CalculatorInputs): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  // Functie
  if (!["bediening", "bar", "keuken", "afwas"].includes(inputs.functie)) {
    errors.push("Ongeldige functie");
  }

  // Aantal medewerkers: 1-50
  if (inputs.aantalMedewerkers < 1 || inputs.aantalMedewerkers > 50) {
    errors.push("Aantal medewerkers moet tussen 1 en 50 zijn");
  }

  // Ervaring
  if (!["starter", "ervaren", "senior"].includes(inputs.ervaring)) {
    errors.push("Ongeldig ervaringsniveau");
  }

  // Uren per dienst: 2-16
  if (inputs.urenPerDienst < 2 || inputs.urenPerDienst > 16) {
    errors.push("Uren per dienst moet tussen 2 en 16 zijn");
  }

  // Dagen per week: 1-7
  if (inputs.dagenPerWeek.length < 1 || inputs.dagenPerWeek.length > 7) {
    errors.push("Selecteer minimaal 1 en maximaal 7 dagen");
  }

  // Valid day indices: 0-6
  if (inputs.dagenPerWeek.some(d => d < 0 || d > 6)) {
    errors.push("Ongeldige dag geselecteerd");
  }

  // Inzet type
  if (!["regulier", "spoed"].includes(inputs.inzetType)) {
    errors.push("Ongeldig inzet type");
  }

  // Vergelijkingen: at least 1
  if (inputs.vergelijkingen.length < 1) {
    errors.push("Selecteer minimaal 1 vergelijkingstype");
  }

  // Valid comparison types
  const validTypes = ["vast", "uitzend", "zzp"];
  if (inputs.vergelijkingen.some(v => !validTypes.includes(v))) {
    errors.push("Ongeldig vergelijkingstype");
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

// ============================================================================
// Currency Formatting
// ============================================================================

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("nl-NL", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatCurrencyDecimal(amount: number): string {
  return new Intl.NumberFormat("nl-NL", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}
