import { test, expect } from "@playwright/test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { NextRequest } from "next/server";
import {
  alleVerplichteGoedgekeurd,
  ID_LATER_TEKST,
  isKandidaatUploadType,
  KANDIDAAT_NIEUWE_DOCUMENT_TYPES,
  KANDIDAAT_UPLOAD_TYPES,
  kandidaatUploadTypeFout,
  meeTeNemenDocumenten,
  verplichteKandidaatDocumenten,
} from "../../src/lib/kandidaat-documenten";
import { getDocumentChecklist, idLaterRegel } from "../../src/content/candidateEmails";
import { adminCandidateEmailTemplates } from "../../src/content/adminCandidateEmailTemplates";
import { POST as kandidaatUpload } from "../../src/app/api/kandidaat/documenten/route";

/**
 * Geen ID-upload meer bij de inschrijving (juridisch advies 24-10-2026): van zzp'ers uit de
 * EER/Zwitserland maakt of bewaart TopTalent geen kopie van het ID. Het ID wordt later gecontroleerd
 * via de checklist van de werknemer (Didit of videocall, of de Wav-upload bij een nationaliteit buiten
 * de EER). Bestaande kandidaatkopieën ruimt de opschoontool op.
 */

const ID_VERMELDING = /identiteitsbewijs|paspoort|ID-kaart|\bID\b/i;

test.describe("onboarding gaat verder zonder ID-document", () => {
  test("geen enkele kandidaat hoeft nog een ID aan te leveren", () => {
    for (const wijze of ["zzp", "loondienst", null, undefined]) {
      expect(verplichteKandidaatDocumenten(wijze)).not.toContain("id");
    }
  });

  test("met alleen een goedgekeurd CV (en bij zzp de KvK) is alles goedgekeurd", () => {
    expect(alleVerplichteGoedgekeurd([{ type: "cv", status: "goedgekeurd" }], "loondienst")).toBe(true);
    expect(
      alleVerplichteGoedgekeurd(
        [
          { type: "cv", status: "goedgekeurd" },
          { type: "kvk", status: "goedgekeurd" },
        ],
        "zzp",
      ),
    ).toBe(true);
  });

  test("een oud ID-document houdt niemand tegen, in welke status ook", () => {
    const basis = [
      { type: "cv", status: "goedgekeurd" },
      { type: "kvk", status: "goedgekeurd" },
    ];
    for (const status of ["ontvangen", "afgekeurd", "goedgekeurd", null]) {
      expect(alleVerplichteGoedgekeurd([...basis, { type: "id", status }], "zzp")).toBe(true);
    }
    // En een goedgekeurd ID vervangt geen ontbrekend CV.
    expect(alleVerplichteGoedgekeurd([{ type: "id", status: "goedgekeurd" }], "loondienst")).toBe(false);
  });
});

test.describe("type id wordt geweigerd", () => {
  test("niet in de keuzelijst van de kandidaat, wel een nette Nederlandse melding", () => {
    expect(KANDIDAAT_UPLOAD_TYPES).not.toContain("id");
    expect(isKandidaatUploadType("id")).toBe(false);
    expect(kandidaatUploadTypeFout("id")).toBe(`Een ID-bewijs uploaden is niet nodig. ${ID_LATER_TEKST}`);
    expect(ID_LATER_TEKST).toBe("We controleren je ID later in het portaal; we bewaren geen kopie.");
    expect(kandidaatUploadTypeFout("cv")).toBeNull();
    expect(kandidaatUploadTypeFout("kvk")).toBeNull();
    expect(kandidaatUploadTypeFout("overig")).toBeNull();
    expect(kandidaatUploadTypeFout("paspoort")).toBe("Kies eerst wat voor document je uploadt");
    expect(kandidaatUploadTypeFout(null)).toBe("Kies eerst wat voor document je uploadt");
  });

  test("de uploadroute geeft 400 met code id_niet_nodig, vóór token, opslag of database", async () => {
    // Zonder Supabase-omgeving: zou de route verder gaan dan de typecontrole, dan faalt de
    // (lazy) client en volgt een 500. Een 400 bewijst dus dat er niets is opgeslagen.
    for (const veld of ["document_type", "type"]) {
      const formData = new FormData();
      formData.append("token", "willekeurig-token");
      formData.append(veld, "id");
      formData.append("file", new File([new Uint8Array([0xff, 0xd8, 0xff])], "id-voorkant.jpg", { type: "image/jpeg" }));
      const res = await kandidaatUpload(
        new NextRequest("http://localhost/api/kandidaat/documenten", { method: "POST", body: formData }),
      );
      expect(res.status, veld).toBe(400);
      const body = await res.json();
      expect(body.code).toBe("id_niet_nodig");
      expect(body.error).toContain("we bewaren geen kopie");
    }
  });

  test("de admin kan bij een kandidaat geen nieuw ID-bewijs uploaden", () => {
    expect(KANDIDAAT_NIEUWE_DOCUMENT_TYPES.map((t) => t.value)).not.toContain("id");
    expect(KANDIDAAT_NIEUWE_DOCUMENT_TYPES.map((t) => t.value)).toContain("cv");
    // Route-bewaking: de admin-POST weigert type id voordat er iets naar Storage gaat.
    const bron = readFileSync(join(__dirname, "../../src/app/api/admin/kandidaat-documenten/route.ts"), "utf8");
    const post = bron.slice(bron.indexOf("export async function POST"), bron.indexOf("export async function PATCH"));
    expect(post.indexOf("isIdDocumentType(type)")).toBeGreaterThan(-1);
    expect(post.indexOf("isIdDocumentType(type)")).toBeLessThan(post.indexOf(".storage"));
  });
});

test.describe("neemKandidaatDocumentenMee neemt geen ID mee", () => {
  test("een goedgekeurd ID-document blijft achter, de rest gaat mee", () => {
    const docs = [
      { id: "id-voor", type: "id", status: "goedgekeurd" },
      { id: "id-achter", type: "id", status: "goedgekeurd" },
      { id: "cv", type: "cv", status: "goedgekeurd" },
      { id: "kvk", type: "kvk", status: "goedgekeurd" },
      { id: "oud-cv", type: "cv", status: "afgekeurd" },
    ];
    expect(meeTeNemenDocumenten(docs).map((d) => d.id)).toEqual(["cv", "kvk"]);
    expect(meeTeNemenDocumenten([{ id: "id", type: "id", status: "goedgekeurd" }])).toEqual([]);
  });
});

test.describe("mails vragen niet meer om een ID", () => {
  test("documentenverzoek en herinnering: alleen CV (en KvK bij zzp), plus de uitleg over het ID", () => {
    for (const isZZP of [true, false]) {
      const lijst = getDocumentChecklist(isZZP);
      expect(lijst.some((regel) => ID_VERMELDING.test(regel))).toBe(false);
      expect(lijst.some((regel) => regel.includes("CV"))).toBe(true);
    }
    expect(idLaterRegel).toContain(ID_LATER_TEKST);
  });

  test("geen admin-mailtemplate vraagt om een ID of linkt naar een ID-upload", () => {
    expect(Object.keys(adminCandidateEmailTemplates)).not.toContain("missing_id");
    for (const template of Object.values(adminCandidateEmailTemplates)) {
      const tekst = [template.subject, template.heading, template.intro, template.ctaLabel, ...(template.cardItems ?? [])].join(" ");
      expect(ID_VERMELDING.test(tekst), template.subject).toBe(false);
    }
  });
});
