import { berekenToeslagRegel, toeslagLabel } from "@/lib/toeslag";
import { MEDEWERKER_REISKOSTEN_PER_KM, sanitizeKilometers } from "@/lib/reiskosten";
import { medewerkerUurtariefVoorAanmelding } from "@/lib/medewerker/reactie-regels";
import { isFeestdag } from "@/lib/compliance/arbeidstijden";
import { plusDagen } from "@/lib/nl-tijd";
import { isGeldigIban } from "@/lib/medewerker/iban";
import { isGeldigBtwNummer, isGeldigKvkNummer } from "@/lib/medewerker/zzp-gegevens";

/**
 * Pure regels voor uitbetalen met zelffacturering (stap 6 "Geld"). Geen database, geen Next;
 * getest in tests/unit/uitbetaling-regels.spec.ts. De DB-kant staat in lib/uitbetaling/db.ts.
 *
 * Geld: we rekenen in HELE CENTEN (integers). Elke regel wordt één keer half-naar-boven afgerond
 * naar centen; de factuurtotalen zijn de som van de afgeronde regels, en de btw wordt één keer over
 * het totaal berekend. Zo kloppen factuur, SEPA-bedrag en kwartaaltotalen altijd tot op de cent.
 *
 * Bedrag per dienst (bestaande regels, niets nieuws verzonnen):
 * - uurtarief medewerker = zijn tegenbod, anders klanttarief − € 4 (medewerkerUurtariefVoorAanmelding);
 * - toeslag (avond/nacht/weekend/feestdag) over het medewerkertarief (lib/toeslag: "met het
 *   medewerkerloon voor de uitbetaling");
 * - reiskosten = km × € 0,21 (MEDEWERKER_REISKOSTEN_PER_KM).
 * Btw: 21% over het totaal, of 0% met KOR-vermelding als de zzp'er de KOR heeft aangezet.
 */

export const BTW_PERCENTAGE = 21;
export const KOR_VERMELDING = "Vrijgesteld van omzetbelasting op grond van de kleineondernemersregeling (KOR, art. 25 Wet OB 1968)";
export const VERMELDING_AFNEMER = "Factuur uitgereikt door afnemer";

/** Waarde → hele centen, half naar boven (ook bij floats als 117.025). */
export function naarCenten(waarde: number | string | null | undefined): number {
  const n = typeof waarde === "number" ? waarde : Number(waarde);
  if (!Number.isFinite(n)) return 0;
  // Via een string met exponent: 1.005 → "1.005e2" → 100.5 → 101 (Math.round(1.005*100) = 100).
  const centen = Math.round(Number(`${n}e2`));
  return Number.isFinite(centen) ? centen : Math.round(n * 100);
}

/** Hele centen → euro (number met 2 decimalen) voor opslag in numeric-kolommen. */
export function centenNaarEuro(centen: number): number {
  return Math.round(centen) / 100;
}

/** "€ 1.234,56" (ook negatief). */
export function euroTekst(centen: number): string {
  const teken = centen < 0 ? "-" : "";
  const abs = Math.abs(Math.round(centen));
  const euro = Math.floor(abs / 100).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  return `${teken}€ ${euro},${String(abs % 100).padStart(2, "0")}`;
}

/** a × b / deler in centen, half naar boven, met integers (geen float-afronding). */
function vermenigvuldigCenten(a: number, b: number, deler: number): number {
  return Math.round((a * b) / deler);
}

export type UitbetaalBron = {
  uren_registratie_id: string;
  datum: string | null;
  werkgever: string;
  functie?: string | null;
  gewerkte_uren: number | null;
  start_tijd: string | null;
  eind_tijd: string | null;
  reiskosten_km: number | string | null;
  /** Uurtarief van de dienst (klanttarief). */
  dienst_uurtarief: number | null;
  /** Tegenbod van de medewerker (wat hij per uur krijgt), of null. */
  voorgesteld_uurtarief: number | null;
};

export type UitbetaalRegel = {
  uren_registratie_id: string;
  datum: string | null;
  werkgever: string;
  omschrijving: string;
  uren: number;
  uurtarief_centen: number;
  uren_centen: number;
  toeslag_centen: number;
  toeslag_omschrijving: string | null;
  reiskosten_km: number;
  reiskosten_centen: number;
  /** Totaal van deze dienst excl. btw. */
  bedrag_centen: number;
};

/** Bedragen van één dienst voor de zelffactuur (alles in centen). */
export function berekenRegel(bron: UitbetaalBron): UitbetaalRegel {
  const uren = Math.max(0, Number(bron.gewerkte_uren) || 0);
  const urenHonderdsten = Math.round(uren * 100);
  const tarief = medewerkerUurtariefVoorAanmelding(bron.dienst_uurtarief, bron.voorgesteld_uurtarief);
  const tariefCenten = naarCenten(tarief);
  const urenCenten = vermenigvuldigCenten(urenHonderdsten, tariefCenten, 100);

  // Type en percentage uit de bestaande toeslagregels; het bedrag zelf rekenen we in centen.
  const toeslag = berekenToeslagRegel(uren, tarief, bron.datum, bron.start_tijd, bron.eind_tijd);
  const toeslagCenten = toeslag.percentage > 0 ? vermenigvuldigCenten(urenHonderdsten * tariefCenten, toeslag.percentage, 10000) : 0;

  const km = sanitizeKilometers(bron.reiskosten_km);
  const reiskostenCenten = vermenigvuldigCenten(Math.round(km * 100), naarCenten(MEDEWERKER_REISKOSTEN_PER_KM), 100);

  return {
    uren_registratie_id: bron.uren_registratie_id,
    datum: bron.datum,
    werkgever: bron.werkgever || "Onbekend",
    omschrijving: bron.functie ? `Werkzaamheden ${bron.functie}` : "Werkzaamheden",
    uren: urenHonderdsten / 100,
    uurtarief_centen: tariefCenten,
    uren_centen: urenCenten,
    toeslag_centen: toeslagCenten,
    toeslag_omschrijving: toeslagCenten > 0 ? `${toeslagLabel(toeslag.type)} ${toeslag.percentage}%` : null,
    reiskosten_km: km,
    reiskosten_centen: reiskostenCenten,
    bedrag_centen: urenCenten + toeslagCenten + reiskostenCenten,
  };
}

export type FactuurTotalen = {
  excl_centen: number;
  btw_percentage: number;
  btw_centen: number;
  incl_centen: number;
  kor: boolean;
};

/** Totalen van een zelffactuur: som van de regels, btw één keer over het totaal (of 0 bij KOR). */
export function berekenTotalen(regels: readonly Pick<UitbetaalRegel, "bedrag_centen">[], kor: boolean): FactuurTotalen {
  const excl = regels.reduce((som, r) => som + r.bedrag_centen, 0);
  const btwPercentage = kor ? 0 : BTW_PERCENTAGE;
  const btw = kor ? 0 : vermenigvuldigCenten(excl, BTW_PERCENTAGE, 100);
  return { excl_centen: excl, btw_percentage: btwPercentage, btw_centen: btw, incl_centen: excl + btw, kor };
}

export type ZelffactuurModel = {
  medewerker_id: string;
  volgnummer: number;
  factuur_nummer: string;
  factuur_datum: string;
  regels: UitbetaalRegel[];
  totalen: FactuurTotalen;
};

/** Eén zelffactuur (= één uitbetaling) voor één medewerker: regels op datum, totalen, nummer. */
export function bouwZelffactuur(input: {
  medewerkerId: string;
  volgnummer: number;
  factuurDatum: string;
  kor: boolean;
  regels: readonly UitbetaalRegel[];
}): ZelffactuurModel {
  const regels = [...input.regels].sort((a, b) => (a.datum ?? "").localeCompare(b.datum ?? ""));
  return {
    medewerker_id: input.medewerkerId,
    volgnummer: input.volgnummer,
    factuur_nummer: zelffactuurNummer(input.medewerkerId, input.volgnummer),
    factuur_datum: input.factuurDatum,
    regels,
    totalen: berekenTotalen(regels, input.kor),
  };
}

// --- Status van een dienst richting uitbetaling -----------------------------------------------

export type UitbetaalStatus =
  /** Uren gefactureerd maar niet door TopTalent (admin) goedgekeurd: eerst goedkeuren. */
  | "wacht_op_goedkeuring"
  /** Goedgekeurd; de werkgever is nog niet gefactureerd of heeft de factuur nog niet betaald. */
  | "wacht_op_betaling_werkgever"
  /** Werkgever heeft betaald: kan in een uitbetaalronde. */
  | "uitbetaalbaar"
  | "in_uitbetaalronde"
  | "uitbetaald";

export const STATUS_LABELS: Record<UitbetaalStatus, string> = {
  wacht_op_goedkeuring: "Wordt gecontroleerd door TopTalent",
  wacht_op_betaling_werkgever: "Wacht op betaling werkgever",
  uitbetaalbaar: "Werkgever heeft betaald, wordt uitbetaald",
  in_uitbetaalronde: "In uitbetaalronde",
  uitbetaald: "Uitbetaald",
};

export type StatusInvoer = {
  /** uren_registraties.status */
  status: string | null;
  /** uren_registraties.goedgekeurd_at: alleen gezet bij goedkeuring door de admin. */
  goedgekeurd_at: string | null;
  /** Status van de klantfactuur waar deze uren op staan, of null als er geen is. */
  klant_factuur_status: string | null;
  /** Status van de zelffactuur (uitbetalingen.status) als de uren al in een ronde zitten. */
  uitbetaling_status: string | null;
};

/**
 * Besluit Rachid: uitbetalen pas NA betaling door de werkgever. Uitbetaalbaar = door de admin
 * goedgekeurd (goedgekeurd_at gezet) én op een klantfactuur met status 'betaald' én nog niet in
 * een ronde. Geeft null voor uren die (nog) niet meetellen (ingediend, afgewezen, alleen door de
 * klant goedgekeurd, ...).
 */
export function uitbetaalStatus(r: StatusInvoer): UitbetaalStatus | null {
  if (r.uitbetaling_status === "uitbetaald") return "uitbetaald";
  if (r.uitbetaling_status === "in_uitbetaalronde") return "in_uitbetaalronde";
  if (r.status !== "goedgekeurd" && r.status !== "gefactureerd") return null;
  if (!r.goedgekeurd_at) return r.status === "gefactureerd" ? "wacht_op_goedkeuring" : null;
  if (r.status === "gefactureerd" && r.klant_factuur_status === "betaald") return "uitbetaalbaar";
  return "wacht_op_betaling_werkgever";
}

// --- Factuurnummer -----------------------------------------------------------------------------

/** Vaste code per medewerker in het factuurnummer: de eerste 8 tekens van zijn id, in hoofdletters. */
export function medewerkerCode(medewerkerId: string): string {
  const code = medewerkerId.replace(/[^0-9a-zA-Z]/g, "").slice(0, 8).toUpperCase();
  if (code.length < 8) throw new Error("Ongeldig medewerker-id voor factuurnummer");
  return code;
}

/**
 * Opeenvolgend factuurnummer per zzp'er: "ZF-<code>-0001", "ZF-<code>-0002", … Eén doorlopende
 * reeks per medewerker (uniek door de code + unique-constraints in de database). Alleen
 * A-Z/0-9/"-" en ≤ 35 tekens, zodat hetzelfde nummer als SEPA-EndToEndId en omschrijving kan.
 */
export function zelffactuurNummer(medewerkerId: string, volgnummer: number): string {
  if (!Number.isSafeInteger(volgnummer) || volgnummer < 1) throw new Error("Volgnummer moet ≥ 1 zijn");
  return `ZF-${medewerkerCode(medewerkerId)}-${String(volgnummer).padStart(4, "0")}`;
}

/** Volgende volgnummer na het hoogste bestaande (of 1). */
export function volgendVolgnummer(hoogste: number | null | undefined): number {
  return (Number.isSafeInteger(hoogste) && (hoogste as number) > 0 ? (hoogste as number) : 0) + 1;
}

// --- Datums ------------------------------------------------------------------------------------

/** Werkdag = maandag t/m vrijdag en geen Nederlandse feestdag (lib/compliance/arbeidstijden). */
export function isWerkdag(datum: string): boolean {
  const dag = new Date(`${datum}T12:00:00Z`).getUTCDay();
  return dag !== 0 && dag !== 6 && !isFeestdag(datum);
}

/** `datum` plus `n` werkdagen (n = 0 → dezelfde datum). */
export function plusWerkdagen(datum: string, n: number): string {
  let d = datum;
  let over = Math.max(0, Math.floor(n));
  while (over > 0) {
    d = plusDagen(d, 1);
    if (isWerkdag(d)) over -= 1;
  }
  return d;
}

/** Eerstvolgende werkdag ná `datum` (standaard uitvoerdatum van het SEPA-bestand). */
export function volgendeWerkdag(datum: string): string {
  return plusWerkdagen(datum, 1);
}

/** Kwartaal (1–4) van een datum YYYY-MM-DD. */
export function kwartaalVan(datum: string): number {
  const maand = Number(datum.slice(5, 7));
  return Math.min(4, Math.max(1, Math.ceil(maand / 3)));
}

export function kwartaalGrenzen(jaar: number, kwartaal: number): { start: string; eind: string } {
  const startMaand = (kwartaal - 1) * 3 + 1;
  const eindMaand = startMaand + 2;
  const laatsteDag = new Date(Date.UTC(jaar, eindMaand, 0)).getUTCDate();
  const mm = (m: number) => String(m).padStart(2, "0");
  return { start: `${jaar}-${mm(startMaand)}-01`, eind: `${jaar}-${mm(eindMaand)}-${mm(laatsteDag)}` };
}

export type KwartaalFactuur = { factuur_datum: string; excl_centen: number; btw_centen: number; incl_centen: number };
export type KwartaalTotaal = { kwartaal: number; aantal: number; excl_centen: number; btw_centen: number; incl_centen: number };

/** Totalen per kwartaal (1–4) van één jaar, op factuurdatum: voor de btw-aangifte van de zzp'er. */
export function kwartaalTotalen(facturen: readonly KwartaalFactuur[], jaar: number): KwartaalTotaal[] {
  const totalen: KwartaalTotaal[] = [1, 2, 3, 4].map((k) => ({ kwartaal: k, aantal: 0, excl_centen: 0, btw_centen: 0, incl_centen: 0 }));
  for (const f of facturen) {
    if (Number(f.factuur_datum.slice(0, 4)) !== jaar) continue;
    const t = totalen[kwartaalVan(f.factuur_datum) - 1];
    t.aantal += 1;
    t.excl_centen += f.excl_centen;
    t.btw_centen += f.btw_centen;
    t.incl_centen += f.incl_centen;
  }
  return totalen;
}

// --- CSV ---------------------------------------------------------------------------------------

/** Bedrag voor CSV in Nederlandse notatie zonder valutateken: "1234,56". */
export function csvBedrag(centen: number): string {
  const teken = centen < 0 ? "-" : "";
  const abs = Math.abs(Math.round(centen));
  return `${teken}${Math.floor(abs / 100)},${String(abs % 100).padStart(2, "0")}`;
}

/** Eén CSV-veld (puntkomma-gescheiden): quotes verdubbelen, formule-injectie neutraliseren. */
export function csvVeld(waarde: string | number | null | undefined): string {
  let s = waarde == null ? "" : String(waarde);
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return /[;"\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export type CsvFactuur = {
  factuur_nummer: string;
  factuur_datum: string;
  excl_centen: number;
  btw_percentage: number;
  btw_centen: number;
  incl_centen: number;
  kor: boolean;
  status: UitbetaalStatus;
  uitbetaald_op: string | null;
};

/** CSV van de facturen in een kwartaal (UTF-8 met BOM, zodat Excel de euro's goed toont). */
export function facturenCsv(facturen: readonly CsvFactuur[]): string {
  const kop = ["Factuurnummer", "Factuurdatum", "Bedrag excl. btw", "Btw-tarief", "Btw", "Bedrag incl. btw", "Status", "Uitbetaald op"];
  const regels = facturen.map((f) =>
    [
      f.factuur_nummer,
      f.factuur_datum,
      csvBedrag(f.excl_centen),
      f.kor ? "KOR (vrijgesteld)" : `${f.btw_percentage}%`,
      csvBedrag(f.btw_centen),
      csvBedrag(f.incl_centen),
      STATUS_LABELS[f.status] ?? f.status,
      f.uitbetaald_op ? f.uitbetaald_op.slice(0, 10) : "",
    ]
      .map(csvVeld)
      .join(";"),
  );
  const tot = facturen.reduce(
    (t, f) => ({ excl: t.excl + f.excl_centen, btw: t.btw + f.btw_centen, incl: t.incl + f.incl_centen }),
    { excl: 0, btw: 0, incl: 0 },
  );
  const totaal = ["Totaal", "", csvBedrag(tot.excl), "", csvBedrag(tot.btw), csvBedrag(tot.incl), "", ""].map(csvVeld).join(";");
  return `﻿${[kop.map(csvVeld).join(";"), ...regels, totaal].join("\r\n")}\r\n`;
}

// --- Leveranciersgegevens (de zzp'er) ------------------------------------------------------------

export type LeverancierGegevens = {
  naam: string | null;
  adres: string | null;
  postcode: string | null;
  stad: string | null;
  kvk_nummer: string | null;
  btw_nummer: string | null;
};

/** Factuuradres als dat volledig is ingevuld, anders het woonadres uit het profiel. */
export function kiesAdres(m: {
  adres?: string | null;
  postcode?: string | null;
  stad?: string | null;
  factuur_adres?: string | null;
  factuur_postcode?: string | null;
  factuur_stad?: string | null;
}): { adres: string | null; postcode: string | null; stad: string | null } {
  const schoon = (v: string | null | undefined) => (v && v.trim() ? v.trim() : null);
  if (schoon(m.factuur_adres) && schoon(m.factuur_stad)) {
    return { adres: schoon(m.factuur_adres), postcode: schoon(m.factuur_postcode), stad: schoon(m.factuur_stad) };
  }
  return { adres: schoon(m.adres), postcode: schoon(m.postcode), stad: schoon(m.stad) };
}

export type BlokkadeCode = "geen_akkoord" | "iban" | "naam" | "adres" | "kvk_nummer" | "btw_nummer";

export const BLOKKADE_LABELS: Record<BlokkadeCode, string> = {
  geen_akkoord: "Geen (geldig) akkoord zelffacturering",
  iban: "IBAN ontbreekt of is ongeldig",
  naam: "Naam ontbreekt",
  adres: "Adres ontbreekt",
  kvk_nummer: "KvK-nummer ontbreekt of is ongeldig",
  btw_nummer: "Btw-id ontbreekt of is ongeldig",
};

export type LeverancierControle = {
  naam: string | null;
  adres: string | null;
  stad: string | null;
  kvk_nummer: string | null;
  /** Ontsleuteld. */
  btw_nummer: string | null;
  /** Ontsleuteld. Een waarde die nog met "enc:" begint, is niet te ontsleutelen en dus ongeldig. */
  iban: string | null;
  akkoord_op: string | null;
  akkoord_versie: string | null;
};

/**
 * Waarom er (nog) geen zelffactuur voor deze medewerker kan worden gemaakt. Leeg = in orde.
 * Een factuur zonder geldige NAW/KvK/btw-id of zonder akkoord op de huidige tekst maken we niet.
 */
export function leverancierBlokkades(m: LeverancierControle, huidigeVersie: string): BlokkadeCode[] {
  const fouten: BlokkadeCode[] = [];
  if (!m.akkoord_op || m.akkoord_versie !== huidigeVersie) fouten.push("geen_akkoord");
  if (!m.iban || !isGeldigIban(m.iban)) fouten.push("iban");
  if (!m.naam?.trim()) fouten.push("naam");
  if (!m.adres?.trim() || !m.stad?.trim()) fouten.push("adres");
  if (!isGeldigKvkNummer(m.kvk_nummer)) fouten.push("kvk_nummer");
  if (!isGeldigBtwNummer(m.btw_nummer)) fouten.push("btw_nummer");
  return fouten;
}
