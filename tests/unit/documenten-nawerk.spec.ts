import { test, expect } from "@playwright/test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { hasRequiredAdminRole, type AdminRole } from "../../src/lib/admin-auth";
import { buildDocumentVerlooptHtml } from "../../src/lib/email-templates";
import { plusDagen } from "../../src/lib/nl-tijd";
import {
  dagenTot,
  idControleVervangtDocument,
  moetVervalMailSturen,
  nieuwsteGeldigeVersies,
  vervalMailOnderwerp,
  vervalMijlpaal,
  vervalMijlpaalOpDeDag,
  vervalSleutel,
  type VervalMijlpaal,
} from "../../src/lib/medewerker/verval-meldingen";
import {
  isWavDocument,
  isWavKopieDocument,
  leesOpenVerzoek,
  WAV_KOPIE_ROLLEN,
  wavKopieenOverzicht,
  wavSoortLabel,
  zoekWavKopieen,
} from "../../src/lib/id-check/wav-kopieen-overzicht";
import {
  bestandBijAccountVerwijderen,
  BEWAREN_NA_ACCOUNT_VERWIJDEREN,
  bewaardDocumentRij,
  bewaarTotBijUitDienst,
  bewaarTotEindeJaar,
  bewaarTotNaEinde,
  bewaarTotVoorDocument,
  eindeDienstverband,
  maakOpruimPlan,
  PROFIELFOTO_BUCKET,
  vergunningBijAccountVerwijderen,
} from "../../src/lib/medewerker/bestanden-bij-verwijderen";

const bron = (pad: string) => readFileSync(join(__dirname, "../..", pad), "utf8");

// Nawerk documenten: vervalmail één keer per mijlpaal, Wav-kopieën terugvinden in de admin, en
// bestanden opruimen bij het verwijderen van een account.

test.describe("vervalmail: mijlpalen", () => {
  test("30 dagen, 7 dagen en net verlopen; daarbuiten niets", () => {
    const vandaag = "2026-10-24";
    const op = (dagen: number) => vervalMijlpaal(plusDagen(vandaag, dagen), vandaag);
    expect(op(31)).toBeNull();
    expect(op(30)).toBe("30_dagen");
    expect(op(8)).toBe("30_dagen");
    expect(op(7)).toBe("7_dagen");
    expect(op(0)).toBe("7_dagen");
    expect(op(-1)).toBe("verlopen");
    expect(op(-7)).toBe("verlopen");
    expect(op(-8)).toBeNull();
    expect(vervalMijlpaal(null, vandaag)).toBeNull();
    expect(vervalMijlpaal("kapot", vandaag)).toBeNull();
    expect(dagenTot("2026-11-23", vandaag)).toBe(30);
    // Tijdstempel van de database telt als datum.
    expect(vervalMijlpaal("2026-10-31T00:00:00+00:00", vandaag)).toBe("7_dagen");
  });

  test("zonder opslag alleen op de dag zelf", () => {
    const vandaag = "2026-03-01";
    const op = (dagen: number) => vervalMijlpaalOpDeDag(plusDagen(vandaag, dagen), vandaag);
    expect(op(30)).toBe("30_dagen");
    expect(op(29)).toBeNull();
    expect(op(7)).toBe("7_dagen");
    expect(op(6)).toBeNull();
    expect(op(0)).toBeNull();
    expect(op(-1)).toBe("verlopen");
    expect(op(-2)).toBeNull();
  });

  test("een latere mijlpaal dekt een eerdere; nooit twee keer dezelfde", () => {
    expect(moetVervalMailSturen("30_dagen", [])).toBe(true);
    expect(moetVervalMailSturen("30_dagen", ["30_dagen"])).toBe(false);
    expect(moetVervalMailSturen("7_dagen", ["30_dagen"])).toBe(true);
    expect(moetVervalMailSturen("30_dagen", ["7_dagen"])).toBe(false);
    expect(moetVervalMailSturen("verlopen", ["30_dagen", "7_dagen"])).toBe(true);
    expect(moetVervalMailSturen("7_dagen", ["verlopen"])).toBe(false);
    expect(moetVervalMailSturen("7_dagen", ["iets_anders"])).toBe(true);
  });

  test("dagelijkse cron over 45 dagen: precies drie mails per document (met en zonder opslag)", () => {
    const vervaldatum = "2026-12-01";
    const start = plusDagen(vervaldatum, -40);
    const metOpslag: VervalMijlpaal[] = [];
    const zonderOpslag: VervalMijlpaal[] = [];
    for (let i = 0; i < 45; i += 1) {
      const vandaag = plusDagen(start, i);
      const m = vervalMijlpaal(vervaldatum, vandaag);
      if (m && moetVervalMailSturen(m, metOpslag)) metOpslag.push(m);
      const d = vervalMijlpaalOpDeDag(vervaldatum, vandaag);
      if (d) zonderOpslag.push(d);
    }
    expect(metOpslag).toEqual(["30_dagen", "7_dagen", "verlopen"]);
    expect(zonderOpslag).toEqual(["30_dagen", "7_dagen", "verlopen"]);
  });

  test("document dat pas 5 dagen vooraf in beeld komt: alleen de 7-dagenmail en de verlopenmail", () => {
    const vervaldatum = "2026-12-01";
    const verstuurd: VervalMijlpaal[] = [];
    for (let i = -5; i <= 10; i += 1) {
      const m = vervalMijlpaal(vervaldatum, plusDagen(vervaldatum, i));
      if (m && moetVervalMailSturen(m, verstuurd)) verstuurd.push(m);
    }
    expect(verstuurd).toEqual(["7_dagen", "verlopen"]);
  });

  test("een gecorrigeerde vervaldatum telt als nieuw document", () => {
    expect(vervalSleutel("medewerker_document", "d1", "2026-12-01")).not.toBe(vervalSleutel("medewerker_document", "d1", "2027-12-01"));
    expect(vervalSleutel("certificering", "c1", "2026-12-01T00:00:00Z")).toBe("certificering:c1:2026-12-01");
  });
});

test.describe("vervalmail: alleen de nieuwste geldige versie", () => {
  const doc = (id: string, medewerker: string, soort: string, upload: string, extra: Record<string, unknown> = {}) => ({
    id,
    medewerker_id: medewerker,
    document_type: soort,
    expiry_date: "2026-11-01",
    uploaded_at: upload,
    review_status: "goedgekeurd",
    ...extra,
  });

  test("een nieuwer document van dezelfde soort vervangt het oude", () => {
    const ids = nieuwsteGeldigeVersies([
      doc("oud", "m1", "id_bewijs", "2021-01-01T10:00:00Z"),
      doc("nieuw", "m1", "id_bewijs", "2026-10-20T10:00:00Z", { expiry_date: "2036-10-01" }),
      doc("vog", "m1", "vog", "2020-01-01T10:00:00Z"),
    ]).map((d) => d.id);
    expect(ids.sort()).toEqual(["nieuw", "vog"]);
  });

  test("een afgekeurde nieuwere versie vervangt niets; een nieuwere die nog beoordeeld wordt wel", () => {
    expect(
      nieuwsteGeldigeVersies([
        doc("oud", "m1", "werkvergunning", "2025-01-01T10:00:00Z"),
        doc("afgekeurd", "m1", "werkvergunning", "2026-10-01T10:00:00Z", { review_status: "afgekeurd" }),
      ]).map((d) => d.id),
    ).toEqual(["oud"]);
    expect(
      nieuwsteGeldigeVersies([
        doc("oud", "m1", "werkvergunning", "2025-01-01T10:00:00Z"),
        doc("in_review", "m1", "werkvergunning", "2026-10-01T10:00:00Z", { review_status: null, expiry_date: null }),
      ]).map((d) => d.id),
    ).toEqual(["in_review"]);
  });

  test("per werknemer apart", () => {
    const ids = nieuwsteGeldigeVersies([
      doc("a", "m1", "id_bewijs", "2025-01-01T10:00:00Z"),
      doc("b", "m2", "id_bewijs", "2024-01-01T10:00:00Z"),
    ]).map((d) => d.id);
    expect(ids.sort()).toEqual(["a", "b"]);
  });

  test("ID-bewijs: geen mail als een goedgekeurde ID-controle een later verlopend, geldig ID zag", () => {
    const vandaag = "2026-10-24";
    const id = { expiry_date: "2026-11-10", uploaded_at: "2021-05-01T10:00:00Z" };
    const controle = (extra: Record<string, unknown>) => ({ status: "goedgekeurd", vervaldatum: null, beslist_op: null, ...extra });
    expect(idControleVervangtDocument(id, [controle({ vervaldatum: "2036-10-01" })], vandaag)).toBe(true);
    // Hetzelfde ID (zelfde vervaldatum): de mail blijft nodig.
    expect(idControleVervangtDocument(id, [controle({ vervaldatum: "2026-11-10" })], vandaag)).toBe(false);
    expect(idControleVervangtDocument(id, [controle({ vervaldatum: "2036-10-01", status: "afgewezen" })], vandaag)).toBe(false);
    expect(idControleVervangtDocument(id, [controle({ vervaldatum: "2036-10-01", status: "handmatig" })], vandaag)).toBe(false);
    // Zonder vervaldatum: alleen een goedkeuring na de upload.
    expect(idControleVervangtDocument(id, [controle({ beslist_op: "2026-10-01T10:00:00+00:00" })], vandaag)).toBe(true);
    expect(idControleVervangtDocument(id, [controle({ beslist_op: "2020-10-01T10:00:00+00:00" })], vandaag)).toBe(false);
    expect(idControleVervangtDocument(id, [], vandaag)).toBe(false);
    // Verlopen document, controle van een ID dat ook al verlopen is: telt niet.
    expect(idControleVervangtDocument({ expiry_date: "2026-10-01" }, [controle({ vervaldatum: "2026-10-10" })], vandaag)).toBe(false);
  });
});

test.describe("vervalmail: teksten", () => {
  test("onderwerp per soort en mijlpaal; de ID-variant blijft", () => {
    expect(vervalMailOnderwerp({ soort: "id_controle", mijlpaal: "30_dagen" })).toBe("Je ID-bewijs verloopt binnenkort");
    expect(vervalMailOnderwerp({ soort: "id_controle", mijlpaal: "verlopen" })).toBe("Je ID-bewijs is verlopen");
    expect(vervalMailOnderwerp({ soort: "document", naam: "VOG", mijlpaal: "7_dagen" })).toBe("Document verloopt binnenkort: VOG");
    expect(vervalMailOnderwerp({ soort: "document", naam: "VOG", mijlpaal: "verlopen" })).toBe("Document verlopen: VOG");
    expect(vervalMailOnderwerp({ soort: "certificering", naam: "BHV", mijlpaal: "30_dagen" })).toBe("Certificering verloopt binnenkort: BHV");
    expect(vervalMailOnderwerp({ soort: "werkvergunning", mijlpaal: "verlopen" })).toBe("Werkvergunning verlopen");
  });

  test("verlopen mail: andere kop en zin; ID-controle zonder 'op tijd'", () => {
    const html = buildDocumentVerlooptHtml({ naam: "Sam", documentType: "ID-bewijs", verloopDatum: "1 december 2026", idControle: true, verlopen: true });
    expect(html).toContain("Document verlopen");
    expect(html).toContain("is verlopen op");
    expect(html).not.toContain("op tijd");
    expect(html).toContain("Je hoeft niets te uploaden");
    const binnenkort = buildDocumentVerlooptHtml({ naam: "Sam", documentType: "VOG", verloopDatum: "1 december 2026" });
    expect(binnenkort).toContain("Document verloopt binnenkort");
    expect(binnenkort).toContain("verloopt op");
  });

  test("de cron legt de mijlpaal vast in een eigen tabel en valt zonder tabel terug op de dag zelf", () => {
    const route = bron("src/app/api/cron/document-expiry/route.ts");
    expect(route).toContain('"document_verval_meldingen"');
    expect(route).toContain("vervalMijlpaalOpDeDag");
    expect(route).toContain("idVervalActieVoorMedewerker");
    const migratie = bron("supabase/migrations/20261024_documenten_nawerk.sql");
    expect(migratie).toMatch(/unique \(bron, bron_id, vervaldatum, mijlpaal\)/);
    expect(migratie).toMatch(/create table if not exists public\.document_verval_meldingen/);
  });
});

test.describe("Wav-kopieën in de admin", () => {
  const ALLE_ROLLEN: AdminRole[] = ["owner", "operations", "recruiter", "finance"];

  test("alleen owner en operations", () => {
    expect([...WAV_KOPIE_ROLLEN].sort()).toEqual(["operations", "owner"]);
    expect(ALLE_ROLLEN.filter((r) => hasRequiredAdminRole(r, WAV_KOPIE_ROLLEN)).sort()).toEqual(["operations", "owner"]);
    expect(hasRequiredAdminRole(undefined, WAV_KOPIE_ROLLEN)).toBe(false);
  });

  test("elke handler begint met de toegangscheck; geen verwijderroute", () => {
    const route = bron("src/app/api/admin/wav-kopieen/route.ts");
    const handlers = [...route.matchAll(/export async function (GET|POST|PUT|PATCH|DELETE)\([^)]*\)[^{]*\{\s*([^\n]*)/g)];
    expect(handlers.map((h) => h[1]).sort()).toEqual(["GET", "POST"]);
    for (const [, methode, eersteRegel] of handlers) expect(eersteRegel, methode).toContain("await wavKopieToegang(request)");
    const db = bron("src/lib/id-check/wav-kopieen.ts");
    expect(db).not.toMatch(/\.remove\(|\.delete\(/);
    // Uit bewaarde_documenten alleen vergunningen (geen loonheffingsverklaring of contract).
    expect(db).toMatch(/!rij \|\| !isWavVergunning\(rij\.document_type\)/);
    // Eerst de audit-log, dan pas de link teruggeven.
    expect(db.indexOf('from("audit_log").insert')).toBeGreaterThan(db.indexOf("createSignedUrl"));
    expect(db.indexOf("return link.signedUrl")).toBeGreaterThan(db.indexOf('from("audit_log").insert'));
  });

  const kopie = (extra: Record<string, unknown> = {}) => ({
    id: "d1",
    medewerker_id: "m1",
    document_type: "id_bewijs",
    file_path: "m1/id_bewijs_1.pdf",
    verificatie_methode: "kopie_wav",
    review_status: "goedgekeurd",
    expiry_date: "2030-01-01",
    uploaded_at: "2026-01-01T10:00:00Z",
    bewaar_tot: null,
    ...extra,
  });

  test("selectie zoals bij het verwijderen van een account (kopie_wav of buiten de EER, met bestand)", () => {
    expect(isWavKopieDocument(kopie(), [])).toBe(true);
    // Nog niet beoordeeld: wel een Wav-kopie (blijft ook bij verwijderen).
    expect(isWavKopieDocument(kopie({ review_status: null }), [])).toBe(true);
    expect(isWavKopieDocument(kopie({ review_status: "afgekeurd" }), [])).toBe(false);
    // Oude upload zonder methode: volgens de nationaliteit uit de controles.
    expect(isWavKopieDocument(kopie({ verificatie_methode: null }), [{ eer: false, status: "goedgekeurd" }])).toBe(true);
    expect(isWavKopieDocument(kopie({ verificatie_methode: null }), [{ eer: true, status: "goedgekeurd" }])).toBe(false);
    expect(isWavKopieDocument(kopie({ verificatie_methode: null }), [])).toBe(false);
    // Didit/videocall: geen bestand, dus geen kopie.
    expect(isWavKopieDocument(kopie({ verificatie_methode: "didit", file_path: null, file_url: null }), [{ eer: false, status: "goedgekeurd" }])).toBe(false);
    expect(isWavKopieDocument(kopie({ file_path: null, file_url: "https://elders.example/x.pdf" }), [])).toBe(false);
    expect(isWavKopieDocument(kopie({ document_type: "werkvergunning" }), [])).toBe(false);
  });

  test("vergunningen: bij een werknemer van buiten de EER of met onbekende nationaliteit; nooit afgekeurd of EER", () => {
    const twv = (extra: Record<string, unknown> = {}) => kopie({ document_type: "werkvergunning", file_path: "m1/werkvergunning_1.pdf", verificatie_methode: null, ...extra });
    expect(isWavDocument(twv(), [{ eer: false, status: "goedgekeurd" }])).toBe(true);
    expect(isWavDocument(twv(), [])).toBe(true);
    expect(isWavDocument(twv({ document_type: "verblijfsvergunning" }), [])).toBe(true);
    expect(isWavDocument(twv(), [{ eer: true, status: "goedgekeurd" }])).toBe(false);
    expect(isWavDocument(twv({ review_status: "afgekeurd" }), [])).toBe(false);
    expect(isWavDocument(twv({ file_path: null }), [])).toBe(false);
    expect(isWavDocument(kopie({ document_type: "vog" }), [{ eer: false, status: "goedgekeurd" }])).toBe(false);
    // ID-bewijs: zoals isWavKopieDocument.
    expect(isWavDocument(kopie({ verificatie_methode: null }), [])).toBe(false);
    expect(wavSoortLabel("verblijfsvergunning")).toBe("Verblijfsvergunning");
  });

  test("één lijst: bestaande en verwijderde accounts, ID-kopieën en vergunningen, zelfde bestand één keer", () => {
    const items = wavKopieenOverzicht({
      documenten: [
        kopie(),
        kopie({ id: "d2", medewerker_id: "m2", verificatie_methode: null, file_path: "m2/id_bewijs_2.pdf" }),
        kopie({ id: "d3", document_type: "werkvergunning", verificatie_methode: null, file_path: "m1/werkvergunning_3.pdf" }),
      ],
      bewaard: [
        { id: "b1", medewerker_id: null, naam: "Ana Ólafsdóttir", bestand_pad: "x/id_bewijs_9.pdf", vervaldatum: "2029-01-01", geupload_op: "2025-01-01T00:00:00Z", bewaar_tot: "2031-12-31" },
        // Verwijderen mislukte na het vastleggen: zelfde bestand als documentrij d1.
        { id: "b2", medewerker_id: "m1", naam: "Zoë", bestand_pad: "m1/id_bewijs_1.pdf", vervaldatum: null, geupload_op: null, bewaar_tot: "2031-12-31" },
      ],
      bewaardeDocumenten: [
        { id: "v1", medewerker_id: null, document_type: "verblijfsvergunning", naam: "Ana Ólafsdóttir", bestand_pad: "x/verblijfsvergunning_8.pdf", geupload_op: "2025-01-02T00:00:00Z", bewaar_tot: "2031-12-31" },
        // Niet in dit scherm.
        { id: "l1", medewerker_id: null, document_type: "loonheffingsverklaring", naam: "Ana Ólafsdóttir", bestand_pad: "x/loonheffingsverklaring_7.pdf", geupload_op: null, bewaar_tot: "2031-01-01" },
      ],
      controles: new Map([["m2", [{ eer: true, status: "goedgekeurd" }]]]),
      medewerkers: new Map([["m1", "Bram de Boer"], ["m2", "Chris"]]),
      bewaarTot: new Map([["d1", "2032-12-31"]]),
    });
    // Op naam; bij dezelfde naam de nieuwste upload eerst (gelijk: volgorde van binnenkomst).
    expect(items.map((i) => i.sleutel)).toEqual(["bewaard_document:v1", "bewaard:b1", "medewerker:d1", "medewerker:d3"]);
    const [vergunning, verwijderd, bestaand, bestaandeTwv] = items;
    expect(vergunning).toMatchObject({ bron: "bewaard_document", soort: "verblijfsvergunning", account_bestaat: false, vervaldatum: null, bewaar_tot: "2031-12-31" });
    expect(verwijderd).toMatchObject({ bron: "bewaard", soort: "id_bewijs", account_bestaat: false, naam: "Ana Ólafsdóttir", bewaar_tot_voorlopig: false });
    expect(bestaandeTwv).toMatchObject({ soort: "werkvergunning", account_bestaat: true, naam: "Bram de Boer" });
    expect(bestaand).toMatchObject({ soort: "id_bewijs", account_bestaat: true, bewaar_tot: "2032-12-31", bewaar_tot_voorlopig: true, goedgekeurd: true });
  });

  test("zoeken op naam: hoofdletters en accenten maken niet uit, elk woord telt", () => {
    const items = [{ naam: "Ana Ólafsdóttir" }, { naam: "Bram de Boer" }, { naam: null }];
    expect(zoekWavKopieen(items, "olafs").map((i) => i.naam)).toEqual(["Ana Ólafsdóttir"]);
    expect(zoekWavKopieen(items, "  BOER  bram ").map((i) => i.naam)).toEqual(["Bram de Boer"]);
    expect(zoekWavKopieen(items, "")).toHaveLength(3);
    expect(zoekWavKopieen(items, "piet")).toEqual([]);
  });

  test("open-verzoek: alleen actie open, bekende bron en een uuid", () => {
    const id = "123e4567-e89b-12d3-a456-426614174000";
    expect(leesOpenVerzoek({ actie: "open", bron: "bewaard", id })).toEqual({ bron: "bewaard", id });
    expect(leesOpenVerzoek({ actie: "open", bron: "medewerker", id })).toEqual({ bron: "medewerker", id });
    expect(leesOpenVerzoek({ actie: "open", bron: "bewaard_document", id })).toEqual({ bron: "bewaard_document", id });
    expect(leesOpenVerzoek({ actie: "verwijder", bron: "bewaard", id })).toBeNull();
    expect(leesOpenVerzoek({ actie: "open", bron: "kandidaat", id })).toBeNull();
    expect(leesOpenVerzoek({ actie: "open", bron: "bewaard", id: "m1/../x" })).toBeNull();
    expect(leesOpenVerzoek(null)).toBeNull();
  });
});

test.describe("bestanden bij het verwijderen van een account", () => {
  test("per documentsoort: ID volgt de Wav-regeling, loonheffingsverklaring en contract blijven, de rest gaat weg", () => {
    expect(bestandBijAccountVerwijderen("id_bewijs")).toBe("id_regeling");
    expect(bestandBijAccountVerwijderen("loonheffingsverklaring")).toBe("bewaren");
    expect(bestandBijAccountVerwijderen("contract")).toBe("bewaren");
    for (const soort of ["vog", "kvk", "vsh", "overig", "constructor", null]) {
      expect(bestandBijAccountVerwijderen(soort, { eer: false }), String(soort)).toBe("verwijderen");
    }
  });

  test("werk- en verblijfsvergunning: zoals de ID-kopie (#38), maar onbekende nationaliteit = bewaren", () => {
    for (const soort of ["werkvergunning", "verblijfsvergunning"]) {
      expect(bestandBijAccountVerwijderen(soort, { eer: false }), soort).toBe("bewaren");
      expect(bestandBijAccountVerwijderen(soort, { eer: null }), soort).toBe("bewaren");
      expect(bestandBijAccountVerwijderen(soort, { eer: true }), soort).toBe("verwijderen");
      expect(bestandBijAccountVerwijderen(soort, { eer: false, reviewStatus: "afgekeurd" }), soort).toBe("verwijderen");
    }
    expect(vergunningBijAccountVerwijderen({ reviewStatus: "goedgekeurd", eer: null })).toBe("bewaren");
    expect(vergunningBijAccountVerwijderen({ reviewStatus: null, eer: true })).toBe("verwijderen");
  });

  test("termijnen staan zo in de privacyverklaring 2.7 en op de pagina Account verwijderen", () => {
    const privacy = bron("src/app/privacy/page.tsx").replace(/\s+/g, " ");
    expect(privacy).toMatch(/Loonbelastingverklaringen<\/td> <td[^>]*>5 jaar na einde dienstverband</);
    expect(privacy).toMatch(
      /Arbeidsovereenkomst of overeenkomst van opdracht \(contract\)<\/td> <td[^>]*>7 jaar \(fiscale bewaarplicht\): tot 31 december van het zevende jaar na het jaar waarin uw werk via TopTalent eindigde, ook als uw account wordt verwijderd</,
    );
    expect(privacy).toMatch(
      /Werk- of verblijfsvergunning<\/td> <td[^>]*>Van zzp&apos;ers van buiten de EER of Zwitserland \(Wet arbeid vreemdelingen\): tot 31 december van het vijfde jaar na het jaar waarin het werk via TopTalent eindigde, ook als uw account wordt verwijderd/,
    );
    expect(privacy).not.toMatch(/Arbeidsovereenkomst en personeelsdossier/);
    expect(privacy).toContain("Privacy Policy versie 2.7");
    expect(bron("src/app/privacy/IdControleSectie.tsx").replace(/\s+/g, " ")).toMatch(
      /Een werk- of verblijfsvergunning die u bij Documenten heeft geüpload, bewaren wij tot dezelfde datum/,
    );
    expect(BEWAREN_NA_ACCOUNT_VERWIJDEREN.loonheffingsverklaring).toMatchObject({ termijn: "na_einde", jaren: 5, totEindeJaar: false });
    expect(BEWAREN_NA_ACCOUNT_VERWIJDEREN.contract).toMatchObject({ termijn: "na_einde", jaren: 7, totEindeJaar: true });
    expect(BEWAREN_NA_ACCOUNT_VERWIJDEREN.werkvergunning).toMatchObject({ termijn: "wav" });
    expect(BEWAREN_NA_ACCOUNT_VERWIJDEREN.verblijfsvergunning).toMatchObject({ termijn: "wav" });

    const pagina = bron("src/app/account-verwijderen/page.tsx").replace(/\s+/g, " ");
    expect(pagina).toMatch(/loonbelastingverklaring: 5 jaar na einde dienstverband/);
    expect(pagina).toMatch(/uw contract \(arbeidsovereenkomst of overeenkomst van opdracht\): tot 31 december van het zevende jaar/);
    expect(pagina).toMatch(/de kopie van uw identiteitsbewijs en uw werk- of verblijfsvergunning, tot 31 december van het vijfde jaar/);
    expect(pagina).toMatch(/facturen die wij namens u als zzp&apos;er opmaken en de gegevens van uw uitbetalingen: 7 jaar/);
    expect(pagina).toMatch(/Andere documenten die u heeft geüpload \(zoals VOG en KvK-uittreksel\) en uw profielfoto verwijderen wij/);
  });

  test("einde dienstverband en bewaar-tot", () => {
    expect(eindeDienstverband({ laatsteDienst: "2026-05-01", datumUitDienst: "2026-06-30", vandaag: "2026-10-24" })).toBe("2026-06-30");
    expect(eindeDienstverband({ laatsteDienst: "2026-09-01", datumUitDienst: "2026-06-30", vandaag: "2026-10-24" })).toBe("2026-09-01");
    // Een datum in de toekomst telt niet; zonder datums de dag van verwijderen.
    expect(eindeDienstverband({ laatsteDienst: null, datumUitDienst: "2027-01-01", vandaag: "2026-10-24" })).toBe("2026-10-24");
    expect(eindeDienstverband({ laatsteDienst: null, datumUitDienst: undefined, vandaag: "2026-10-24" })).toBe("2026-10-24");
    expect(bewaarTotNaEinde("2026-10-24", 5)).toBe("2031-10-24");
    expect(bewaarTotNaEinde("2024-02-29", 2)).toBe("2026-02-28");
    expect(bewaarTotEindeJaar("2026-01-15", 7)).toBe("2033-12-31");
    expect(() => bewaarTotNaEinde("kapot", 2)).toThrow();
    expect(() => bewaarTotEindeJaar("kapot", 2)).toThrow();
  });

  test("bewaar-tot per regel: contract 31-12 van jaar einde + 7, vergunning zoals de Wav-kopie", () => {
    const basis = { einde: "2026-06-30", laatsteDienst: "2026-05-01", vandaag: "2026-10-24" };
    const regel = (soort: string) => BEWAREN_NA_ACCOUNT_VERWIJDEREN[soort];
    expect(bewaarTotVoorDocument(regel("contract"), { ...basis, doc: { id: "c", document_type: "contract" } })).toBe("2033-12-31");
    expect(bewaarTotVoorDocument(regel("loonheffingsverklaring"), { ...basis, doc: { id: "l", document_type: "loonheffingsverklaring" } })).toBe("2031-06-30");
    // Vergunning: jaar laatste dienst + 5 (niet de datum uit dienst), nooit eerder dan de datum op de rij.
    expect(bewaarTotVoorDocument(regel("werkvergunning"), { ...basis, doc: { id: "w", document_type: "werkvergunning" } })).toBe("2031-12-31");
    expect(
      bewaarTotVoorDocument(regel("werkvergunning"), { ...basis, doc: { id: "w", document_type: "werkvergunning", bewaar_tot: "2033-12-31" } }),
    ).toBe("2033-12-31");
    // Zonder diensten vanaf de goedkeuring of upload.
    expect(
      bewaarTotVoorDocument(regel("verblijfsvergunning"), {
        ...basis,
        laatsteDienst: null,
        doc: { id: "v", document_type: "verblijfsvergunning", reviewed_at: "2024-03-01T10:00:00Z", uploaded_at: "2023-01-01T10:00:00Z" },
      }),
    ).toBe("2029-12-31");
  });

  test("retentie-cron (account bestaat nog): contract 7 jaar, vergunningen volgen elke nacht de Wav-termijn", () => {
    expect(bewaarTotBijUitDienst("contract", "2026-06-30")).toBe("2033-12-31");
    expect(bewaarTotBijUitDienst("loonheffingsverklaring", "2026-06-30")).toBe("2031-06-30");
    expect(bewaarTotBijUitDienst("vog", "2026-06-30")).toBe("2028-06-30");
    expect(bewaarTotBijUitDienst("kvk_uittreksel", "2026-06-30")).toBe("2028-06-30");
    expect(bewaarTotBijUitDienst(null, "2026-06-30")).toBe("2028-06-30");
    expect(bewaarTotBijUitDienst("werkvergunning", "2026-06-30")).toBeNull();
    expect(bewaarTotBijUitDienst("id_bewijs", "2026-06-30")).toBeNull();
    const retentie = bron("src/app/api/cron/retentie/route.ts");
    expect(retentie).toContain("bewaarTotBijUitDienst(");
    expect(retentie).toMatch(/\.not\("document_type", "in", `\(\$\{\["id_bewijs", \.\.\.WAV_VERGUNNINGEN\]/);
    expect(bron("src/lib/id-check/bewaartermijn.ts")).toMatch(/\.in\("document_type", \["id_bewijs", \.\.\.WAV_VERGUNNINGEN\]\)/);
  });

  const documenten = [
    { id: "1", document_type: "id_bewijs", file_path: "m1/id_bewijs_1.pdf" },
    { id: "2", document_type: "vog", file_path: "m1/vog_2.pdf" },
    { id: "3", document_type: "kvk", file_url: "m1/kvk_3.pdf" },
    { id: "4", document_type: "loonheffingsverklaring", file_path: "m1/loonheffingsverklaring_4.pdf", uploaded_at: "2025-01-01T00:00:00Z" },
    { id: "5", document_type: "contract", file_path: "m1/contract_5.pdf" },
    { id: "6", document_type: "werkvergunning", file_path: "m1/onboarding_aaaa.pdf", reviewed_at: "2025-02-01T10:00:00Z" },
    { id: "7", document_type: "id_bewijs", file_path: null, file_url: null },
    { id: "8", document_type: "overig", file_url: "https://elders.example/x.pdf" },
    { id: "9", document_type: "verblijfsvergunning", file_path: "m1/verblijfsvergunning_9.pdf", review_status: "afgekeurd" },
  ];
  const basis = { medewerkerId: "m1", einde: "2026-06-30", laatsteDienst: "2026-05-01", vandaag: "2026-10-24" };

  test("plan: wat weg mag en wat blijft, met losse bestanden uit de map (werknemer van buiten de EER)", () => {
    const plan = maakOpruimPlan({
      ...basis,
      eer: false,
      documenten,
      beschermd: ["m1/id_bewijs_0.pdf", "m1/vsh_9.pdf"],
      mapInhoud: [
        "m1/id_bewijs_1.pdf",
        "m1/id_bewijs_0.pdf", // Wav-kopie (id_wav_kopieen): blijft
        "m1/vog_2.pdf",
        "m1/vsh_7.pdf", // los bestand zonder rij, soort zonder termijn: weg
        "m1/vsh_9.pdf", // beschermd: blijft
        "m1/onboarding_bbbb.pdf", // onbekende soort: blijft
        "m1/loonheffingsverklaring_10.pdf", // soort met termijn zonder rij: blijft
        "m1/werkvergunning_12.pdf", // vergunning zonder rij: blijft
        "m1/id_bewijs_11.pdf", // ID zonder rij: niet hier
        "m2/vog_1.pdf", // andere werknemer: nooit
      ],
      profielfoto: ["m1/profile.jpg", "m1/profile.jpg", "m1/profile.png", "m2/profile.jpg"],
    });
    const docs = plan.verwijderen.find((b) => b.bucket === "medewerker-documenten")?.paden.sort();
    // Afgekeurde vergunning gaat weg, de goedgekeurde blijft.
    expect(docs).toEqual(["m1/kvk_3.pdf", "m1/verblijfsvergunning_9.pdf", "m1/vog_2.pdf", "m1/vsh_7.pdf"]);
    expect(plan.verwijderen.find((b) => b.bucket === PROFIELFOTO_BUCKET)?.paden.sort()).toEqual(["m1/profile.jpg", "m1/profile.png"]);
    expect(plan.bewaren).toEqual([
      { pad: "m1/loonheffingsverklaring_4.pdf", documentType: "loonheffingsverklaring", geuploadOp: "2025-01-01T00:00:00Z", bewaarTot: "2031-06-30" },
      { pad: "m1/contract_5.pdf", documentType: "contract", geuploadOp: null, bewaarTot: "2033-12-31" },
      { pad: "m1/onboarding_aaaa.pdf", documentType: "werkvergunning", geuploadOp: null, bewaarTot: "2031-12-31" },
    ]);
    const alleWeg = plan.verwijderen.flatMap((b) => b.paden);
    for (const b of plan.bewaren) expect(alleWeg).not.toContain(b.pad);
  });

  test("werknemer uit de EER/Zwitserland: vergunningen gaan weg; onbekend: blijven", () => {
    const eer = maakOpruimPlan({ ...basis, eer: true, documenten, beschermd: [], mapInhoud: null, profielfoto: [] });
    expect(eer.verwijderen[0].paden).toContain("m1/onboarding_aaaa.pdf");
    expect(eer.bewaren.map((b) => b.documentType)).toEqual(["loonheffingsverklaring", "contract"]);
    const onbekend = maakOpruimPlan({ ...basis, eer: null, documenten, beschermd: [], mapInhoud: null, profielfoto: [] });
    expect(onbekend.verwijderen[0].paden).not.toContain("m1/onboarding_aaaa.pdf");
    expect(onbekend.bewaren.map((b) => b.documentType)).toEqual(["loonheffingsverklaring", "contract", "werkvergunning"]);
  });

  test("map niet te lezen (of beschermde paden onbekend): alleen de bestanden van de documentrijen", () => {
    const plan = maakOpruimPlan({ ...basis, eer: false, documenten, beschermd: [], mapInhoud: null, profielfoto: [] });
    expect(plan.verwijderen).toEqual([{ bucket: "medewerker-documenten", paden: ["m1/vog_2.pdf", "m1/kvk_3.pdf", "m1/verblijfsvergunning_9.pdf"] }]);
  });

  test("een bestand dat ook bij een ID-bewijs of bewaard document hoort, gaat nooit weg", () => {
    const plan = maakOpruimPlan({
      ...basis,
      eer: true,
      documenten: [
        { id: "1", document_type: "overig", file_path: "m1/gedeeld.pdf" },
        { id: "2", document_type: "id_bewijs", file_path: "m1/gedeeld.pdf" },
        { id: "3", document_type: "vog", file_path: "m1/contract_5.pdf" },
        { id: "4", document_type: "contract", file_path: "m1/contract_5.pdf" },
      ],
      beschermd: [],
      mapInhoud: [],
      profielfoto: [],
    });
    expect(plan.verwijderen).toEqual([]);
    expect(plan.bewaren.map((b) => b.pad)).toEqual(["m1/contract_5.pdf"]);
  });

  test("rij voor bewaarde_documenten: alleen de witte lijst, naam ingekort", () => {
    const rij = bewaardDocumentRij({
      medewerkerId: "m1",
      naam: "x".repeat(250),
      bestand: { pad: "m1/contract_5.pdf", documentType: "contract", geuploadOp: null, bewaarTot: "2033-12-31" },
      einde: "2026-06-30",
      nu: "2026-10-24T10:00:00Z",
    });
    expect(Object.keys(rij).sort()).toEqual(
      ["bestand_pad", "bewaar_tot", "bijgewerkt_op", "bucket", "document_type", "einde_dienstverband", "geupload_op", "medewerker_id", "naam"].sort(),
    );
    expect((rij.naam as string).length).toBe(200);
    expect(rij.bucket).toBe("medewerker-documenten");
  });

  test("volgorde: paden verzamelen vóór de cascade, opslag pas ná een geslaagde delete", () => {
    const code = bron("src/lib/medewerker/account-verwijderen.ts");
    const voorbereiden = code.indexOf("await bereidBestandenVoorAccountVerwijderen(");
    const verwijderen = code.indexOf('from("medewerkers").delete()');
    const opruimen = code.indexOf("await verwijderAccountBestanden(");
    expect(voorbereiden).toBeGreaterThan(0);
    expect(verwijderen).toBeGreaterThan(voorbereiden);
    expect(opruimen).toBeGreaterThan(verwijderen);
    // Een fout bij het opruimen laat het verwijderen niet mislukken.
    expect(code.slice(opruimen)).toMatch(/\.catch\(/);
  });
});
