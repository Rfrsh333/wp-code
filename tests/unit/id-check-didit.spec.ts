import { test, expect } from "@playwright/test";
import { controleerDiditHandtekening, maakDiditHeaders } from "../../src/lib/id-check/handtekening";
import {
  beoordeelDiditUitslag,
  controleerVervaldatum,
  idBewijsRijZonderBestand,
  idVerificatieUitBeslissing,
  isEerNationaliteit,
  kiesCallback,
  naamKomtOvereen,
  statusZonderBeslissing,
  verificatieUpdateNaBeoordeling,
  type DiditIdVerificatie,
} from "../../src/lib/id-check/regels";
import { heeftGeldigId, reageerChecklist, type ChecklistMedewerker } from "../../src/lib/medewerker/reageer-checklist";
import { isDiditActief, isDiditActiefVoor } from "../../src/lib/id-check/config";
import { OVEREENKOMST_VERSIE } from "../../src/content/overeenkomst-van-opdracht";

const GEHEIM = "whsec_test_geheim";
const NU = 1_790_000_000; // vaste "nu" in Unix-seconden
const vandaag = "2026-10-24";

function headers(waarden: Record<string, string>) {
  const lager = new Map(Object.entries(waarden).map(([k, v]) => [k.toLowerCase(), v]));
  return { get: (naam: string) => lager.get(naam.toLowerCase()) ?? null };
}

function webhookBody(extra: Record<string, unknown> = {}) {
  // Zoals Didit hem verstuurt: sort_keys, compact, ensure_ascii (raw X-Signature).
  return JSON.stringify({
    event_id: "evt-1",
    session_id: "11111111-2222-3333-4444-555555555555",
    status: "Approved",
    timestamp: NU,
    vendor_data: "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee",
    webhook_type: "status.updated",
    ...extra,
  });
}

test.describe("Didit-webhook: handtekening en tijdstempel", () => {
  test("geldige handtekening over de ruwe body wordt geaccepteerd", () => {
    const body = webhookBody();
    const h = maakDiditHeaders(body, GEHEIM, NU);
    expect(controleerDiditHandtekening({ ruweBody: body, headers: headers(h), geheim: GEHEIM, nuSeconden: NU })).toEqual({
      ok: true,
      variant: "raw",
    });
  });

  test("X-Signature-V2 (canonieke JSON) werkt als de ruwe variant ontbreekt", () => {
    // Zelfde inhoud, andere sleutelvolgorde en spaties: alleen V2 kan dit nog controleren.
    const origineel = webhookBody();
    const h = maakDiditHeaders(origineel, GEHEIM, NU);
    const hercodeerd = JSON.stringify(JSON.parse(origineel), null, 2);
    const uitslag = controleerDiditHandtekening({
      ruweBody: hercodeerd,
      headers: headers({ "X-Timestamp": h["X-Timestamp"], "X-Signature-V2": h["X-Signature-V2"] }),
      geheim: GEHEIM,
      nuSeconden: NU,
    });
    expect(uitslag).toEqual({ ok: true, variant: "v2" });
  });

  test("na het roteren van het geheim telt ook de -Previous-header", () => {
    const body = webhookBody();
    const oud = maakDiditHeaders(body, "oud_geheim", NU);
    const uitslag = controleerDiditHandtekening({
      ruweBody: body,
      headers: headers({ "X-Timestamp": String(NU), "X-Signature": "00".repeat(32), "X-Signature-Previous": oud["X-Signature"] }),
      geheim: "oud_geheim",
      nuSeconden: NU,
    });
    expect(uitslag.ok).toBe(true);
  });

  test("foute handtekening, ander geheim of aangepaste body wordt geweigerd", () => {
    const body = webhookBody();
    const h = maakDiditHeaders(body, GEHEIM, NU);
    expect(controleerDiditHandtekening({ ruweBody: body, headers: headers(h), geheim: "ander_geheim", nuSeconden: NU })).toEqual({
      ok: false,
      reden: "ongeldig",
    });
    const vervalst = webhookBody({ status: "Declined" });
    expect(controleerDiditHandtekening({ ruweBody: vervalst, headers: headers(h), geheim: GEHEIM, nuSeconden: NU })).toEqual({
      ok: false,
      reden: "ongeldig",
    });
    expect(
      controleerDiditHandtekening({
        ruweBody: body,
        headers: headers({ "X-Timestamp": String(NU), "X-Signature": "abc" }),
        geheim: GEHEIM,
        nuSeconden: NU,
      }),
    ).toEqual({ ok: false, reden: "ongeldig" });
    // X-Signature-Simple (dekt alleen de envelop) accepteren we niet.
    expect(
      controleerDiditHandtekening({
        ruweBody: body,
        headers: headers({ "X-Timestamp": String(NU), "X-Signature-Simple": h["X-Signature"] }),
        geheim: GEHEIM,
        nuSeconden: NU,
      }),
    ).toEqual({ ok: false, reden: "ongeldig" });
  });

  test("verlopen tijdstempel (meer dan 5 minuten) wordt geweigerd", () => {
    const body = webhookBody({ timestamp: NU - 301 });
    const h = maakDiditHeaders(body, GEHEIM, NU - 301);
    expect(controleerDiditHandtekening({ ruweBody: body, headers: headers(h), geheim: GEHEIM, nuSeconden: NU })).toEqual({
      ok: false,
      reden: "verlopen",
    });
    // Precies 300 seconden mag nog.
    const grens = webhookBody({ timestamp: NU - 300 });
    expect(
      controleerDiditHandtekening({ ruweBody: grens, headers: headers(maakDiditHeaders(grens, GEHEIM, NU - 300)), geheim: GEHEIM, nuSeconden: NU }).ok,
    ).toBe(true);
  });

  test("oude, geldig ondertekende body met een nieuwe X-Timestamp (replay) wordt geweigerd", () => {
    const oud = webhookBody({ timestamp: NU - 3600 });
    const h = maakDiditHeaders(oud, GEHEIM, NU - 3600);
    const replay = { ...h, "X-Timestamp": String(NU) };
    expect(controleerDiditHandtekening({ ruweBody: oud, headers: headers(replay), geheim: GEHEIM, nuSeconden: NU })).toEqual({
      ok: false,
      reden: "verlopen",
    });
  });

  test("zonder tijdstempel of zonder geheim: geweigerd", () => {
    const body = webhookBody();
    const h = maakDiditHeaders(body, GEHEIM, NU);
    expect(
      controleerDiditHandtekening({ ruweBody: body, headers: headers({ "X-Signature": h["X-Signature"] }), geheim: GEHEIM, nuSeconden: NU }),
    ).toEqual({ ok: false, reden: "geen_tijdstempel" });
    expect(controleerDiditHandtekening({ ruweBody: body, headers: headers(h), geheim: "", nuSeconden: NU })).toEqual({
      ok: false,
      reden: "geen_geheim",
    });
  });
});

const NL_PASPOORT: DiditIdVerificatie = {
  status: "Approved",
  document_type: "Passport",
  expiration_date: "2031-05-11",
  issuing_state: "NLD",
  nationality: "NLD",
  first_name: "Jan Pieter",
  last_name: "van der Berg",
};

function beoordeel(diditStatus: string, id: DiditIdVerificatie | null, naam = "Jan van der Berg") {
  return beoordeelDiditUitslag({ diditStatus, id, medewerkerNaam: naam, vandaag });
}

test.describe("Didit-uitslag: beslisregels (nooit automatisch afwijzen)", () => {
  test("Approved + EER + naam klopt + niet verlopen → automatisch goedgekeurd", () => {
    const b = beoordeel("Approved", NL_PASPOORT);
    expect(b.status).toBe("goedgekeurd");
    expect(b.redenen).toEqual([]);
    expect(b.velden).toEqual({
      vervaldatum: "2031-05-11",
      documentsoort: "Passport",
      uitgifteland: "NLD",
      eer: true,
      naam_komt_overeen: true,
    });
    // Ook een Belgische ID-kaart, en een Zwitser.
    expect(beoordeel("Approved", { ...NL_PASPOORT, document_type: "Identity Card", nationality: "BEL", issuing_state: "BEL" }).status).toBe(
      "goedgekeurd",
    );
    expect(beoordeel("Approved", { ...NL_PASPOORT, nationality: "CHE" }).status).toBe("goedgekeurd");
  });

  test("nationaliteit buiten EER/Zwitserland → handmatig", () => {
    const b = beoordeel("Approved", { ...NL_PASPOORT, nationality: "USA", issuing_state: "USA" });
    expect(b.status).toBe("handmatig");
    expect(b.redenen).toEqual(["niet_eer"]);
    expect(b.velden.eer).toBe(false);
    expect(beoordeel("Approved", { ...NL_PASPOORT, nationality: null }).redenen).toEqual(["nationaliteit_onbekend"]);
  });

  test("verlopen document → handmatig (gisteren verlopen telt, vandaag nog geldig)", () => {
    expect(beoordeel("Approved", { ...NL_PASPOORT, expiration_date: "2026-10-23" })).toMatchObject({
      status: "handmatig",
      redenen: ["verlopen"],
    });
    expect(beoordeel("Approved", { ...NL_PASPOORT, expiration_date: vandaag }).status).toBe("goedgekeurd");
    expect(beoordeel("Approved", { ...NL_PASPOORT, expiration_date: null }).redenen).toEqual(["geen_vervaldatum"]);
  });

  test("andere naam → handmatig", () => {
    const b = beoordeel("Approved", NL_PASPOORT, "Piet van der Berg");
    expect(b.status).toBe("handmatig");
    expect(b.redenen).toEqual(["naam_anders"]);
    expect(b.velden.naam_komt_overeen).toBe(false);
  });

  test("Declined of In Review van Didit → handmatig, met de reden", () => {
    expect(beoordeel("Declined", NL_PASPOORT)).toMatchObject({ status: "handmatig", redenen: ["didit_declined"] });
    expect(beoordeel("In Review", NL_PASPOORT)).toMatchObject({ status: "handmatig", redenen: ["didit_in_review"] });
    // Sessie Approved, maar de ID-stap zelf niet.
    expect(beoordeel("Approved", { ...NL_PASPOORT, status: "In Review" }).redenen).toEqual(["id_niet_goedgekeurd"]);
  });

  test("geen ID-gegevens of geen paspoort/ID-kaart → handmatig", () => {
    expect(beoordeel("Approved", null)).toMatchObject({ status: "handmatig", redenen: ["geen_gegevens"] });
    expect(beoordeel("Approved", { ...NL_PASPOORT, document_type: "Driver's License" }).redenen).toEqual(["documentsoort"]);
  });

  test("nooit 'afgewezen', wat Didit ook zegt", () => {
    const statussen = ["Approved", "Declined", "In Review", "Onbekend"];
    const varianten: (DiditIdVerificatie | null)[] = [
      NL_PASPOORT,
      null,
      { ...NL_PASPOORT, nationality: "SYR", expiration_date: "2001-01-01", first_name: "X", last_name: "Y", document_type: "Other" },
      { status: "Declined" },
    ];
    for (const s of statussen) {
      for (const v of varianten) {
        for (const naam of ["Jan van der Berg", "", "Iemand Anders"]) {
          const b = beoordeel(s, v, naam);
          expect(["goedgekeurd", "handmatig"]).toContain(b.status);
          expect(b.status).not.toBe("afgewezen");
          if (s !== "Approved") expect(b.status).toBe("handmatig");
        }
      }
    }
  });

  test("statussen zonder beslissing", () => {
    expect(statusZonderBeslissing("Not Started")).toBe("gestart");
    expect(statusZonderBeslissing("In Progress")).toBe("bezig");
    expect(statusZonderBeslissing("Resubmitted")).toBe("bezig");
    expect(statusZonderBeslissing("Expired")).toBe("verlopen");
    expect(statusZonderBeslissing("Abandoned")).toBe("verlopen");
    expect(statusZonderBeslissing("Kyc Expired")).toBe("verlopen");
    expect(statusZonderBeslissing("Approved")).toBeNull();
    expect(statusZonderBeslissing("KYC Expired")).toBeNull(); // hoofdlettergevoelig, zoals Didit
  });
});

test.describe("naam vergelijken: tolerant voor hoofdletters, accenten en tussenvoegsels", () => {
  const doc = { voornamen: "Jan Pieter", achternaam: "van der Berg" };

  test("zelfde naam in andere vorm", () => {
    expect(naamKomtOvereen(doc, "Jan van der Berg")).toBe(true);
    expect(naamKomtOvereen(doc, "JAN VAN DER BERG")).toBe(true);
    expect(naamKomtOvereen(doc, "Jan Berg")).toBe(true);
    expect(naamKomtOvereen(doc, "Berg, Jan van der")).toBe(true);
    expect(naamKomtOvereen(doc, "Jan Pieter van der Berg")).toBe(true);
    expect(naamKomtOvereen({ voornamen: "JOSÉ", achternaam: "MÜLLER" }, "Jose Muller")).toBe(true);
    expect(naamKomtOvereen({ voornamen: "Søren", achternaam: "Kierkegaard" }, "Soren Kierkegaard")).toBe(true);
    expect(naamKomtOvereen({ voornamen: "Anna", achternaam: "'t Hart" }, "Anna t Hart")).toBe(true);
    expect(naamKomtOvereen({ voornamen: "Liam", achternaam: "O'Brien" }, "Liam OBrien")).toBe(true);
    expect(naamKomtOvereen({ voornamen: "Mo", achternaam: "El-Amrani" }, "Mo el Amrani")).toBe(true);
  });

  test("andere persoon, roepnaam die niet op het ID staat of andere achternaam → false", () => {
    expect(naamKomtOvereen(doc, "Piet van der Berg")).toBe(false); // familielid
    expect(naamKomtOvereen(doc, "Jan de Vries")).toBe(false);
    expect(naamKomtOvereen({ voornamen: "Johannes", achternaam: "Jansen" }, "Hans Jansen")).toBe(false);
    expect(naamKomtOvereen(doc, "Jan Pieter Klaas van der Berg")).toBe(false); // extra naam in ons systeem
    expect(naamKomtOvereen({ voornamen: "Maria", achternaam: "García López" }, "Maria Garcia")).toBe(false);
    expect(naamKomtOvereen(doc, "")).toBe(false);
    expect(naamKomtOvereen({ voornamen: null, achternaam: "Berg" }, "Jan Berg")).toBe(false);
  });

  test("EER-nationaliteit", () => {
    expect(isEerNationaliteit("NLD")).toBe(true);
    expect(isEerNationaliteit("nld")).toBe(true);
    expect(isEerNationaliteit("NL")).toBe(true);
    expect(isEerNationaliteit("D")).toBe(true); // Duits paspoort (MRZ)
    expect(isEerNationaliteit("NOR")).toBe(true);
    expect(isEerNationaliteit("CHE")).toBe(true);
    expect(isEerNationaliteit("GBR")).toBe(false);
    expect(isEerNationaliteit("TUR")).toBe(false);
    expect(isEerNationaliteit(null)).toBeNull();
    expect(isEerNationaliteit("")).toBeNull();
  });
});

test.describe("privacy: een persoonsnummer/BSN uit de payload komt nergens in de opgeslagen rijen", () => {
  test("alleen de velden uit de witte lijst gaan de database in", () => {
    const BSN = "123456782";
    const beslissing = {
      session_id: "11111111-2222-3333-4444-555555555555",
      status: "Approved",
      id_verifications: [
        {
          status: "Approved",
          document_type: "Identity Card",
          document_number: "IXK1234567",
          personal_number: BSN,
          portrait_image: "https://media.example/portrait.jpg?sig=geheim",
          front_image: "https://media.example/front.jpg?sig=geheim",
          date_of_birth: "1990-05-12",
          expiration_date: "2031-05-11",
          date_of_issue: "2021-05-11",
          issuing_state: "NLD",
          nationality: "NLD",
          first_name: "Jan Pieter",
          last_name: "van der Berg",
          full_name: "Jan Pieter van der Berg",
          gender: "M",
          address: "Kerkstraat 1, 1234 AB Utrecht",
          place_of_birth: "Utrecht",
          mrz: { personal_number: BSN, document_number: "IXK1234567" },
          extra_fields: { bsn: BSN },
        },
      ],
    };

    const id = idVerificatieUitBeslissing(beslissing);
    expect(Object.keys(id ?? {}).sort()).toEqual(
      ["document_type", "expiration_date", "first_name", "issuing_state", "last_name", "nationality", "status"].sort(),
    );

    const beoordeling = beoordeelDiditUitslag({ diditStatus: "Approved", id, medewerkerNaam: "Jan van der Berg", vandaag });
    expect(beoordeling.status).toBe("goedgekeurd");

    const nu = "2026-10-24T10:00:00.000Z";
    const verificatieRij = verificatieUpdateNaBeoordeling({ beoordeling, diditStatus: "Approved", eventId: "evt-1", nu });
    const documentRij = idBewijsRijZonderBestand({
      medewerkerId: "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee",
      vervaldatum: beoordeling.velden.vervaldatum,
      methode: "didit",
      beoordeeldDoor: String(verificatieRij.beslist_door),
      nu,
    });

    const opgeslagen = JSON.stringify([verificatieRij, documentRij]);
    for (const verboden of [BSN, "IXK1234567", "1990-05-12", "Kerkstraat", "Utrecht", "Pieter", "Berg", "portrait", "media.example", "personal_number"]) {
      expect(opgeslagen).not.toContain(verboden);
    }
    // Wat er wel in staat.
    expect(verificatieRij).toMatchObject({
      status: "goedgekeurd",
      beslissing: "goedgekeurd",
      vervaldatum: "2031-05-11",
      documentsoort: "Identity Card",
      uitgifteland: "NLD",
      eer: true,
      naam_komt_overeen: true,
    });
    expect(documentRij).toMatchObject({
      document_type: "id_bewijs",
      review_status: "goedgekeurd",
      expiry_date: "2031-05-11",
      file_path: null,
      verificatie_methode: "didit",
    });
  });
});

test.describe("overig", () => {
  test("callback: alleen toptalent:// voor de app, anders de documentenpagina met slash", () => {
    const site = "https://www.toptalentjobs.nl";
    expect(kiesCallback(undefined, site)).toBe("https://www.toptalentjobs.nl/medewerker/documenten/");
    expect(kiesCallback("toptalent://id-check", site)).toBe("toptalent://id-check");
    expect(kiesCallback("https://evil.example/", site)).toBe("https://www.toptalentjobs.nl/medewerker/documenten/");
    expect(kiesCallback("javascript:alert(1)", site)).toBe("https://www.toptalentjobs.nl/medewerker/documenten/");
    expect(kiesCallback("toptalent://x?y=https://evil", site)).toBe("https://www.toptalentjobs.nl/medewerker/documenten/");
  });

  test("vervaldatum bij handmatig goedkeuren", () => {
    expect(controleerVervaldatum("2030-01-01", vandaag)).toBeNull();
    expect(controleerVervaldatum(vandaag, vandaag)).toBeNull();
    expect(controleerVervaldatum("2026-10-23", vandaag)).toMatch(/verlopen/);
    expect(controleerVervaldatum("2030-02-30", vandaag)).toMatch(/geldige/);
    expect(controleerVervaldatum("", vandaag)).toMatch(/geldige/);
    expect(controleerVervaldatum(null, vandaag)).toMatch(/geldige/);
  });

  test("checklist: ID zonder bestand (Didit/videocall) telt; met Didit aan andere teksten", () => {
    const compleet: ChecklistMedewerker = {
      kvk_nummer: "12345678",
      btw_nummer: "NL123456789B01",
      iban: "NL91ABNA0417164300",
      overeenkomst_akkoord_op: "2026-10-01T10:00:00Z",
      overeenkomst_akkoord_versie: OVEREENKOMST_VERSIE,
    };
    const viaDidit = { document_type: "id_bewijs", expiry_date: "2031-05-11", review_status: "goedgekeurd" };
    expect(heeftGeldigId([viaDidit], vandaag)).toBe(true);
    expect(reageerChecklist(compleet, [viaDidit], vandaag, { idCheck: { status: "goedgekeurd" } })[0].ok).toBe(true);

    const leeg = reageerChecklist(compleet, [], vandaag, { idCheck: { status: null } })[0];
    expect(leeg).toMatchObject({ ok: false, actie: { scherm: "documenten", label: "Controleer je ID" } });
    expect(leeg.uitleg).toMatch(/Controleer je ID/);
    expect(reageerChecklist(compleet, [], vandaag, { idCheck: { status: "handmatig" } })[0].uitleg).toMatch(/We controleren je ID/);
    expect(reageerChecklist(compleet, [], vandaag, { idCheck: { status: "videocall_gevraagd" } })[0].uitleg).toMatch(/videocall/);
    expect(reageerChecklist(compleet, [], vandaag, { idCheck: { status: "afgewezen" } })[0].uitleg).toMatch(/niet goedgekeurd/);

    // Zonder Didit: precies de oude teksten en knop.
    const oud = reageerChecklist(compleet, [], vandaag)[0];
    expect(oud.actie.label).toBe("Naar je documenten");
    expect(oud.uitleg).toMatch(/^Upload een geldig ID-bewijs/);
  });
});

test.describe("vlag ID_CHECK_DIDIT_ACTIEF", () => {
  const SLEUTELS = { DIDIT_API_KEY: "k", DIDIT_WEBHOOK_SECRET: "s", DIDIT_WORKFLOW_ID: "w" };
  const NAMEN = ["ID_CHECK_DIDIT_ACTIEF", ...Object.keys(SLEUTELS)];
  let bewaard: Record<string, string | undefined> = {};

  test.beforeEach(() => {
    bewaard = Object.fromEntries(NAMEN.map((n) => [n, process.env[n]]));
    Object.assign(process.env, SLEUTELS);
  });
  test.afterEach(() => {
    for (const [n, w] of Object.entries(bewaard)) {
      if (w === undefined) delete process.env[n];
      else process.env[n] = w;
    }
  });

  test("1: aan voor iedereen", () => {
    process.env.ID_CHECK_DIDIT_ACTIEF = "1";
    expect(isDiditActief()).toBe(true);
    expect(isDiditActiefVoor(false)).toBe(true);
    expect(isDiditActiefVoor(true)).toBe(true);
  });

  test("demo: alleen voor demo-accounts, webhook en admin wel aan", () => {
    process.env.ID_CHECK_DIDIT_ACTIEF = "demo";
    expect(isDiditActief()).toBe(true);
    expect(isDiditActiefVoor(false)).toBe(false);
    expect(isDiditActiefVoor(true)).toBe(true);
  });

  test("uit of zonder sleutels: voor niemand", () => {
    process.env.ID_CHECK_DIDIT_ACTIEF = "ja";
    expect(isDiditActief()).toBe(false);
    expect(isDiditActiefVoor(true)).toBe(false);
    process.env.ID_CHECK_DIDIT_ACTIEF = "demo";
    delete process.env.DIDIT_API_KEY;
    expect(isDiditActief()).toBe(false);
    expect(isDiditActiefVoor(true)).toBe(false);
  });
});
