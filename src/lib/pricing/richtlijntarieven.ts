import { basisTarieven, ervaringsMultiplier, functieLabels } from "@/lib/calculator/tarieven";
import type { FunctieType, VergelijkingType } from "@/lib/calculator/types";

/**
 * Eén bron voor richtlijntarieven per functie (besluit Rachid 23-10-2026: "geen minimale of
 * maximale tarieven, wel richtlijnen"). Puur, ook in de browser te gebruiken, getest in
 * tests/unit/richtlijntarieven.spec.ts.
 *
 * Gebruikt door: het klantportaal (adviestekst + zachte waarschuwing bij het uurtarief), de
 * AI-offertegenerator (lib/agents/offerte-generator.ts), de PDF-offerte (lib/pdf/offerte-pdf.tsx)
 * en de admin-prijsoverzichten (lib/pricing/smart-pricing.ts). Zo ziet één klant één prijs.
 *
 * Bron van de bedragen: de publieke kosten-calculator (lib/calculator/tarieven.ts):
 * - standaard = het uitzendtarief van een ervaren medewerker (zoals de calculator rekent);
 * - bereik = starter (×0,85) tot senior (×1,20), de ervaringsfactoren van de calculator.
 * Gastheer/gastvrouw en runner staan niet in de calculator; hun uitzendtarief komt uit de
 * bestaande prijsbron van het portaal (smart-pricing, voorheen BASIS_TARIEVEN), met de factoren
 * en de vast/zzp-tarieven van bediening.
 */

/**
 * Wettelijk minimumuurloon voor werknemers van 21 jaar en ouder, bruto, per 1 juli 2026:
 * € 14,99 (Rijksoverheid; o.a. AWVN, "Minimumloon stijgt per juli naar 14,99 euro per uur").
 * Wordt elk half jaar geïndexeerd: per 1 januari 2027 bijwerken.
 */
export const WETTELIJK_MINIMUMUURLOON = 14.99;
export const WETTELIJK_MINIMUMUURLOON_PEILDATUM = "1 juli 2026";

/** Bestaande marge-regel: de medewerker krijgt het klanttarief min € 4 (lib/medewerker/uren-regels). */
export const MARGE_PER_UUR = 4;

/**
 * Toeslagfactoren voor weekend en feestdag in offertes: de standaardfactoren die het
 * admin-prijsoverzicht al gebruikte zonder pricing_rules (smart-pricing, getAllPricingOverview).
 * Let op: de factuur rekent met de wettelijke/cao-toeslagen uit lib/compliance/arbeidstijden.ts.
 */
export const WEEKEND_FACTOR = 1.1;
export const FEESTDAG_FACTOR = 1.25;

type Bron = { categorie: FunctieType; uitzend: number; label: string };

const BRONNEN: Record<string, Bron> = {
  bediening: { categorie: "bediening", uitzend: basisTarieven.bediening.uitzend, label: functieLabels.bediening },
  bar: { categorie: "bar", uitzend: basisTarieven.bar.uitzend, label: functieLabels.bar },
  keuken: { categorie: "keuken", uitzend: basisTarieven.keuken.uitzend, label: functieLabels.keuken },
  afwas: { categorie: "afwas", uitzend: basisTarieven.afwas.uitzend, label: functieLabels.afwas },
  gastheer: { categorie: "bediening", uitzend: 27.5, label: "Gastheer / gastvrouw" },
  runner: { categorie: "bediening", uitzend: 25.5, label: "Runner" },
};

/** Benamingen in formulieren, offertes en het portaal → sleutel in BRONNEN. */
const ALIASSEN: Record<string, string> = {
  ober: "bediening",
  serveerster: "bediening",
  serveerder: "bediening",
  "ober/serveerster": "bediening",
  bedieningsmedewerker: "bediening",
  "evenement medewerker": "bediening",
  evenementmedewerker: "bediening",
  barista: "bar",
  bartender: "bar",
  barmedewerker: "bar",
  kok: "keuken",
  "sous-chef": "keuken",
  souschef: "keuken",
  chef: "keuken",
  keukenhulp: "keuken",
  afwasser: "afwas",
  spoelkeuken: "afwas",
  "afwas / spoelkeuken": "afwas",
  gastvrouw: "gastheer",
  "gastheer/gastvrouw": "gastheer",
  "gastheer / gastvrouw": "gastheer",
};

const rond = (n: number) => Math.round(n * 100) / 100;

export type Richtlijn = {
  functie: string;
  label: string;
  /** Gemiddeld (ervaren) tarief per uur. */
  standaard: number;
  min: number;
  max: number;
};

function sleutel(functie: string): string | null {
  const f = functie.trim().toLowerCase();
  if (BRONNEN[f]) return f;
  if (ALIASSEN[f]) return ALIASSEN[f];
  return null;
}

/** Richtlijn voor een functie (standaard uitzend), of null als de functie onbekend is. */
export function richtlijnVoorFunctie(functie: string | null | undefined, contract: VergelijkingType = "uitzend"): Richtlijn | null {
  if (!functie) return null;
  const k = sleutel(functie);
  if (!k) return null;
  const bron = BRONNEN[k];
  const standaard = contract === "uitzend" ? bron.uitzend : basisTarieven[bron.categorie][contract];
  return {
    functie: k,
    label: bron.label,
    standaard: rond(standaard * ervaringsMultiplier.ervaren),
    min: rond(standaard * ervaringsMultiplier.starter),
    max: rond(standaard * ervaringsMultiplier.senior),
  };
}

/** Alle richtlijnen (uitzend), bv. voor GET /api/klant/aanvraag en het admin-prijsoverzicht. */
export function alleRichtlijnen(): Richtlijn[] {
  return Object.keys(BRONNEN).map((k) => richtlijnVoorFunctie(k) as Richtlijn);
}

export function euro(n: number): string {
  return `€ ${n.toFixed(2).replace(".", ",")}`;
}

/** "€ 22,95 – € 32,40" */
export function richtlijnBereikTekst(r: Richtlijn): string {
  return `${euro(r.min)} – ${euro(r.max)}`;
}

/** Wat de medewerker per uur krijgt bij dit klanttarief (nooit negatief). */
export function medewerkerUurloonBij(klantTarief: number): number {
  return Math.max(0, rond(klantTarief - MARGE_PER_UUR));
}

export type TariefAdvies = {
  richtlijn: Richtlijn | null;
  onderRichtlijn: boolean;
  medewerkerUurloon: number;
  onderMinimumloon: boolean;
  /** Zachte waarschuwing (geen blokkade), of null als er niets te melden is. */
  waarschuwing: string | null;
};

/**
 * Zachte waarschuwing bij een klanttarief: onder de richtlijn van de functie, en expliciet als
 * de medewerker dan onder het wettelijk minimumuurloon zou uitkomen. Nooit een blokkade.
 */
export function tariefAdvies(klantTarief: number, functie: string | null | undefined): TariefAdvies {
  const richtlijn = richtlijnVoorFunctie(functie);
  const geldig = Number.isFinite(klantTarief) && klantTarief > 0;
  const medewerkerUurloon = geldig ? medewerkerUurloonBij(klantTarief) : 0;
  const onderRichtlijn = geldig && !!richtlijn && klantTarief < richtlijn.min;
  const onderMinimumloon = geldig && medewerkerUurloon < WETTELIJK_MINIMUMUURLOON;

  const delen: string[] = [];
  if (onderRichtlijn && richtlijn) {
    delen.push(
      `Dit tarief ligt onder de richtlijn voor ${richtlijn.label.toLowerCase()} (${richtlijnBereikTekst(richtlijn)} per uur). Met een lager tarief is het lastiger om personeel te vinden.`,
    );
  }
  if (onderMinimumloon) {
    delen.push(
      `Let op: de medewerker krijgt dan ${euro(medewerkerUurloon)} per uur (uw tarief min ${euro(MARGE_PER_UUR)}). Dat is onder het wettelijk minimumloon van ${euro(WETTELIJK_MINIMUMUURLOON)} bruto per uur (21 jaar en ouder, per ${WETTELIJK_MINIMUMUURLOON_PEILDATUM}).`,
    );
  }
  return { richtlijn, onderRichtlijn, medewerkerUurloon, onderMinimumloon, waarschuwing: delen.length ? delen.join(" ") : null };
}

/** Weekend- en feestdagtarief bij een basistarief (offertes). */
export function toeslagTarieven(basis: number): { weekend: number; feestdag: number } {
  return { weekend: rond(basis * WEEKEND_FACTOR), feestdag: rond(basis * FEESTDAG_FACTOR) };
}

/** Uitzendtarief (standaard) per functie, voor smart-pricing (admin-prijsoverzicht, calculatePrice). */
export function standaardUitzendTarieven(): Record<string, number> {
  return Object.fromEntries(alleRichtlijnen().map((r) => [r.functie, r.standaard]));
}

/** Contractvorm uit het aanvraagformulier → tarieftype van de calculator (zoals de PDF al deed). */
export function contractNaarTariefType(contract: string | null | undefined): VergelijkingType {
  if (contract === "loondienst") return "vast";
  if (contract === "zzp") return "zzp";
  return "uitzend";
}

/**
 * Offertetarief voor een functie: de standaard van de richtlijn, met weekend- en feestdagtarief.
 * Onbekende functie: die van bediening (zoals de offertegenerator en de PDF al terugvielen).
 */
export function offerteTarief(functie: string, contract: string | null | undefined): { uurtarief: number; weekend_tarief: number; feestdag_tarief: number } {
  const type = contractNaarTariefType(contract);
  const r = richtlijnVoorFunctie(functie, type) ?? (richtlijnVoorFunctie("bediening", type) as Richtlijn);
  const { weekend, feestdag } = toeslagTarieven(r.standaard);
  return { uurtarief: r.standaard, weekend_tarief: weekend, feestdag_tarief: feestdag };
}
