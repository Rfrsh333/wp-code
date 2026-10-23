import { parseMaxAfstandKm } from "@/lib/locatie/locatie-regels";

/**
 * Pure regels voor de filters van Ontdekken (GET /api/medewerker/shifts/beschikbaar), stap 3
 * "Ontdekken zoals YoungOnes". Getest in tests/unit/ontdekken-regels.spec.ts. Alle parameters zijn
 * optioneel: zonder parameters is het antwoord zoals voorheen (op datum), alleen vallen verborgen
 * werkgevers nu weg.
 *
 * Querystring:
 *   max_afstand_km=25             alleen diensten met een bekende afstand ≤ 25 km (hemelsbreed);
 *                                 genegeerd als de eigen locatie onbekend is (geen postcode)
 *   min_uurtarief=16              wat de MEDEWERKER per uur krijgt (klanttarief − € 4) ≥ 16
 *   alleen_favoriete_werkgevers=1 alleen werkgevers die je als favoriet hebt bewaard
 *   waar_ik_favoriet_ben=1        alleen werkgevers bij wie jij in de favorieten staat
 *   toon_verborgen=1              verborgen werkgevers tóch tonen (standaard weg)
 *   sortering=datum|tarief|afstand
 */

export const ONTDEK_SORTERINGEN = ["datum", "tarief", "afstand"] as const;
export type OntdekSortering = (typeof ONTDEK_SORTERINGEN)[number];

export type OntdekFilters = {
  maxAfstandKm: number | null;
  minUurtarief: number | null;
  alleenFavorieteWerkgevers: boolean;
  waarIkFavorietBen: boolean;
  toonVerborgen: boolean;
  sortering: OntdekSortering;
};

export const GEEN_ONTDEK_FILTERS: OntdekFilters = {
  maxAfstandKm: null,
  minUurtarief: null,
  alleenFavorieteWerkgevers: false,
  waarIkFavorietBen: false,
  toonVerborgen: false,
  sortering: "datum",
};

const JA = new Set(["1", "true", "ja", "on", "yes"]);

function vlag(waarde: string | null): boolean {
  return waarde != null && JA.has(waarde.trim().toLowerCase());
}

type Params = { get(naam: string): string | null };

/** Filters uit de querystring. Een ongeldige waarde wordt genegeerd en gemeld in `ongeldig`. */
export function parseOntdekFilters(params: Params): { filters: OntdekFilters; ongeldig: string[] } {
  const ongeldig: string[] = [];
  const filters: OntdekFilters = { ...GEEN_ONTDEK_FILTERS };

  const afstand = params.get("max_afstand_km");
  if (afstand != null && afstand.trim() !== "") {
    const r = parseMaxAfstandKm(afstand);
    if (r.ok) filters.maxAfstandKm = r.waarde;
    else ongeldig.push("max_afstand_km");
  }

  const tarief = params.get("min_uurtarief");
  if (tarief != null && tarief.trim() !== "") {
    const n = Number(tarief.trim().replace(",", "."));
    if (Number.isFinite(n) && n >= 0 && n <= 1000) filters.minUurtarief = Math.round(n * 100) / 100;
    else ongeldig.push("min_uurtarief");
  }

  filters.alleenFavorieteWerkgevers = vlag(params.get("alleen_favoriete_werkgevers"));
  filters.waarIkFavorietBen = vlag(params.get("waar_ik_favoriet_ben"));
  filters.toonVerborgen = vlag(params.get("toon_verborgen"));

  const sortering = params.get("sortering")?.trim().toLowerCase();
  if (sortering) {
    if ((ONTDEK_SORTERINGEN as readonly string[]).includes(sortering)) filters.sortering = sortering as OntdekSortering;
    else ongeldig.push("sortering");
  }
  return { filters, ongeldig };
}

/** Wat een dienst in Ontdekken minimaal nodig heeft om te filteren en te sorteren. */
export type OntdekRegel = {
  datum: string;
  start_tijd: string;
  /** Wat de medewerker per uur krijgt (klanttarief − € 4). */
  medewerker_uurtarief: number;
  afstand_km: number | null;
  werkgever_favoriet: boolean;
  werkgever_verborgen: boolean;
  ik_ben_favoriet: boolean;
};

/**
 * Filters toepassen. `eigenLocatieBekend`: zonder eigen locatie kan het afstandsfilter niet en
 * wordt het overgeslagen (de API meldt dat). Met afstandsfilter vallen diensten met een onbekende
 * locatie weg: "binnen 10 km" betekent dat we het zeker weten.
 */
export function pasOntdekFiltersToe<T extends OntdekRegel>(regels: readonly T[], f: OntdekFilters, eigenLocatieBekend: boolean): T[] {
  return regels.filter((r) => {
    if (r.werkgever_verborgen && !f.toonVerborgen) return false;
    if (f.alleenFavorieteWerkgevers && !r.werkgever_favoriet) return false;
    if (f.waarIkFavorietBen && !r.ik_ben_favoriet) return false;
    if (f.minUurtarief != null && r.medewerker_uurtarief < f.minUurtarief) return false;
    if (f.maxAfstandKm != null && eigenLocatieBekend && (r.afstand_km == null || r.afstand_km > f.maxAfstandKm)) return false;
    return true;
  });
}

function opDatum(a: OntdekRegel, b: OntdekRegel): number {
  return a.datum.localeCompare(b.datum) || String(a.start_tijd).localeCompare(String(b.start_tijd));
}

/** Sorteren: datum (oplopend), tarief (hoogste eerst) of afstand (dichtstbij eerst, onbekend achteraan). */
export function sorteerOntdek<T extends OntdekRegel>(regels: readonly T[], sortering: OntdekSortering): T[] {
  const kopie = [...regels];
  if (sortering === "tarief") return kopie.sort((a, b) => b.medewerker_uurtarief - a.medewerker_uurtarief || opDatum(a, b));
  if (sortering === "afstand") {
    return kopie.sort((a, b) => {
      if (a.afstand_km == null && b.afstand_km == null) return opDatum(a, b);
      if (a.afstand_km == null) return 1;
      if (b.afstand_km == null) return -1;
      return a.afstand_km - b.afstand_km || opDatum(a, b);
    });
  }
  return kopie.sort(opDatum);
}

/** "3 reacties" / "1 reactie" / null bij 0 (dan tonen we niets). */
export function reactiesLabel(aantal: number | null | undefined): string | null {
  if (!aantal || aantal < 1) return null;
  return aantal === 1 ? "1 reactie" : `${aantal} reacties`;
}

export const VOORKEUR_SOORTEN = ["favoriet", "verborgen"] as const;
export type VoorkeurSoort = (typeof VOORKEUR_SOORTEN)[number];

export function parseVoorkeurSoort(waarde: unknown): VoorkeurSoort | null {
  return typeof waarde === "string" && (VOORKEUR_SOORTEN as readonly string[]).includes(waarde) ? (waarde as VoorkeurSoort) : null;
}
