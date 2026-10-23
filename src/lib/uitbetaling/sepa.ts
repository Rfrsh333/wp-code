import { isGeldigIban, normaliseerIban } from "@/lib/medewerker/iban";

/**
 * SEPA Credit Transfer-bestand (pain.001.001.03) voor een uitbetaalronde. Puur, zonder
 * afhankelijkheden van Next of de database; getest in tests/unit/uitbetaling-sepa.spec.ts.
 *
 * Er gaat hier NOOIT geld weg: het bestand wordt door een admin gedownload en door Rachid zelf in
 * de bank geüpload. Er is geen bankkoppeling.
 *
 * Regels (EPC SEPA Credit Transfer Implementation Guidelines + XSD pain.001.001.03):
 * - bedragen in euro met precies 2 decimalen ("12.30"), minimaal 0.01, maximaal 999999999.99;
 *   intern rekenen we in hele centen zodat er niets afrondt;
 * - NbOfTxs en CtrlSum staan zowel in GrpHdr als in PmtInf en kloppen met de transacties;
 * - tekst alleen uit de SEPA-tekenset: a-z A-Z 0-9 / - ? : ( ) . , ' + en spatie. Accenten
 *   worden omgezet (é → e, ß → ss), & wordt +, de rest wordt een spatie;
 * - lengtes: naam 70, omschrijving (Ustrd) 140, MsgId/PmtInfId/EndToEndId 35;
 * - identificaties alleen uit A-Z a-z 0-9 en "-" (geen "/" aan begin of eind of "//").
 */

export const SEPA_NAMESPACE = "urn:iso:std:iso:20022:tech:xsd:pain.001.001.03";
export const SEPA_MAX_NAAM = 70;
export const SEPA_MAX_OMSCHRIJVING = 140;
export const SEPA_MAX_ID = 35;
/** Hoogste bedrag per transactie in centen (999.999.999,99). */
export const SEPA_MAX_CENTEN = 99_999_999_999;

const BIC = /^[A-Z]{6}[A-Z2-9][A-NP-Z0-9]([A-Z0-9]{3})?$/;
const DATUM = /^\d{4}-\d{2}-\d{2}$/;

/**
 * IBAN-landen binnen de EER (EU + IJsland, Liechtenstein, Noorwegen). Alleen daarvoor mag de BIC
 * van de ontvangende bank ontbreken; voor SEPA-landen buiten de EER (CH, GB, …) is die verplicht en
 * die vragen we niet uit. Franse overzeese gebieden gebruiken FR-IBAN's.
 */
const EER_LANDEN = new Set([
  "AT", "BE", "BG", "CY", "CZ", "DE", "DK", "EE", "ES", "FI", "FR", "GR", "HR", "HU", "IE", "IT", "LT", "LU",
  "LV", "MT", "NL", "PL", "PT", "RO", "SE", "SI", "SK", "IS", "LI", "NO",
]);

export function isEerIban(iban: string): boolean {
  return EER_LANDEN.has(normaliseerIban(iban).slice(0, 2));
}

/** Bestaat deze kalenderdatum (geen 2026-02-30)? */
export function isEchteDatum(datum: string): boolean {
  if (!DATUM.test(datum)) return false;
  const [j, m, d] = datum.split("-").map(Number);
  const t = new Date(Date.UTC(j, m - 1, d));
  return t.getUTCFullYear() === j && t.getUTCMonth() === m - 1 && t.getUTCDate() === d;
}

export type SepaRekening = {
  naam: string;
  iban: string;
  /** Optioneel; zonder BIC zetten we "NOTPROVIDED" (toegestaan binnen de EER). */
  bic?: string | null;
};

export type SepaBetaling = {
  /** Uniek per transactie; bij ons het factuurnummer. */
  endToEndId: string;
  naam: string;
  iban: string;
  bedragCenten: number;
  /** Ongestructureerde omschrijving (bij ons: het factuurnummer). */
  omschrijving: string;
};

export type SepaInvoer = {
  berichtId: string;
  /** Moment van aanmaken; als lokale (NL) tijd in CreDtTm. */
  aangemaaktOp: Date;
  /** Gewenste uitvoerdatum YYYY-MM-DD. */
  uitvoerDatum: string;
  debiteur: SepaRekening;
  betalingen: readonly SepaBetaling[];
};

export class SepaFout extends Error {
  constructor(bericht: string) {
    super(bericht);
    this.name = "SepaFout";
  }
}

const VERVANG: Record<string, string> = {
  ß: "ss",
  æ: "ae",
  Æ: "AE",
  œ: "oe",
  Œ: "OE",
  ø: "o",
  Ø: "O",
  ł: "l",
  Ł: "L",
  đ: "d",
  Đ: "D",
  þ: "th",
  Þ: "TH",
  ı: "i",
  "&": "+",
  "’": "'",
  "‘": "'",
  "`": "'",
  "´": "'",
  "–": "-",
  "—": "-",
};

/** Zet tekst om naar de SEPA-tekenset, voegt witruimte samen en kort in tot `max` tekens. */
export function sepaTekst(invoer: string | null | undefined, max: number): string {
  const omgezet = [...(invoer ?? "")]
    .map((t) => VERVANG[t] ?? t)
    .join("")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^A-Za-z0-9/\-?:().,'+ ]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return omgezet.slice(0, max).trim();
}

/** Identificatie (MsgId, PmtInfId, EndToEndId): alleen A-Z a-z 0-9 en "-", max. 35 tekens. */
export function sepaId(invoer: string): string {
  const id = invoer
    .replace(/[^A-Za-z0-9-]/g, "")
    .replace(/-{2,}/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, SEPA_MAX_ID)
    .replace(/-+$/g, "");
  return id;
}

/** Centen → "1234.50". Gooit bij een ongeldig bedrag. */
export function centenNaarSepaBedrag(centen: number): string {
  if (!Number.isSafeInteger(centen) || centen < 0) throw new SepaFout(`Ongeldig bedrag in centen: ${centen}`);
  const euro = Math.floor(centen / 100);
  const rest = centen % 100;
  return `${euro}.${String(rest).padStart(2, "0")}`;
}

function xml(tekst: string): string {
  return tekst
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

/** "2026-10-23T14:05:09" in Nederlandse tijd (ISODateTime zonder zone). */
export function sepaTijdstip(d: Date): string {
  const delen = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Amsterdam",
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).formatToParts(d);
  const get = (t: string) => delen.find((p) => p.type === t)?.value ?? "00";
  return `${get("year")}-${get("month")}-${get("day")}T${get("hour")}:${get("minute")}:${get("second")}`;
}

function controleerRekening(r: SepaRekening, wie: string): { naam: string; iban: string; bic: string | null } {
  const iban = normaliseerIban(r.iban ?? "");
  if (!isGeldigIban(iban)) throw new SepaFout(`Ongeldig IBAN voor ${wie}`);
  const naam = sepaTekst(r.naam, SEPA_MAX_NAAM);
  if (!naam) throw new SepaFout(`Naam ontbreekt voor ${wie}`);
  const bic = r.bic ? r.bic.replace(/\s+/g, "").toUpperCase() : null;
  if (bic && !BIC.test(bic)) throw new SepaFout(`Ongeldige BIC voor ${wie}`);
  return { naam, iban, bic };
}

/** Totalen die in GrpHdr én PmtInf komen. */
export function sepaTotalen(betalingen: readonly Pick<SepaBetaling, "bedragCenten">[]): { aantal: number; totaalCenten: number } {
  let totaalCenten = 0;
  for (const b of betalingen) totaalCenten += b.bedragCenten;
  return { aantal: betalingen.length, totaalCenten };
}

/**
 * Bouwt het pain.001.001.03-bericht. Gooit een SepaFout bij ongeldige invoer (verkeerd IBAN,
 * bedrag ≤ 0, dubbele EndToEndId, lege lijst), zodat er nooit een half of fout bestand ontstaat.
 */
export function maakSepaXml(invoer: SepaInvoer): string {
  const berichtId = sepaId(invoer.berichtId);
  if (!berichtId) throw new SepaFout("Bericht-id ontbreekt");
  if (!isEchteDatum(invoer.uitvoerDatum)) throw new SepaFout("Uitvoerdatum moet een bestaande datum JJJJ-MM-DD zijn");
  if (invoer.betalingen.length === 0) throw new SepaFout("Geen betalingen in de ronde");

  const debiteur = controleerRekening(invoer.debiteur, "de TopTalent-rekening");

  const gezien = new Set<string>();
  const transacties = invoer.betalingen.map((b, i) => {
    const wie = `betaling ${i + 1}`;
    if (!Number.isSafeInteger(b.bedragCenten) || b.bedragCenten < 1 || b.bedragCenten > SEPA_MAX_CENTEN) {
      throw new SepaFout(`Ongeldig bedrag voor ${wie}`);
    }
    const endToEndId = sepaId(b.endToEndId);
    if (!endToEndId) throw new SepaFout(`EndToEndId ontbreekt voor ${wie}`);
    if (gezien.has(endToEndId)) throw new SepaFout(`Dubbele EndToEndId ${endToEndId}`);
    gezien.add(endToEndId);
    const omschrijving = sepaTekst(b.omschrijving, SEPA_MAX_OMSCHRIJVING);
    if (!omschrijving) throw new SepaFout(`Omschrijving ontbreekt voor ${wie}`);
    const crediteur = controleerRekening({ naam: b.naam, iban: b.iban }, wie);
    if (!isEerIban(crediteur.iban)) throw new SepaFout(`IBAN van ${wie} is van buiten de EER (dan is een BIC nodig)`);
    return { endToEndId, omschrijving, bedrag: centenNaarSepaBedrag(b.bedragCenten), ...crediteur };
  });

  const { aantal, totaalCenten } = sepaTotalen(invoer.betalingen);
  const ctrlSum = centenNaarSepaBedrag(totaalCenten);
  const pmtInfId = sepaId(`${berichtId.slice(0, SEPA_MAX_ID - 2)}-1`);
  const debiteurAgent = debiteur.bic
    ? `<FinInstnId><BIC>${xml(debiteur.bic)}</BIC></FinInstnId>`
    : `<FinInstnId><Othr><Id>NOTPROVIDED</Id></Othr></FinInstnId>`;

  const regels: string[] = [
    `<?xml version="1.0" encoding="UTF-8"?>`,
    `<Document xmlns="${SEPA_NAMESPACE}" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">`,
    `  <CstmrCdtTrfInitn>`,
    `    <GrpHdr>`,
    `      <MsgId>${xml(berichtId)}</MsgId>`,
    `      <CreDtTm>${sepaTijdstip(invoer.aangemaaktOp)}</CreDtTm>`,
    `      <NbOfTxs>${aantal}</NbOfTxs>`,
    `      <CtrlSum>${ctrlSum}</CtrlSum>`,
    `      <InitgPty>`,
    `        <Nm>${xml(debiteur.naam)}</Nm>`,
    `      </InitgPty>`,
    `    </GrpHdr>`,
    `    <PmtInf>`,
    `      <PmtInfId>${xml(pmtInfId)}</PmtInfId>`,
    `      <PmtMtd>TRF</PmtMtd>`,
    `      <NbOfTxs>${aantal}</NbOfTxs>`,
    `      <CtrlSum>${ctrlSum}</CtrlSum>`,
    `      <PmtTpInf>`,
    `        <SvcLvl>`,
    `          <Cd>SEPA</Cd>`,
    `        </SvcLvl>`,
    `      </PmtTpInf>`,
    `      <ReqdExctnDt>${invoer.uitvoerDatum}</ReqdExctnDt>`,
    `      <Dbtr>`,
    `        <Nm>${xml(debiteur.naam)}</Nm>`,
    `      </Dbtr>`,
    `      <DbtrAcct>`,
    `        <Id>`,
    `          <IBAN>${xml(debiteur.iban)}</IBAN>`,
    `        </Id>`,
    `        <Ccy>EUR</Ccy>`,
    `      </DbtrAcct>`,
    `      <DbtrAgt>`,
    `        ${debiteurAgent}`,
    `      </DbtrAgt>`,
    `      <ChrgBr>SLEV</ChrgBr>`,
  ];

  for (const t of transacties) {
    regels.push(
      `      <CdtTrfTxInf>`,
      `        <PmtId>`,
      `          <EndToEndId>${xml(t.endToEndId)}</EndToEndId>`,
      `        </PmtId>`,
      `        <Amt>`,
      `          <InstdAmt Ccy="EUR">${t.bedrag}</InstdAmt>`,
      `        </Amt>`,
      `        <Cdtr>`,
      `          <Nm>${xml(t.naam)}</Nm>`,
      `        </Cdtr>`,
      `        <CdtrAcct>`,
      `          <Id>`,
      `            <IBAN>${xml(t.iban)}</IBAN>`,
      `          </Id>`,
      `        </CdtrAcct>`,
      `        <RmtInf>`,
      `          <Ustrd>${xml(t.omschrijving)}</Ustrd>`,
      `        </RmtInf>`,
      `      </CdtTrfTxInf>`,
    );
  }

  regels.push(`    </PmtInf>`, `  </CstmrCdtTrfInitn>`, `</Document>`, ``);
  return regels.join("\n");
}
