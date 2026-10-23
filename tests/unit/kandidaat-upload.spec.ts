import { test, expect } from "@playwright/test";
import {
  isKandidaatDocumentType,
  isKandidaatUploadType,
  kandidaatDocumentLabel,
  kandidaatUploadPlan,
  uploadFoutmelding,
} from "../../src/lib/kandidaat-documenten";

const MB = 1024 * 1024;

test.describe("kandidaat-upload (B6/B7)", () => {
  test("kandidaat kiest uit een vaste lijst; onbekende waarden worden geweigerd", () => {
    expect(isKandidaatUploadType("id")).toBe(true);
    expect(isKandidaatUploadType("loonheffingsverklaring")).toBe(false);
    expect(isKandidaatUploadType(null)).toBe(false);
    // De admin mag ook andere types zetten (correctie).
    expect(isKandidaatDocumentType("bankbewijs")).toBe(true);
    expect(isKandidaatDocumentType("../pad")).toBe(false);
    expect(kandidaatDocumentLabel("id")).toContain("ID-bewijs");
    expect(kandidaatDocumentLabel("onbekend")).toBe("onbekend");
  });

  test("kleine foto en PDF gaan direct", () => {
    expect(kandidaatUploadPlan({ name: "IMG_1234.jpg", type: "image/jpeg", size: 800_000 })).toEqual({ soort: "direct" });
    expect(kandidaatUploadPlan({ name: "cv.pdf", type: "application/pdf", size: 3 * MB })).toEqual({ soort: "direct" });
  });

  test("grote foto's worden verkleind; boven 4 MB is verkleinen verplicht", () => {
    expect(kandidaatUploadPlan({ name: "a.jpg", type: "image/jpeg", size: 2 * MB })).toEqual({ soort: "comprimeren", verplicht: false });
    expect(kandidaatUploadPlan({ name: "a.png", type: "image/png", size: 9 * MB })).toEqual({ soort: "comprimeren", verplicht: true });
  });

  test("HEIC (iPhone) wordt omgezet; zonder MIME-type beslist de extensie", () => {
    expect(kandidaatUploadPlan({ name: "IMG.HEIC", type: "image/heic", size: 2 * MB })).toEqual({ soort: "comprimeren", verplicht: false });
    expect(kandidaatUploadPlan({ name: "IMG.heic", type: "", size: 6 * MB })).toEqual({ soort: "comprimeren", verplicht: true });
  });

  test("te grote PDF, leeg bestand of ander formaat: nette melding", () => {
    const pdf = kandidaatUploadPlan({ name: "kvk.pdf", type: "application/pdf", size: 6 * MB });
    expect(pdf.soort).toBe("fout");
    expect(kandidaatUploadPlan({ name: "x.jpg", type: "image/jpeg", size: 0 }).soort).toBe("fout");
    expect(kandidaatUploadPlan({ name: "x.docx", type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document", size: 10 }).soort).toBe("fout");
  });

  test("413 of niet-JSON-antwoord geeft een begrijpelijke melding", () => {
    expect(uploadFoutmelding(413, null)).toContain("te groot");
    expect(uploadFoutmelding(502, null)).toContain("Probeer het opnieuw");
    expect(uploadFoutmelding(400, { error: "Kies eerst wat voor document je uploadt" })).toBe("Kies eerst wat voor document je uploadt");
    expect(uploadFoutmelding(403, {})).toContain("verlopen");
  });
});
