// ============================================================================
// Calculator Types
// ============================================================================

export type FunctieType = "bediening" | "bar" | "keuken" | "afwas";
export type ErvaringType = "starter" | "ervaren" | "senior";
export type InzetType = "regulier" | "spoed";
export type VergelijkingType = "vast" | "uitzend" | "zzp";

export interface CalculatorInputs {
  functie: FunctieType;
  aantalMedewerkers: number;
  ervaring: ErvaringType;
  urenPerDienst: number;
  dagenPerWeek: number[]; // 0 = Ma, 6 = Zo
  inzetType: InzetType;
  vergelijkingen: VergelijkingType[];
}

export interface KostenResultaat {
  uurtarief: number;
  perDienst: number;
  perWeek: number;
  perMaand: number;
}

export interface Resultaten {
  vast?: KostenResultaat;
  uitzend?: KostenResultaat;
  zzp?: KostenResultaat;
}

export interface LeadFormData {
  naam: string;
  bedrijfsnaam: string;
  email: string;
}

export interface CalculatorLead {
  id: string;
  createdAt: Date;
  lead: LeadFormData;
  inputs: CalculatorInputs;
  resultaten: Resultaten;
  pdfToken: string;
  pdfTokenExpiresAt: Date;
}

export interface LeadSubmitResponse {
  success: boolean;
  pdfToken?: string;
  error?: string;
}
