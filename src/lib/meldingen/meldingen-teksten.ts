import { nlDatumKort } from "@/lib/nl-tijd";
import type { MeldingInvoer } from "@/lib/meldingen/meldingen-regels";

/**
 * Meldingen voor gebeurtenissen die alleen een mail kregen (geen push). Pure tekstbouwers, los
 * getest; de route slaat ze op met bewaarMeldingen (lib/meldingen/meldingen-opslag.ts).
 */

type DienstKort = {
  functie?: string | null;
  klant_naam?: string | null;
  datum?: string | null;
  start_tijd?: string | null;
};

function watEnWanneer(d: DienstKort | null | undefined): string {
  if (!d) return "een dienst";
  const wat = `${d.functie || "een dienst"}${d.klant_naam ? ` bij ${d.klant_naam}` : ""}`;
  if (!d.datum) return wat;
  return `${wat} op ${nlDatumKort(d.datum)}${d.start_tijd ? ` om ${d.start_tijd.slice(0, 5)}` : ""}`;
}

/** Admin zet een dienst klaar voor een of meer medewerkers (dienst_aanbiedingen, 48 uur geldig). */
export function meldingDienstAangeboden(dienst: DienstKort | null | undefined): MeldingInvoer {
  return {
    title: "Er staat een dienst voor je klaar",
    body: `TopTalent heeft ${watEnWanneer(dienst)} voor je klaargezet. Reageer binnen 48 uur.`,
    url: "/medewerker/diensten/",
    categorie: "diensten",
  };
}

/** De vervanger is ingepland (vervanging geaccepteerd door de oorspronkelijke medewerker). */
export function meldingVervangerIngepland(dienst: DienstKort | null | undefined): MeldingInvoer {
  return {
    title: "Je bent ingepland als vervanger",
    body: `Je neemt ${watEnWanneer(dienst)} over.`,
    url: "/medewerker/diensten/",
    categorie: "diensten",
  };
}

/** Een contract staat klaar om te ondertekenen (admin verstuurt het contract). */
export function meldingContractTerOndertekening(titel: string | null | undefined): MeldingInvoer {
  return {
    title: "Contract klaar om te ondertekenen",
    body: titel?.trim()
      ? `"${titel.trim()}" staat voor je klaar. Je kunt het ondertekenen onder Contracten.`
      : "Er staat een contract voor je klaar. Je kunt het ondertekenen onder Contracten.",
    url: "/medewerker/contracten/",
    categorie: "account",
  };
}
