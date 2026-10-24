import { test, expect } from "@playwright/test";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import {
  eerVolgensControles,
  idVervalActie,
  isBewaardeWavKopie,
  KOPIE_NODIG_TEKST,
  kopieBijAccountVerwijderen,
  wavKopieBewaarTot,
  wavKopieRij,
} from "../../src/lib/id-check/controlerecord";
import { buildDocumentVerlooptHtml } from "../../src/lib/email-templates";
import { inzetbaarheidsMelding, verlopenKritiekeDocumenten } from "../../src/lib/medewerker/dienst-regels";

// Nawerk ID-controle (privacyverklaring 2.6, 10f): de Wav-kopie overleeft het verwijderen van een
// account, teksten over de kopie, en de vervalmail/-melding met de ID-controle via Didit.

test.describe("Wav-kopie bij het verwijderen van een account", () => {
  test("Wav-kopie (kopie_wav) blijft, ook als de controles niets over de nationaliteit weten", () => {
    expect(kopieBijAccountVerwijderen({ verificatieMethode: "kopie_wav", reviewStatus: "goedgekeurd", eer: null })).toBe("bewaren");
    expect(kopieBijAccountVerwijderen({ verificatieMethode: "kopie_wav", reviewStatus: null, eer: false })).toBe("bewaren");
  });

  test("nog niet beoordeelde kopie: buiten de EER bewaren, EER/Zwitserland weg, onbekend eerst beoordelen", () => {
    expect(kopieBijAccountVerwijderen({ verificatieMethode: null, reviewStatus: "goedgekeurd", eer: false })).toBe("bewaren");
    expect(kopieBijAccountVerwijderen({ verificatieMethode: null, reviewStatus: "goedgekeurd", eer: true })).toBe("verwijderen");
    expect(kopieBijAccountVerwijderen({ verificatieMethode: null, reviewStatus: null, eer: null })).toBe("beoordelen");
  });

  test("afgekeurde kopie is geen geldige kopie: altijd weg", () => {
    expect(kopieBijAccountVerwijderen({ verificatieMethode: "kopie_wav", reviewStatus: "afgekeurd", eer: false })).toBe("verwijderen");
    expect(kopieBijAccountVerwijderen({ verificatieMethode: null, reviewStatus: "afgekeurd", eer: null })).toBe("verwijderen");
  });

  test("nationaliteit uit de nieuwste controle die hem kent; afgewezen controles tellen niet", () => {
    expect(eerVolgensControles([])).toBeNull();
    expect(eerVolgensControles([{ eer: null, status: "gestart" }, { eer: false, status: "goedgekeurd" }])).toBe(false);
    expect(eerVolgensControles([{ eer: true, status: "goedgekeurd" }, { eer: false, status: "goedgekeurd" }])).toBe(true);
    expect(eerVolgensControles([{ eer: true, status: "afgewezen" }, { eer: false, status: "handmatig" }])).toBe(false);
    expect(eerVolgensControles([{ eer: true, status: "afgewezen" }])).toBeNull();
  });

  test("bewaar-tot: 31-12 van (jaar laatste dienst + 5), nooit eerder dan de datum op de documentrij", () => {
    expect(wavKopieBewaarTot({ laatsteDienst: "2026-08-01", beslisdatum: "2026-03-01", huidig: null })).toBe("2031-12-31");
    // Zonder diensten vanaf de goedkeuring/upload.
    expect(wavKopieBewaarTot({ laatsteDienst: null, beslisdatum: "2025-03-01", huidig: undefined })).toBe("2030-12-31");
    // De cron rekende al later (laatste dienst kon niet worden opgezocht): die datum blijft.
    expect(wavKopieBewaarTot({ laatsteDienst: null, beslisdatum: "2025-03-01", huidig: "2032-12-31" })).toBe("2032-12-31");
    // Een eerdere of ongeldige datum op de rij telt niet.
    expect(wavKopieBewaarTot({ laatsteDienst: "2027-01-10", beslisdatum: "2025-03-01", huidig: "2030-12-31" })).toBe("2032-12-31");
    expect(wavKopieBewaarTot({ laatsteDienst: "2027-01-10", beslisdatum: "2025-03-01", huidig: "kapot" })).toBe("2032-12-31");
  });

  test("rij voor id_wav_kopieen: alleen de witte lijst, naam ingekort", () => {
    const rij = wavKopieRij({
      medewerkerId: "m1",
      idVerificatieId: "v1",
      naam: "x".repeat(250),
      pad: "m1/id_bewijs_1.pdf",
      vervaldatum: "2030-02-30",
      geuploadOp: "2026-10-24T10:00:00Z",
      bewaarTot: "2031-12-31",
      nu: "2026-10-24T12:00:00Z",
    });
    expect(Object.keys(rij).sort()).toEqual(
      ["bestand_pad", "bewaar_tot", "bijgewerkt_op", "geupload_op", "id_verificatie_id", "medewerker_id", "naam", "vervaldatum"].sort(),
    );
    expect((rij.naam as string).length).toBe(200);
    expect(rij.vervaldatum).toBeNull(); // 30 februari bestaat niet
    expect(rij.bestand_pad).toBe("m1/id_bewijs_1.pdf");
  });

  test("een goedgekeurde Wav-kopie kan de werknemer niet zelf verwijderen, de rest wel", () => {
    expect(isBewaardeWavKopie({ document_type: "id_bewijs", verificatie_methode: "kopie_wav", review_status: "goedgekeurd" })).toBe(true);
    expect(isBewaardeWavKopie({ document_type: "id_bewijs", verificatie_methode: "kopie_wav", review_status: null })).toBe(false);
    expect(isBewaardeWavKopie({ document_type: "id_bewijs", verificatie_methode: "kopie_wav", review_status: "afgekeurd" })).toBe(false);
    expect(isBewaardeWavKopie({ document_type: "id_bewijs", verificatie_methode: "didit", review_status: "goedgekeurd" })).toBe(false);
    expect(isBewaardeWavKopie({ document_type: "vog", verificatie_methode: null, review_status: "goedgekeurd" })).toBe(false);
    expect(isBewaardeWavKopie({})).toBe(false);
  });

  test("geen code verwijdert een medewerker buiten verwijderMedewerkerAccount om", () => {
    const src = join(__dirname, "../../src");
    const bestanden: string[] = [];
    const loop = (map: string) => {
      for (const naam of readdirSync(map)) {
        const pad = join(map, naam);
        if (statSync(pad).isDirectory()) loop(pad);
        else if (/\.(ts|tsx)$/.test(naam)) bestanden.push(pad);
      }
    };
    loop(src);
    const rechtstreeks = bestanden
      .filter((pad) => /from\(\s*["']medewerkers["']\s*\)\s*\.delete\(/.test(readFileSync(pad, "utf8")))
      .map((pad) => relative(src, pad));
    expect(rechtstreeks).toEqual(["lib/medewerker/account-verwijderen.ts"]);
  });
});

test.describe("teksten over de kopie (privacyverklaring 2.6)", () => {
  test("de horecazaak krijgt geen kopie; TopTalent bewaart hem zelf", () => {
    expect(KOPIE_NODIG_TEKST).not.toMatch(/horecazaak moet/i);
    expect(KOPIE_NODIG_TEKST).toMatch(/bewaart TopTalent zelf/);
    expect(KOPIE_NODIG_TEKST).toMatch(/horecazaken krijgen hem niet/);
  });

  test("FAQ-migratie en seed hebben dezelfde tekst, zonder kopie voor opdrachtgevers", () => {
    const tekst = (bestand: string) => {
      const inhoud = readFileSync(join(__dirname, "../..", bestand), "utf8");
      return inhoud.match(/'(TopTalent Jobs voldoet volledig aan de Wet arbeid vreemdelingen[^']*)'/)?.[1];
    };
    const migratie = tekst("supabase/migrations/20261024_faq_wav_geen_id_kopie.sql");
    expect(migratie).toBeTruthy();
    expect(tekst("supabase-seed-faq.sql")).toBe(migratie);
    expect(migratie).not.toMatch(/ontvangt u van ons een kopie/);
    expect(migratie).toMatch(/die bewaren wij zelf, beveiligd/);
    expect(migratie).toMatch(/niet aan opdrachtgevers/);
  });
});

test.describe("verlopen ID-bewijs: opnieuw controleren of uploaden", () => {
  test("Didit aan en geen kopie nodig: opnieuw controleren; anders uploaden", () => {
    expect(idVervalActie({ diditActief: true, kopieNodig: false })).toBe("id_controle");
    expect(idVervalActie({ diditActief: true, kopieNodig: true })).toBe("upload");
    expect(idVervalActie({ diditActief: false, kopieNodig: false })).toBe("upload");
    expect(idVervalActie({ diditActief: false, kopieNodig: true })).toBe("upload");
  });

  test("vervalmail met ID-controle: naar Documenten, Didit of videocall, geen upload", () => {
    const html = buildDocumentVerlooptHtml({ naam: "Sam de Vries", documentType: "ID-bewijs", verloopDatum: "1 december 2026", idControle: true });
    expect(html).toContain("Controleer je ID");
    expect(html).toContain("videocall");
    expect(html).toContain("https://www.toptalentjobs.nl/medewerker/documenten");
    expect(html).not.toMatch(/Upload zo snel/);
    expect(html).toContain("Je hoeft niets te uploaden");
  });

  test("vervalmail zonder ID-controle: upload zoals voorheen; naam wordt ge-escaped", () => {
    const html = buildDocumentVerlooptHtml({ naam: "<b>Sam</b> X", documentType: "Werkvergunning", verloopDatum: "1 december 2026" });
    expect(html).toContain("Upload zo snel mogelijk een nieuw document");
    expect(html).not.toContain("Controleer je ID");
    expect(html).not.toContain("<b>Sam</b>");
  });

  test("melding bij aanmelden: verlopen ID met Didit aan vraagt om opnieuw controleren", () => {
    const vandaag = "2026-10-24";
    const id = { document_type: "id_bewijs", expiry_date: "2026-10-01", review_status: "goedgekeurd" };
    const twv = { document_type: "werkvergunning", expiry_date: "2026-09-01", review_status: "goedgekeurd" };
    expect(verlopenKritiekeDocumenten({ vandaag, documenten: [id, twv] })).toEqual(["id_bewijs", "werkvergunning"]);

    const controle = inzetbaarheidsMelding({ vandaag, documenten: [id], idActie: "id_controle" });
    expect(controle).toMatch(/Laat je nieuwe ID controleren bij Documenten \(via Didit of een videocall\)/);
    expect(controle).not.toMatch(/Upload/);

    const beide = inzetbaarheidsMelding({ vandaag, documenten: [id, twv], idActie: "id_controle" });
    expect(beide).toMatch(/Laat je nieuwe ID controleren/);
    expect(beide).toMatch(/Upload ook een nieuwe werkvergunning/);

    // Zonder Didit of met kopie nodig: uploaden, zoals voorheen.
    expect(inzetbaarheidsMelding({ vandaag, documenten: [id] })).toMatch(/Upload een nieuw document bij Documenten/);
    expect(inzetbaarheidsMelding({ vandaag, documenten: [id], idActie: "upload" })).toMatch(/Upload een nieuw document/);
    // Alleen een verlopen werkvergunning: de ID-actie doet niets.
    expect(inzetbaarheidsMelding({ vandaag, documenten: [twv], idActie: "id_controle" })).toMatch(/Upload een nieuw document/);
  });
});
