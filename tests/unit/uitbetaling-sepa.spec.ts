import { test, expect } from "@playwright/test";
import {
  centenNaarSepaBedrag,
  maakSepaXml,
  SEPA_MAX_NAAM,
  SEPA_MAX_OMSCHRIJVING,
  SEPA_NAMESPACE,
  sepaId,
  sepaTekst,
  sepaTijdstip,
  type SepaInvoer,
} from "../../src/lib/uitbetaling/sepa";

/** Stap 6 "Geld": SEPA Credit Transfer-bestand (pain.001.001.03) voor een uitbetaalronde. */

const debiteur = { naam: "TopTalent Jobs", iban: "NL91 ABNA 0417 1643 00", bic: null };

function invoer(overrides: Partial<SepaInvoer> = {}): SepaInvoer {
  return {
    berichtId: "TT-UR-20261023140509-ABCDEF12",
    aangemaaktOp: new Date("2026-10-23T12:05:09Z"),
    uitvoerDatum: "2026-10-26",
    debiteur,
    betalingen: [
      { endToEndId: "ZF-1A2B3C4D-0001", naam: "Jan Jansen", iban: "NL02ABNA0123456789", bedragCenten: 12345, omschrijving: "ZF-1A2B3C4D-0001" },
      { endToEndId: "ZF-9F8E7D6C-0007", naam: "Zoë Müller-Lüdenscheidt", iban: "DE89370400440532013000", bedragCenten: 5, omschrijving: "ZF-9F8E7D6C-0007" },
      { endToEndId: "ZF-0A0B0C0D-0012", naam: "Liam O'Brien & Zn.", iban: "BE68539007547034", bedragCenten: 100000, omschrijving: "ZF-0A0B0C0D-0012" },
    ],
    ...overrides,
  };
}

/** Minimale XML-parser voor de test: controleert dat elke tag netjes sluit en geeft de boom terug. */
type Knoop = { naam: string; attributen: Record<string, string>; kinderen: Knoop[]; tekst: string };
function parseXml(xml: string): Knoop {
  const zonderKop = xml.replace(/^<\?xml[^?]*\?>\s*/, "");
  const wortel: Knoop = { naam: "#document", attributen: {}, kinderen: [], tekst: "" };
  const stapel: Knoop[] = [wortel];
  const re = /<(\/?)([A-Za-z][\w:.-]*)((?:\s+[\w:.-]+="[^"]*")*)\s*(\/?)>|([^<]+)/g;
  let m: RegExpExecArray | null;
  let positie = 0;
  while ((m = re.exec(zonderKop))) {
    if (m.index !== positie) throw new Error(`Onverwachte tekens op ${positie}`);
    positie = re.lastIndex;
    if (m[5] !== undefined) {
      stapel[stapel.length - 1].tekst += m[5];
      continue;
    }
    const [, sluit, naam, attrs, leeg] = m;
    if (sluit) {
      const open = stapel.pop();
      if (!open || open.naam !== naam) throw new Error(`Tag ${naam} sluit niet goed (open: ${open?.naam})`);
      continue;
    }
    const attributen: Record<string, string> = {};
    for (const a of attrs.matchAll(/([\w:.-]+)="([^"]*)"/g)) attributen[a[1]] = a[2];
    const knoop: Knoop = { naam, attributen, kinderen: [], tekst: "" };
    stapel[stapel.length - 1].kinderen.push(knoop);
    if (!leeg) stapel.push(knoop);
  }
  if (positie !== zonderKop.length) throw new Error("Rest na de laatste tag");
  if (stapel.length !== 1) throw new Error(`Niet gesloten: ${stapel.map((k) => k.naam).join(" > ")}`);
  if (wortel.kinderen.length !== 1) throw new Error("Precies één root-element verwacht");
  return wortel.kinderen[0];
}
const kind = (k: Knoop, naam: string) => {
  const gevonden = k.kinderen.find((c) => c.naam === naam);
  if (!gevonden) throw new Error(`${naam} ontbreekt in ${k.naam}`);
  return gevonden;
};
const pad = (k: Knoop, ...namen: string[]) => namen.reduce(kind, k);
const tekst = (k: Knoop) => k.tekst.trim();
const ontsnap = (t: string) => t.replace(/&apos;/g, "'").replace(/&quot;/g, '"').replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&amp;/g, "&");
function alleTeksten(k: Knoop): string[] {
  return [...(tekst(k) ? [ontsnap(tekst(k))] : []), ...k.kinderen.flatMap(alleTeksten)];
}

test.describe("SEPA pain.001.001.03", () => {
  test("geldige structuur: namespace, volgorde en verplichte elementen", () => {
    const xml = maakSepaXml(invoer());
    expect(xml.startsWith('<?xml version="1.0" encoding="UTF-8"?>')).toBe(true);
    const doc = parseXml(xml);
    expect(doc.naam).toBe("Document");
    expect(doc.attributen.xmlns).toBe(SEPA_NAMESPACE);

    const init = kind(doc, "CstmrCdtTrfInitn");
    expect(init.kinderen.map((c) => c.naam)).toEqual(["GrpHdr", "PmtInf"]);
    expect(kind(init, "GrpHdr").kinderen.map((c) => c.naam)).toEqual(["MsgId", "CreDtTm", "NbOfTxs", "CtrlSum", "InitgPty"]);

    const pmt = kind(init, "PmtInf");
    expect(pmt.kinderen.map((c) => c.naam)).toEqual([
      "PmtInfId",
      "PmtMtd",
      "NbOfTxs",
      "CtrlSum",
      "PmtTpInf",
      "ReqdExctnDt",
      "Dbtr",
      "DbtrAcct",
      "DbtrAgt",
      "ChrgBr",
      "CdtTrfTxInf",
      "CdtTrfTxInf",
      "CdtTrfTxInf",
    ]);
    expect(tekst(kind(pmt, "PmtMtd"))).toBe("TRF");
    expect(tekst(pad(pmt, "PmtTpInf", "SvcLvl", "Cd"))).toBe("SEPA");
    expect(tekst(kind(pmt, "ChrgBr"))).toBe("SLEV");
    expect(tekst(kind(pmt, "ReqdExctnDt"))).toBe("2026-10-26");
    expect(tekst(pad(pmt, "DbtrAcct", "Id", "IBAN"))).toBe("NL91ABNA0417164300");
    expect(tekst(pad(pmt, "DbtrAcct", "Ccy"))).toBe("EUR");
    expect(tekst(pad(pmt, "DbtrAgt", "FinInstnId", "Othr", "Id"))).toBe("NOTPROVIDED");

    const tx = pmt.kinderen.filter((c) => c.naam === "CdtTrfTxInf")[0];
    expect(tx.kinderen.map((c) => c.naam)).toEqual(["PmtId", "Amt", "Cdtr", "CdtrAcct", "RmtInf"]);
    expect(pad(tx, "Amt", "InstdAmt").attributen.Ccy).toBe("EUR");
    expect(tekst(pad(tx, "CdtrAcct", "Id", "IBAN"))).toBe("NL02ABNA0123456789");
  });

  test("CreDtTm in Nederlandse tijd zonder milliseconden", () => {
    expect(sepaTijdstip(new Date("2026-10-23T12:05:09.123Z"))).toBe("2026-10-23T14:05:09");
    expect(sepaTijdstip(new Date("2026-12-31T23:30:00Z"))).toBe("2027-01-01T00:30:00");
    const doc = parseXml(maakSepaXml(invoer()));
    expect(tekst(pad(doc, "CstmrCdtTrfInitn", "GrpHdr", "CreDtTm"))).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}$/);
  });

  test("bedragen altijd met precies 2 decimalen (in centen gerekend)", () => {
    expect(centenNaarSepaBedrag(12345)).toBe("123.45");
    expect(centenNaarSepaBedrag(5)).toBe("0.05");
    expect(centenNaarSepaBedrag(100)).toBe("1.00");
    expect(centenNaarSepaBedrag(1230)).toBe("12.30");
    expect(centenNaarSepaBedrag(99_999_999_999)).toBe("999999999.99");
    expect(() => centenNaarSepaBedrag(12.5)).toThrow();
    expect(() => centenNaarSepaBedrag(-1)).toThrow();

    const doc = parseXml(maakSepaXml(invoer()));
    const bedragen = kind(doc, "CstmrCdtTrfInitn")
      .kinderen[1].kinderen.filter((c) => c.naam === "CdtTrfTxInf")
      .map((t) => tekst(pad(t, "Amt", "InstdAmt")));
    expect(bedragen).toEqual(["123.45", "0.05", "1000.00"]);
    for (const b of bedragen) expect(b).toMatch(/^\d+\.\d{2}$/);
  });

  test("NbOfTxs en CtrlSum kloppen, in GrpHdr én PmtInf", () => {
    const doc = parseXml(maakSepaXml(invoer()));
    const init = kind(doc, "CstmrCdtTrfInitn");
    for (const blok of [kind(init, "GrpHdr"), kind(init, "PmtInf")]) {
      expect(tekst(kind(blok, "NbOfTxs"))).toBe("3");
      expect(tekst(kind(blok, "CtrlSum"))).toBe("1123.50"); // 123.45 + 0.05 + 1000.00
    }
    // Som zonder float-fouten: 0.10 + 0.20 = 0.30, niet 0.30000000000000004.
    const klein = parseXml(
      maakSepaXml(
        invoer({
          betalingen: [
            { endToEndId: "A-1", naam: "A", iban: "NL02ABNA0123456789", bedragCenten: 10, omschrijving: "A-1" },
            { endToEndId: "A-2", naam: "B", iban: "NL02ABNA0123456789", bedragCenten: 20, omschrijving: "A-2" },
          ],
        }),
      ),
    );
    expect(tekst(pad(klein, "CstmrCdtTrfInitn", "GrpHdr", "CtrlSum"))).toBe("0.30");
  });

  test("tekenbeperking SEPA: accenten omgezet, verboden tekens weg, lengtes begrensd", () => {
    expect(sepaTekst("Zoë Müller-Lüdenscheidt", 70)).toBe("Zoe Muller-Ludenscheidt");
    expect(sepaTekst("Jürgen Straße & Søn", 70)).toBe("Jurgen Strasse + Son");
    expect(sepaTekst("Café “De Kroon” @ Utrecht #1 €", 70)).toBe("Cafe De Kroon Utrecht 1");
    expect(sepaTekst("  veel    spaties\n en\tenter ", 70)).toBe("veel spaties en enter");
    expect(sepaTekst("x".repeat(200), SEPA_MAX_NAAM)).toHaveLength(SEPA_MAX_NAAM);
    expect(sepaId("ZF-ABCD/1234//x")).toBe("ZF-ABCD1234x");
    expect(sepaId("-" + "A".repeat(40))).toHaveLength(35);

    const lang = "Ö".repeat(100);
    const xml = maakSepaXml(
      invoer({
        betalingen: [{ endToEndId: "ZF-1A2B3C4D-0001", naam: lang, iban: "NL02ABNA0123456789", bedragCenten: 100, omschrijving: "Y".repeat(300) }],
      }),
    );
    const doc = parseXml(xml);
    const teksten = alleTeksten(doc);
    for (const t of teksten) expect(t).toMatch(/^[A-Za-z0-9/\-?:().,'+ ]*$/);
    const tx = pad(doc, "CstmrCdtTrfInitn", "PmtInf", "CdtTrfTxInf");
    expect(tekst(pad(tx, "Cdtr", "Nm"))).toHaveLength(SEPA_MAX_NAAM);
    expect(tekst(pad(tx, "RmtInf", "Ustrd")).length).toBeLessThanOrEqual(SEPA_MAX_OMSCHRIJVING);
    for (const id of [pad(doc, "CstmrCdtTrfInitn", "GrpHdr", "MsgId"), pad(tx, "PmtId", "EndToEndId")]) {
      expect(tekst(id).length).toBeLessThanOrEqual(35);
      expect(tekst(id)).toMatch(/^[A-Za-z0-9-]+$/);
    }
  });

  test("apostrof is toegestaan en wordt correct ge-escaped", () => {
    const xml = maakSepaXml(invoer());
    expect(xml).toContain("<Nm>Liam O&apos;Brien + Zn.</Nm>");
    expect(xml).not.toMatch(/&(?!amp;|lt;|gt;|quot;|apos;)/);
  });

  test("omschrijving (Ustrd) = factuurnummer = EndToEndId", () => {
    const doc = parseXml(maakSepaXml(invoer()));
    const txs = pad(doc, "CstmrCdtTrfInitn", "PmtInf").kinderen.filter((c) => c.naam === "CdtTrfTxInf");
    expect(txs.map((t) => tekst(pad(t, "RmtInf", "Ustrd")))).toEqual(["ZF-1A2B3C4D-0001", "ZF-9F8E7D6C-0007", "ZF-0A0B0C0D-0012"]);
    for (const t of txs) expect(tekst(pad(t, "PmtId", "EndToEndId"))).toBe(tekst(pad(t, "RmtInf", "Ustrd")));
  });

  test("BIC van TopTalent wordt gebruikt als die is ingesteld", () => {
    const doc = parseXml(maakSepaXml(invoer({ debiteur: { ...debiteur, bic: "abnanl2a" } })));
    expect(tekst(pad(doc, "CstmrCdtTrfInitn", "PmtInf", "DbtrAgt", "FinInstnId", "BIC"))).toBe("ABNANL2A");
  });

  test("weigert ongeldige invoer in plaats van een fout bestand te maken", () => {
    const b = invoer().betalingen[0];
    expect(() => maakSepaXml(invoer({ betalingen: [] }))).toThrow(/Geen betalingen/);
    expect(() => maakSepaXml(invoer({ betalingen: [{ ...b, iban: "NL00ABNA0123456789" }] }))).toThrow(/IBAN/);
    expect(() => maakSepaXml(invoer({ betalingen: [{ ...b, iban: "enc:v1:abc" }] }))).toThrow(/IBAN/);
    expect(() => maakSepaXml(invoer({ betalingen: [{ ...b, bedragCenten: 0 }] }))).toThrow(/bedrag/);
    expect(() => maakSepaXml(invoer({ betalingen: [{ ...b, bedragCenten: 10.5 }] }))).toThrow(/bedrag/);
    expect(() => maakSepaXml(invoer({ betalingen: [b, { ...b }] }))).toThrow(/Dubbele/);
    expect(() => maakSepaXml(invoer({ betalingen: [{ ...b, naam: "€€€" }] }))).toThrow(/Naam/);
    expect(() => maakSepaXml(invoer({ uitvoerDatum: "26-10-2026" }))).toThrow(/Uitvoerdatum/);
    expect(() => maakSepaXml(invoer({ debiteur: { ...debiteur, iban: "NL91ABNA0417164301" } }))).toThrow(/TopTalent/);
    expect(() => maakSepaXml(invoer({ debiteur: { ...debiteur, bic: "XYZ" } }))).toThrow(/BIC/);
  });
});
