import { nlDatumKort } from "@/lib/nl-tijd";
import { dienstSleutel, type MeldingInvoer } from "@/lib/meldingen/meldingen-regels";

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

/**
 * Admin zet een dienst klaar voor een of meer medewerkers (dienst_aanbiedingen, 48 uur geldig).
 * Vervangt een kaart "Nieuwe dienst beschikbaar" over dezelfde dienst van kort ervoor.
 */
export function meldingDienstAangeboden(dienst: DienstKort | null | undefined, dienstId?: string | null): MeldingInvoer {
  return {
    title: "Er staat een dienst voor je klaar",
    body: `TopTalent heeft ${watEnWanneer(dienst)} voor je klaargezet. Reageer binnen 48 uur.`,
    url: "/medewerker/diensten/",
    categorie: "diensten",
    ...(dienstId ? { sleutels: [dienstSleutel(dienstId)], ontdubbel: "vervangen" as const } : {}),
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

// --- Uren & geld (stap 5, aanvulling): push naar de medewerker als zijn uren worden beoordeeld ------

export type UrenActie = "goedgekeurd" | "aangepast" | "afgewezen" | "definitief";

export type UrenMeldingInput = {
  actie: UrenActie;
  /** Wie het deed: de werkgever (klant) of TopTalent (admin). */
  door: "klant" | "admin";
  /** Aantal urenregels in deze bundel (bv. "Alles goedkeuren"); 1 = één regel met details. */
  aantal: number;
  klantNaam?: string | null;
  functie?: string | null;
  datum?: string | null;
  /** Uren van de regel (bij aangepast: de nieuwe uren van de werkgever). */
  uren?: number | null;
};

function urenTekst(uren: number | null | undefined): string {
  if (uren == null || !Number.isFinite(uren)) return "";
  return ` (${uren.toLocaleString("nl-NL", { maximumFractionDigits: 2 })} uur)`;
}

const UREN_TITELS: Record<UrenActie, string> = {
  goedgekeurd: "Uren goedgekeurd",
  aangepast: "Uren aangepast: jouw akkoord nodig",
  afgewezen: "Uren afgewezen",
  definitief: "Uren definitief goedgekeurd",
};

const UREN_WERKWOORD: Record<UrenActie, string> = {
  goedgekeurd: "goedgekeurd",
  aangepast: "aangepast",
  afgewezen: "afgewezen",
  definitief: "definitief goedgekeurd",
};

/** Push en melding (categorie uren_geld) voor een of meer beoordeelde urenregels. */
export function meldingUrenBeoordeeld(i: UrenMeldingInput): { title: string; body: string; url: string; tag: string; categorie: "uren_geld" } {
  const wie = i.door === "admin" ? "TopTalent" : i.klantNaam?.trim() || "De opdrachtgever";
  const werkwoord = UREN_WERKWOORD[i.actie];
  const aantal = Math.max(1, Math.floor(i.aantal || 1));
  let body: string;
  if (aantal > 1) {
    body = `${wie} heeft ${aantal} urenregistraties van je ${werkwoord}.`;
  } else {
    const dienst = `${i.functie || "je dienst"}${i.door === "admin" && i.klantNaam ? ` bij ${i.klantNaam}` : ""}`;
    const op = i.datum ? ` op ${nlDatumKort(i.datum)}` : "";
    body =
      i.actie === "aangepast"
        ? `${wie} heeft je uren voor ${dienst}${op} aangepast${i.uren != null ? ` naar${urenTekst(i.uren).replace(/[()]/g, "")}` : ""}.`
        : `${wie} heeft je uren voor ${dienst}${op} ${werkwoord}${urenTekst(i.uren)}.`;
  }
  if (i.actie === "aangepast") body += " Geef bij Uren akkoord of weiger de aanpassing.";
  if (i.actie === "afgewezen") body += " Heb je vragen, neem dan contact op met TopTalent.";
  return {
    title: UREN_TITELS[i.actie],
    body,
    url: "/medewerker/uren/",
    tag: `uren-${i.actie}`,
    categorie: "uren_geld",
  };
}

// --- Uren & geld (stap 6): push naar de medewerker als zijn uitbetaling is verwerkt ---------------

export type UitbetaaldMeldingInput = {
  /** id van de uitbetaling (zelffactuur); maakt de tag uniek per uitbetaling. */
  uitbetalingId: string;
  factuurNummer: string;
  /** Al opgemaakt bedrag incl. btw, bv. "€ 193,60" (euroTekst in lib/uitbetaling/regels.ts). */
  bedrag: string;
  ibanLaatste4?: string | null;
};

/**
 * Push en melding na "verwerkt in bank" (api/admin/uitbetalingen/rondes/[id]/verwerkt). Categorie
 * expliciet uren_geld (tab Uren & geld), niet afgeleid uit de tag.
 */
export function meldingUitbetaald(i: UitbetaaldMeldingInput): { title: string; body: string; url: string; tag: string; categorie: "uren_geld" } {
  return {
    title: "Je uitbetaling is verwerkt",
    body: `Factuur ${i.factuurNummer}: ${i.bedrag} is uitbetaald${i.ibanLaatste4 ? ` naar je rekening die eindigt op ${i.ibanLaatste4}` : ""}.`,
    url: "/medewerker/financieel/facturen",
    tag: `uitbetaling-${i.uitbetalingId}`,
    categorie: "uren_geld",
  };
}
