import { test, expect } from "@playwright/test";
import { berekenBewaarTot, berekenWavBewaarTot } from "../../src/lib/compliance/arbeidstijden";
import {
  beslisOpschoning,
  controleerOpschoonInvoer,
  controleerVideocallInvoer,
  controlerecordVelden,
  idBewaarTot,
  isVolledigRecord,
  kopieNodig,
  laatsteDienstPerMedewerker,
  opschoonRecordNodig,
  opschoonRecordRij,
  type OpschoonWaarden,
} from "../../src/lib/id-check/controlerecord";
import { isBsn, veiligDocumentnummer } from "../../src/lib/id-check/regels";
import { faceRetentionUitAntwoord, templateBewaard } from "../../src/lib/id-check/didit-api";
import { reageerChecklist, type ChecklistMedewerker } from "../../src/lib/medewerker/reageer-checklist";
import { nlDatum } from "../../src/lib/nl-tijd";
import { OVEREENKOMST_VERSIE } from "../../src/content/overeenkomst-van-opdracht";

// Juridisch advies ID-controle zzp'ers (24-10-2026): controlerecord, videocall, Wav-bewaartermijn en
// het opschonen van oude kopieën. Pure regels uit lib/id-check/controlerecord.

const vandaag = "2026-10-24";
const BSN = "123456782"; // voldoet aan de 11-proef

test.describe("bewaartermijn: 31-12 van (jaar laatste dienst + 5)", () => {
  test("met een laatste dienst telt het jaar van die dienst", () => {
    expect(berekenWavBewaarTot("2026-03-15")).toBe("2031-12-31");
    expect(idBewaarTot({ laatsteDienst: "2027-06-01", beslisdatum: "2026-10-24" })).toBe("2032-12-31");
    // De beslissing kwam later dan de laatste dienst: de dienst bepaalt (einde van het werk).
    expect(idBewaarTot({ laatsteDienst: "2025-11-30", beslisdatum: "2026-10-24" })).toBe("2030-12-31");
  });

  test("zonder diensten vanaf het jaar van de beslissing", () => {
    expect(idBewaarTot({ laatsteDienst: null, beslisdatum: "2026-10-24" })).toBe("2031-12-31");
    expect(idBewaarTot({ laatsteDienst: undefined, beslisdatum: "2029-01-01" })).toBe("2034-12-31");
  });

  test("jaarwisseling: 31 december en 1 januari schelen een heel jaar, in Nederlandse tijd", () => {
    expect(idBewaarTot({ laatsteDienst: "2026-12-31", beslisdatum: "2026-01-01" })).toBe("2031-12-31");
    expect(idBewaarTot({ laatsteDienst: "2027-01-01", beslisdatum: "2026-01-01" })).toBe("2032-12-31");
    // 31-12 23:30 UTC is in Nederland al 1 januari: het jaar komt uit de NL-datum.
    const nl = nlDatum(new Date("2026-12-31T23:30:00Z"));
    expect(nl).toBe("2027-01-01");
    expect(idBewaarTot({ laatsteDienst: null, beslisdatum: nl })).toBe("2032-12-31");
  });

  test("de oude termijn (5 jaar na uitdienst) blijft voor overige documenten", () => {
    expect(berekenBewaarTot("2020-01-01")).toBe("2025-01-01");
    expect(() => berekenWavBewaarTot("onzin")).toThrow();
  });

  test("laatste dienst per medewerker uit dienst_aanmeldingen + diensten", () => {
    const laatste = laatsteDienstPerMedewerker([
      { medewerker_id: "a", diensten: { datum: "2026-03-01" } },
      { medewerker_id: "a", diensten: [{ datum: "2026-09-30" }] },
      { medewerker_id: "a", diensten: { datum: "2025-12-31" } },
      { medewerker_id: "b", diensten: null },
      { medewerker_id: null, diensten: { datum: "2030-01-01" } },
      { medewerker_id: "c", diensten: { datum: "geen-datum" } },
    ]);
    expect(laatste.get("a")).toBe("2026-09-30");
    expect(laatste.has("b")).toBe(false);
    expect(laatste.has("c")).toBe(false);
  });
});

function videocall(extra: Record<string, unknown> = {}) {
  return {
    uitslag: "goedgekeurd",
    naam: "Jan van der Berg",
    geboortedatum: "1990-05-12",
    nationaliteit: "NLD",
    documentsoort: "Passport",
    documentnummer: "SPECI2014",
    vervaldatum: "2031-05-11",
    ...extra,
  };
}

test.describe("videocall: controlerecord volgens advies punt 2", () => {
  test("EER + alle velden → goedgekeurd, met record", () => {
    const c = controleerVideocallInvoer(videocall(), vandaag);
    expect(c).toEqual({
      ok: true,
      waarden: {
        uitslag: "goedgekeurd",
        naam: "Jan van der Berg",
        geboortedatum: "1990-05-12",
        nationaliteit: "NLD",
        eer: true,
        documentsoort: "Passport",
        documentnummer: "SPECI2014",
        vervaldatum: "2031-05-11",
        reden: null,
      },
    });
    // Zwitserland telt als EER; alpha-2 wordt alpha-3.
    expect(controleerVideocallInvoer(videocall({ nationaliteit: "CHE", documentnummer: "X1234567" }), vandaag).ok).toBe(true);
    expect(controleerVideocallInvoer(videocall({ nationaliteit: "de" }), vandaag)).toMatchObject({ ok: true, waarden: { nationaliteit: "DEU" } });
  });

  test("niet-EER kan NIET via een videocall worden goedgekeurd: kopie nodig (Wav art. 15)", () => {
    for (const land of ["TUR", "GBR", "USA", "MAR", "UKR"]) {
      const c = controleerVideocallInvoer(videocall({ nationaliteit: land, documentnummer: "U12345678" }), vandaag);
      expect(c).toMatchObject({ ok: false, code: "kopie_nodig" });
      expect(c.ok ? "" : c.fout).toMatch(/kopie/);
    }
    // Wel vastleggen dat er een kopie nodig is.
    expect(controleerVideocallInvoer(videocall({ uitslag: "kopie_nodig", nationaliteit: "TUR", documentnummer: "" }), vandaag)).toMatchObject({
      ok: true,
      waarden: { uitslag: "kopie_nodig", eer: false, documentnummer: null },
    });
    // Bij EER is "kopie nodig" geen geldige uitslag.
    expect(controleerVideocallInvoer(videocall({ uitslag: "kopie_nodig" }), vandaag).ok).toBe(false);
  });

  test("verplichte velden: uitslag, naam, geboortedatum, nationaliteit, documentsoort, vervaldatum, documentnummer bij goedkeuren", () => {
    const fouten: [Record<string, unknown>, RegExp][] = [
      [{ uitslag: undefined }, /uitslag/],
      [{ uitslag: "misschien" }, /uitslag/],
      [{ naam: " " }, /naam/],
      [{ geboortedatum: "" }, /geboortedatum/],
      [{ geboortedatum: "2030-01-01" }, /verleden/],
      [{ nationaliteit: "" }, /nationaliteit/],
      [{ nationaliteit: "Nederlands" }, /nationaliteit/],
      [{ documentsoort: "" }, /documentsoort/],
      [{ documentsoort: "Driver's License" }, /documentsoort/],
      [{ vervaldatum: "" }, /vervaldatum/],
      [{ vervaldatum: "2031-02-30" }, /vervaldatum/],
      [{ vervaldatum: "2026-10-23" }, /verlopen/],
      [{ documentnummer: "" }, /documentnummer/],
      [{ documentnummer: BSN }, /BSN/],
    ];
    for (const [extra, melding] of fouten) {
      const c = controleerVideocallInvoer(videocall(extra), vandaag);
      expect(c.ok, JSON.stringify(extra)).toBe(false);
      expect(c.ok ? "" : c.fout, JSON.stringify(extra)).toMatch(melding);
    }
  });

  test("afwijzen: alleen met reden; een verlopen document mag dan wel, documentnummer is optioneel", () => {
    expect(controleerVideocallInvoer(videocall({ uitslag: "afgewezen" }), vandaag)).toMatchObject({ ok: false, fout: expect.stringMatching(/reden/) });
    const c = controleerVideocallInvoer(
      videocall({ uitslag: "afgewezen", reden: "Foto lijkt niet op de persoon", vervaldatum: "2020-01-01", documentnummer: "" }),
      vandaag,
    );
    expect(c).toMatchObject({ ok: true, waarden: { uitslag: "afgewezen", vervaldatum: "2020-01-01", documentnummer: null } });
    // Niet-EER mag wel worden afgewezen.
    expect(controleerVideocallInvoer(videocall({ uitslag: "afgewezen", reden: "Geen geldig document", nationaliteit: "TUR" }), vandaag).ok).toBe(
      true,
    );
  });

  test("kopie nodig: nieuwste controle buiten de EER (Didit of videocall), niet afgewezen of verlopen", () => {
    expect(kopieNodig({ eer: false, status: "handmatig" })).toBe(true);
    expect(kopieNodig({ eer: false, status: "goedgekeurd" })).toBe(true);
    expect(kopieNodig({ eer: false, status: "afgewezen" })).toBe(false);
    expect(kopieNodig({ eer: false, status: "verlopen" })).toBe(false);
    expect(kopieNodig({ eer: true, status: "handmatig" })).toBe(false);
    expect(kopieNodig({ eer: null, status: "handmatig" })).toBe(false);
    expect(kopieNodig(null)).toBe(false);
  });

  test("checklist vraagt bij 'kopie nodig' om een kopie in plaats van 'we controleren je ID'", () => {
    const compleet: ChecklistMedewerker = {
      kvk_nummer: "12345678",
      btw_nummer: "NL123456789B01",
      iban: "NL91ABNA0417164300",
      overeenkomst_akkoord_op: "2026-10-01T10:00:00Z",
      overeenkomst_akkoord_versie: OVEREENKOMST_VERSIE,
    };
    const opties = { idCheck: { status: "handmatig", kopieNodig: true } };
    expect(reageerChecklist(compleet, [], vandaag, opties)[0].uitleg).toMatch(/Upload daarom een kopie/);
    const ingestuurd = { document_type: "id_bewijs", expiry_date: "2031-01-01", review_status: null, uploaded_at: "2026-10-24T10:00:00Z" };
    expect(reageerChecklist(compleet, [ingestuurd], vandaag, opties)[0].uitleg).toMatch(/nog gecontroleerd/);
    const goed = { ...ingestuurd, review_status: "goedgekeurd" };
    expect(reageerChecklist(compleet, [goed], vandaag, opties)[0].ok).toBe(true);
    // Zonder kopie nodig: de bestaande tekst.
    expect(reageerChecklist(compleet, [], vandaag, { idCheck: { status: "handmatig" } })[0].uitleg).toMatch(/We controleren je ID/);
  });
});

test.describe("oude kopieën opschonen: EER vs niet-EER vs kandidaat (advies punten 3 en 4)", () => {
  const werknemer = { bron: "medewerker" as const, werknemer: true, goedgekeurd: true, heeftVolledigRecord: false };

  test("werknemer EER/Zwitserland: kopie weg, regel blijft zonder bestand, record erbij", () => {
    expect(beslisOpschoning({ ...werknemer, eer: true })).toEqual({
      kopie: "verwijderen",
      rij: "houden",
      record: true,
      reden: "eer_geen_grondslag",
    });
    // Al een volledig record (bijv. via Didit): geen tweede.
    expect(beslisOpschoning({ ...werknemer, eer: true, heeftVolledigRecord: true }).record).toBe(false);
    // Niet goedgekeurde kopie: kopie én regel weg, geen record.
    expect(beslisOpschoning({ ...werknemer, eer: true, goedgekeurd: false })).toEqual({
      kopie: "verwijderen",
      rij: "verwijderen",
      record: false,
      reden: "eer_niet_goedgekeurd",
    });
  });

  test("werknemer buiten de EER: kopie blijft (Wav), record als er nog geen is", () => {
    expect(beslisOpschoning({ ...werknemer, eer: false })).toEqual({ kopie: "bewaren", rij: "houden", record: true, reden: "wav_niet_eer" });
    expect(beslisOpschoning({ ...werknemer, eer: false, goedgekeurd: false }).kopie).toBe("bewaren");
  });

  test("kandidaat die nooit werknemer werd: kopie weg, geen record, ongeacht nationaliteit", () => {
    for (const eer of [true, false, null]) {
      expect(
        beslisOpschoning({ bron: "kandidaat", werknemer: false, eer, goedgekeurd: true, heeftVolledigRecord: false }),
      ).toEqual({ kopie: "verwijderen", rij: "verwijderen", record: false, reden: "kandidaat_nooit_werknemer" });
    }
  });

  test("kandidaat die werknemer werd: als werknemer, maar een dubbele niet-EER-kopie gaat weg", () => {
    const kandidaat = { bron: "kandidaat" as const, werknemer: true, goedgekeurd: true, heeftVolledigRecord: false };
    expect(beslisOpschoning({ ...kandidaat, eer: true })).toEqual({ kopie: "verwijderen", rij: "verwijderen", record: true, reden: "eer_geen_grondslag" });
    expect(beslisOpschoning({ ...kandidaat, eer: false, werknemerHeeftEigenKopie: false })).toMatchObject({ kopie: "bewaren", rij: "houden" });
    expect(beslisOpschoning({ ...kandidaat, eer: false, werknemerHeeftEigenKopie: true })).toMatchObject({
      kopie: "verwijderen",
      reden: "dubbel_in_werknemerdossier",
    });
  });

  test("werknemer zonder nationaliteit kan niet worden opgeschoond", () => {
    expect(() => beslisOpschoning({ ...werknemer, eer: null })).toThrow(/Nationaliteit/);
  });

  test("invoer: kandidaat nooit werknemer hoeft niets in te vullen; werknemer wel; record vraagt meer", () => {
    expect(controleerOpschoonInvoer({}, { werknemer: false, recordNodig: false }, vandaag)).toEqual({ ok: true, waarden: null });
    expect(controleerOpschoonInvoer({}, { werknemer: true, recordNodig: false }, vandaag)).toMatchObject({ ok: false, fout: expect.stringMatching(/documentsoort/) });

    const basis = { documentsoort: "Identity Card", nationaliteit: "NLD", vervaldatum: "2019-01-01" };
    // Een verlopen document mag: ook een oud document hoort in het record.
    expect(controleerOpschoonInvoer(basis, { werknemer: true, recordNodig: false }, vandaag)).toMatchObject({
      ok: true,
      waarden: { eer: true, vervaldatum: "2019-01-01", naam: null, documentnummer: null },
    });
    expect(controleerOpschoonInvoer(basis, { werknemer: true, recordNodig: true }, vandaag)).toMatchObject({ ok: false, fout: expect.stringMatching(/naam/) });
    expect(
      controleerOpschoonInvoer({ ...basis, naam: "Jan Berg", geboortedatum: "1990-05-12", documentnummer: BSN }, { werknemer: true, recordNodig: true }, vandaag),
    ).toMatchObject({ ok: false, fout: expect.stringMatching(/BSN/) });
    expect(
      controleerOpschoonInvoer(
        { ...basis, naam: "Jan Berg", geboortedatum: "1990-05-12", documentnummer: "ihb12k3l4" },
        { werknemer: true, recordNodig: true },
        vandaag,
      ),
    ).toMatchObject({ ok: true, waarden: { naam: "Jan Berg", documentnummer: "IHB12K3L4" } });
  });

  test("record nodig alleen bij een goedgekeurde kopie van een werknemer zonder volledig record", () => {
    expect(opschoonRecordNodig({ werknemer: true, goedgekeurd: true, heeftVolledigRecord: false })).toBe(true);
    expect(opschoonRecordNodig({ werknemer: true, goedgekeurd: true, heeftVolledigRecord: true })).toBe(false);
    expect(opschoonRecordNodig({ werknemer: true, goedgekeurd: false, heeftVolledigRecord: false })).toBe(false);
    expect(opschoonRecordNodig({ werknemer: false, goedgekeurd: true, heeftVolledigRecord: false })).toBe(false);
    expect(isVolledigRecord({ status: "goedgekeurd", naam: "A B", geboortedatum: "1990-01-01", nationaliteit: "NLD", documentsoort: "Passport", vervaldatum: "2030-01-01" })).toBe(true);
    // Records van vóór het advies (zonder naam) zijn niet volledig.
    expect(isVolledigRecord({ status: "goedgekeurd", naam: null, documentsoort: "Passport", vervaldatum: "2030-01-01" })).toBe(false);
  });
});

test.describe("opgeslagen records: documentnummer wel, persoonsnummer/BSN nooit", () => {
  const waarden: OpschoonWaarden = {
    documentsoort: "Identity Card",
    nationaliteit: "NLD",
    eer: true,
    vervaldatum: "2031-05-11",
    naam: "Jan Pieter van der Berg",
    geboortedatum: "1990-05-12",
    documentnummer: "IXK1234567",
  };

  test("opschoonrecord: alleen de velden uit het advies + documentnummer, wie en wanneer", () => {
    const rij = opschoonRecordRij({
      medewerkerId: "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee",
      medewerkerDocumentId: "11111111-2222-3333-4444-555555555555",
      waarden,
      door: "admin@toptalentjobs.nl",
      nu: "2026-10-24T10:00:00.000Z",
      bewaarTot: "2031-12-31",
      kopieGoedgekeurdOp: "2025-03-01T09:00:00Z",
    });
    expect(Object.keys(rij).sort()).toEqual(
      [
        "aangemaakt_op",
        "beslissing",
        "beslist_door",
        "beslist_op",
        "bewaar_tot",
        "bijgewerkt_op",
        "documentnummer",
        "documentsoort",
        "eer",
        "geboortedatum",
        "handmatig_redenen",
        "medewerker_document_id",
        "medewerker_id",
        "methode",
        "naam",
        "nationaliteit",
        "reden",
        "status",
        "vervaldatum",
      ].sort(),
    );
    expect(rij).toMatchObject({
      methode: "kopie",
      status: "goedgekeurd",
      documentnummer: "IXK1234567",
      naam: "Jan Pieter van der Berg",
      geboortedatum: "1990-05-12",
      nationaliteit: "NLD",
      eer: true,
      bewaar_tot: "2031-12-31",
      beslist_door: "admin@toptalentjobs.nl",
    });
    expect(String(rij.reden)).toContain("2025-03-01");
    expect(JSON.stringify(rij)).not.toContain(BSN);
  });

  test("controlerecordVelden is een witte lijst", () => {
    const velden = controlerecordVelden({ ...waarden, bewaarTot: "2031-12-31" });
    expect(Object.keys(velden).sort()).toEqual(
      ["bewaar_tot", "documentnummer", "documentsoort", "eer", "geboortedatum", "naam", "nationaliteit", "vervaldatum"].sort(),
    );
    expect(Object.keys(controlerecordVelden(waarden))).not.toContain("bewaar_tot");
  });

  test("BSN herkennen (11-proef) en nooit als documentnummer opslaan", () => {
    expect(isBsn(BSN)).toBe(true);
    expect(isBsn("12345678")).toBe(false);
    expect(isBsn("000000000")).toBe(false);
    expect(isBsn("IXK123456")).toBe(false);
    expect(veiligDocumentnummer({ documentnummer: BSN, landen: ["NLD"] })).toBeNull();
    expect(veiligDocumentnummer({ documentnummer: "AB1234567", persoonsnummer: "AB1234567", landen: ["BEL"] })).toBeNull();
    expect(veiligDocumentnummer({ documentnummer: "ab 12345 67", persoonsnummer: BSN, landen: ["NLD"] })).toBe("AB1234567");
  });
});

test.describe("Didit: sessie verwijderen", () => {
  test("alleen face_retention_outcome uit het antwoord, als enum-tekst", () => {
    expect(faceRetentionUitAntwoord({ session_id: "x", face_retention_outcome: "deleted", biometric_template_uuid: null })).toBe("deleted");
    expect(faceRetentionUitAntwoord({ face_retention_outcome: "retained_with_user" })).toBe("retained_with_user");
    expect(faceRetentionUitAntwoord({})).toBeNull();
    expect(faceRetentionUitAntwoord(null)).toBeNull();
    expect(faceRetentionUitAntwoord({ face_retention_outcome: "<script>Jan Berg 123456782</script>" })).toBeNull();
    expect(templateBewaard("retained_with_user")).toBe(true);
    expect(templateBewaard("deleted")).toBe(false);
    expect(templateBewaard("none")).toBe(false);
  });
});
