import { test, expect } from "@playwright/test";
import {
  isKandidaatDocumentStatus,
  naarAdminDocument,
  reviewNaarStatus,
  statusNaarReview,
} from "../../src/lib/kandidaat-documenten";

test.describe("kandidaat-documenten mapping", () => {
  test("status ↔ review_status heen en terug", () => {
    expect(statusNaarReview("ontvangen")).toBe("in_review");
    expect(statusNaarReview("goedgekeurd")).toBe("approved");
    expect(statusNaarReview("afgekeurd")).toBe("rejected");
    expect(statusNaarReview(null)).toBe("in_review");
    expect(reviewNaarStatus("approved")).toBe("goedgekeurd");
    expect(reviewNaarStatus("rejected")).toBe("afgekeurd");
    expect(reviewNaarStatus("in_review")).toBe("ontvangen");
  });

  test("alleen CHECK-waarden zijn geldige status", () => {
    expect(isKandidaatDocumentStatus("goedgekeurd")).toBe(true);
    expect(isKandidaatDocumentStatus("approved")).toBe(false);
  });

  test("admin-document bevat live kolommen én oude aliasnamen", () => {
    const doc = naarAdminDocument({
      id: "d1",
      inschrijving_id: "i1",
      type: "cv",
      bestandsnaam: "cv.pdf",
      bestand_pad: "i1/cv_1.pdf",
      mime_type: "application/pdf",
      bestand_grootte: 2048,
      status: "afgekeurd",
      notitie: "Onleesbaar",
      reviewed_at: null,
      uploaded_at: "2026-10-01T10:00:00Z",
    });
    expect(doc.type).toBe("cv");
    expect(doc.document_type).toBe("cv");
    expect(doc.file_name).toBe("cv.pdf");
    expect(doc.file_path).toBe("i1/cv_1.pdf");
    expect(doc.file_size).toBe(2048);
    expect(doc.review_status).toBe("rejected");
    expect(doc.review_notes).toBe("Onleesbaar");
  });
});
