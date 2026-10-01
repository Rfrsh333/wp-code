import { test, expect } from "@playwright/test";
import {
  bepaalDocumentFormaat,
  isDocumentType,
  MAX_DOCUMENT_BYTES,
  valideerDocument,
} from "../../src/lib/medewerker/documenten";

test.describe("medewerker documenten", () => {
  test("alleen pdf/jpg/png/heic, ook HEIC zonder MIME-type (iOS)", () => {
    expect(bepaalDocumentFormaat({ name: "id.pdf", type: "application/pdf" })).toEqual({ mime: "application/pdf", ext: "pdf" });
    expect(bepaalDocumentFormaat({ name: "IMG_1.HEIC", type: "" })).toEqual({ mime: "image/heic", ext: "heic" });
    expect(bepaalDocumentFormaat({ name: "foto.jpeg", type: "application/octet-stream" })?.ext).toBe("jpg");
    expect(bepaalDocumentFormaat({ name: "cv.docx", type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document" })).toBeNull();
    // MIME wint van een misleidende extensie
    expect(bepaalDocumentFormaat({ name: "x.pdf", type: "text/html" })).toBeNull();
  });

  test("maximaal 4 MB (Vercel-bodylimiet) en niet leeg", () => {
    expect(valideerDocument({ name: "a.pdf", type: "application/pdf", size: MAX_DOCUMENT_BYTES })).toBeNull();
    expect(valideerDocument({ name: "a.pdf", type: "application/pdf", size: MAX_DOCUMENT_BYTES + 1 })).toContain("4 MB");
    expect(valideerDocument({ name: "a.pdf", type: "application/pdf", size: 0 })).not.toBeNull();
  });

  test("documenttype moet uit de keuzelijst komen", () => {
    expect(isDocumentType("id_bewijs")).toBe(true);
    expect(isDocumentType("../../etc")).toBe(false);
    expect(isDocumentType(null)).toBe(false);
  });
});
