import { test, expect } from "@playwright/test";
import { medewerkerDocumentType, meeTeNemenDocumenten } from "../../src/lib/kandidaat-documenten";
import { isDocumentType } from "../../src/lib/medewerker/documenten";

test.describe("kandidaatdocumenten mee naar het medewerkeraccount", () => {
  test("alleen goedgekeurde documenten gaan mee", () => {
    const docs = [
      { id: "1", status: "goedgekeurd" },
      { id: "2", status: "ontvangen" },
      { id: "3", status: "afgekeurd" },
      { id: "4", status: null },
    ];
    expect(meeTeNemenDocumenten(docs).map((d) => d.id)).toEqual(["1"]);
  });

  test("type wordt een geldig medewerkertype; ID wordt id_bewijs (telt voor de checklist)", () => {
    expect(medewerkerDocumentType("id")).toBe("id_bewijs");
    expect(medewerkerDocumentType("kvk")).toBe("kvk");
    expect(medewerkerDocumentType("contract")).toBe("contract");
    for (const t of ["cv", "btw", "certificaat", "bankbewijs", "overig", "onbekend"]) {
      expect(medewerkerDocumentType(t)).toBe("overig");
    }
    for (const t of ["id", "cv", "kvk", "btw", "certificaat", "contract", "bankbewijs", "overig"]) {
      expect(isDocumentType(medewerkerDocumentType(t))).toBe(true);
    }
  });
});
