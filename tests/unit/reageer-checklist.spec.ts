import { test, expect } from "@playwright/test";
import {
  checklistMelding,
  ontbrekendVoorReageren,
  reageerChecklist,
  type ChecklistDocument,
  type ChecklistMedewerker,
} from "../../src/lib/medewerker/reageer-checklist";
import {
  OVEREENKOMST_SECTIES,
  OVEREENKOMST_VERSIE,
  overeenkomstVoorMedewerker,
  vulOvereenkomstIn,
} from "../../src/content/overeenkomst-van-opdracht";

const vandaag = "2026-10-23";
const compleet: ChecklistMedewerker = {
  kvk_nummer: "12345678",
  btw_nummer: "NL123456789B01",
  iban: "NL91ABNA0417164300",
  overeenkomst_akkoord_op: "2026-10-01T10:00:00Z",
  overeenkomst_akkoord_versie: OVEREENKOMST_VERSIE,
};
const geldigId: ChecklistDocument = { document_type: "id_bewijs", expiry_date: "2030-01-01", review_status: "goedgekeurd" };

test.describe("checklist vóór reageren (B1)", () => {
  test("alles in orde: niets ontbreekt", () => {
    expect(ontbrekendVoorReageren(compleet, [geldigId], vandaag)).toEqual([]);
    expect(reageerChecklist(compleet, [geldigId], vandaag).map((p) => p.code)).toEqual([
      "id_bewijs",
      "kvk_nummer",
      "btw_nummer",
      "iban",
      "overeenkomst",
    ]);
  });

  test("leeg account: alles ontbreekt, met een actie per punt", () => {
    const open = ontbrekendVoorReageren({}, [], vandaag);
    expect(open.map((p) => p.code)).toEqual(["id_bewijs", "kvk_nummer", "btw_nummer", "iban", "overeenkomst"]);
    expect(open.find((p) => p.code === "id_bewijs")?.actie.scherm).toBe("documenten");
    expect(open.find((p) => p.code === "iban")?.actie.web_pad).toBe("/medewerker/profiel");
    expect(open.find((p) => p.code === "overeenkomst")?.actie.scherm).toBe("overeenkomst");
  });

  test("ID: alleen goedgekeurd én niet verlopen telt", () => {
    const code = (docs: ChecklistDocument[]) => ontbrekendVoorReageren(compleet, docs, vandaag).map((p) => p.code);
    expect(code([{ ...geldigId, review_status: "pending" }])).toEqual(["id_bewijs"]);
    expect(code([{ ...geldigId, review_status: "afgekeurd" }])).toEqual(["id_bewijs"]);
    expect(code([{ ...geldigId, expiry_date: "2026-10-22" }])).toEqual(["id_bewijs"]);
    expect(code([{ ...geldigId, expiry_date: vandaag }])).toEqual([]);
    expect(code([{ ...geldigId, expiry_date: null }])).toEqual([]);
    // Een ander document (bv. VOG) is geen ID.
    expect(code([{ ...geldigId, document_type: "vog" }])).toEqual(["id_bewijs"]);
    const uitleg = (docs: ChecklistDocument[]) => ontbrekendVoorReageren(compleet, docs, vandaag)[0]?.uitleg;
    expect(uitleg([{ ...geldigId, review_status: "pending" }])).toContain("gecontroleerd");
    expect(uitleg([{ ...geldigId, expiry_date: "2020-01-01" }])).toContain("verlopen");
  });

  test("KvK 8 cijfers, btw NL-formaat (ook met KOR), IBAN geldig", () => {
    const codes = (m: Partial<ChecklistMedewerker>) => ontbrekendVoorReageren({ ...compleet, ...m }, [geldigId], vandaag).map((p) => p.code);
    expect(codes({ kvk_nummer: "1234567" })).toEqual(["kvk_nummer"]);
    expect(codes({ btw_nummer: "123456789" })).toEqual(["btw_nummer"]);
    expect(codes({ btw_nummer: null })).toEqual(["btw_nummer"]);
    expect(codes({ iban: "NL91ABNA0417164301" })).toEqual(["iban"]);
  });

  test("akkoord op een oude versie telt niet", () => {
    const open = ontbrekendVoorReageren({ ...compleet, overeenkomst_akkoord_versie: "oud" }, [geldigId], vandaag);
    expect(open.map((p) => p.code)).toEqual(["overeenkomst"]);
    expect(open[0].uitleg).toContain("gewijzigd");
  });

  test("melding noemt wat er ontbreekt", () => {
    const melding = checklistMelding(ontbrekendVoorReageren({ ...compleet, iban: null, kvk_nummer: null }, [geldigId], vandaag));
    expect(melding).toContain("KvK-nummer en IBAN");
    expect(checklistMelding([])).toBe("");
  });
});

test.describe("overeenkomst van opdracht", () => {
  test("bestaande tekst uit de repo, met versie", () => {
    expect(OVEREENKOMST_SECTIES.length).toBe(10);
    expect(OVEREENKOMST_SECTIES[0].titel).toBe("Partijen");
    expect(OVEREENKOMST_VERSIE).toMatch(/^ovo-zzp-/);
  });

  test("placeholders: eigen gegevens ingevuld, opdrachtgegevens '[per opdracht]'", () => {
    expect(vulOvereenkomstIn("{{opdrachtnemer_naam}} / {{kvk_nummer}} / {{klant_naam}} / {{uurtarief}}", {
      opdrachtnemer_naam: "Sanne de Vries",
      kvk_nummer: "12345678",
    })).toBe("Sanne de Vries / 12345678 / [per opdracht] / [per opdracht]");
    expect(vulOvereenkomstIn("{{btw_nummer}}", {})).toBe("[nog niet ingevuld]");
    const tekst = overeenkomstVoorMedewerker({ opdrachtnemer_naam: "Sanne" }).secties.map((s) => s.tekst).join("\n");
    expect(tekst).not.toMatch(/\{\{\w+\}\}/);
  });
});
