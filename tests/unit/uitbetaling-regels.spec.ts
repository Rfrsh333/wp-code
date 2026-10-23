import { test, expect } from "@playwright/test";
import {
  berekenRegel,
  berekenTotalen,
  bouwZelffactuur,
  csvVeld,
  euroTekst,
  facturenCsv,
  kiesAdres,
  kwartaalGrenzen,
  kwartaalTotalen,
  kwartaalVan,
  leverancierBlokkades,
  medewerkerCode,
  naarCenten,
  plusWerkdagen,
  uitbetaalStatus,
  volgendVolgnummer,
  volgendeWerkdag,
  zelffactuurNummer,
  type UitbetaalBron,
} from "../../src/lib/uitbetaling/regels";
import { geldVeldenAdminData } from "../../src/lib/uitbetaling/admin-data-regels";
import { ZELFFACTURERING_VERSIE, zelffactureringTekst, TERMIJN_ONBEKEND } from "../../src/content/zelffacturering-akkoord";

/** Stap 6 "Geld": bedragen, btw/KOR, status, factuurnummering, kwartalen en CSV. */

const bron = (o: Partial<UitbetaalBron> = {}): UitbetaalBron => ({
  uren_registratie_id: "u1",
  datum: "2026-10-21", // woensdag
  werkgever: "Restaurant De Kroon",
  functie: "bediening",
  gewerkte_uren: 8,
  start_tijd: "10:00",
  eind_tijd: "18:00",
  reiskosten_km: 0,
  dienst_uurtarief: 24,
  voorgesteld_uurtarief: null,
  ...o,
});

test.describe("bedragen per dienst", () => {
  test("klanttarief − € 4, uren × tarief in centen", () => {
    const r = berekenRegel(bron());
    expect(r.uurtarief_centen).toBe(2000);
    expect(r.uren_centen).toBe(16000);
    expect(r.toeslag_centen).toBe(0);
    expect(r.bedrag_centen).toBe(16000);
    expect(r.omschrijving).toBe("Werkzaamheden bediening");
  });

  test("tegenbod van de medewerker gaat voor op het dienst-tarief", () => {
    const r = berekenRegel(bron({ voorgesteld_uurtarief: 22.5 }));
    expect(r.uurtarief_centen).toBe(2250);
    expect(r.uren_centen).toBe(18000);
  });

  test("afronding half naar boven zonder float-fouten (7,75 × € 15,10 = € 117,025 → € 117,03)", () => {
    const r = berekenRegel(bron({ gewerkte_uren: 7.75, dienst_uurtarief: 19.1 }));
    expect(r.uurtarief_centen).toBe(1510);
    expect(r.uren_centen).toBe(11703);
    expect(naarCenten(1.005)).toBe(101);
    expect(naarCenten(117.025)).toBe(11703);
    expect(naarCenten("12.30")).toBe(1230);
    expect(naarCenten(null)).toBe(0);
  });

  test("reiskosten € 0,21 per km bovenop de uren", () => {
    const r = berekenRegel(bron({ reiskosten_km: 37.5 }));
    expect(r.reiskosten_km).toBe(37.5);
    expect(r.reiskosten_centen).toBe(788); // 37,5 × 0,21 = 7,875 → 7,88
    expect(r.bedrag_centen).toBe(16000 + 788);
    expect(berekenRegel(bron({ reiskosten_km: -5 })).reiskosten_centen).toBe(0);
    expect(berekenRegel(bron({ reiskosten_km: "abc" })).reiskosten_centen).toBe(0);
  });

  test("toeslag (zondag 50%) over het medewerkertarief, net als de bestaande uitbetaalregel", () => {
    const r = berekenRegel(bron({ datum: "2026-10-25" })); // zondag
    expect(r.toeslag_centen).toBe(8000); // 8 × 20 × 50%
    expect(r.toeslag_omschrijving).toBe("Weekendtoeslag 50%");
    expect(r.bedrag_centen).toBe(24000);
  });

  test("nooit negatief tarief; 0 uur = € 0", () => {
    expect(berekenRegel(bron({ dienst_uurtarief: 3 })).uurtarief_centen).toBe(0);
    expect(berekenRegel(bron({ gewerkte_uren: null })).bedrag_centen).toBe(0);
  });
});

test.describe("btw en KOR", () => {
  test("21% btw één keer over het totaal, afgerond op centen", () => {
    const t = berekenTotalen([{ bedrag_centen: 16000 }, { bedrag_centen: 11703 }, { bedrag_centen: 788 }], false);
    expect(t.excl_centen).toBe(28491);
    expect(t.btw_percentage).toBe(21);
    expect(t.btw_centen).toBe(5983); // 284,91 × 21% = 59,8311 → 59,83
    expect(t.incl_centen).toBe(28491 + 5983);
    expect(berekenTotalen([{ bedrag_centen: 50 }], false).btw_centen).toBe(11); // 10,5 → 11 (half naar boven)
  });

  test("KOR: geen btw, totaal = excl.", () => {
    const t = berekenTotalen([{ bedrag_centen: 28491 }], true);
    expect(t).toEqual({ excl_centen: 28491, btw_percentage: 0, btw_centen: 0, incl_centen: 28491, kor: true });
  });
});

test.describe("factuurnummer per zzp'er", () => {
  const id = "1a2b3c4d-0000-4000-8000-000000000000";
  test("opeenvolgend, uniek per medewerker en SEPA-veilig", () => {
    expect(medewerkerCode(id)).toBe("1A2B3C4D");
    expect(zelffactuurNummer(id, 1)).toBe("ZF-1A2B3C4D-0001");
    expect(zelffactuurNummer(id, 12)).toBe("ZF-1A2B3C4D-0012");
    expect(zelffactuurNummer(id, 12345)).toBe("ZF-1A2B3C4D-12345");
    expect(zelffactuurNummer(id, 1)).not.toBe(zelffactuurNummer("9f8e7d6c-0000-4000-8000-000000000000", 1));
    expect(zelffactuurNummer(id, 9999).length).toBeLessThanOrEqual(35);
    expect(zelffactuurNummer(id, 3)).toMatch(/^[A-Z0-9-]+$/);
    expect(() => zelffactuurNummer(id, 0)).toThrow();
    expect(volgendVolgnummer(null)).toBe(1);
    expect(volgendVolgnummer(7)).toBe(8);
  });

  test("bouwZelffactuur: regels op datum, totalen en nummer", () => {
    const f = bouwZelffactuur({
      medewerkerId: id,
      volgnummer: 3,
      factuurDatum: "2026-10-23",
      kor: false,
      regels: [berekenRegel(bron({ uren_registratie_id: "b", datum: "2026-10-22" })), berekenRegel(bron({ uren_registratie_id: "a", datum: "2026-10-20" }))],
    });
    expect(f.factuur_nummer).toBe("ZF-1A2B3C4D-0003");
    expect(f.regels.map((r) => r.uren_registratie_id)).toEqual(["a", "b"]);
    expect(f.totalen.excl_centen).toBe(32000);
    expect(f.totalen.btw_centen).toBe(6720);
    expect(f.totalen.incl_centen).toBe(38720);
  });
});

test.describe("uitbetaalstatus (uitbetalen pas na betaling werkgever)", () => {
  const basis = { status: "gefactureerd", goedgekeurd_at: "2026-10-20T10:00:00Z", klant_factuur_status: "betaald", uitbetaling_status: null };
  test("alleen admin-goedgekeurd + klantfactuur betaald = uitbetaalbaar", () => {
    expect(uitbetaalStatus(basis)).toBe("uitbetaalbaar");
    expect(uitbetaalStatus({ ...basis, klant_factuur_status: "verzonden" })).toBe("wacht_op_betaling_werkgever");
    expect(uitbetaalStatus({ ...basis, klant_factuur_status: null })).toBe("wacht_op_betaling_werkgever");
    expect(uitbetaalStatus({ ...basis, status: "goedgekeurd", klant_factuur_status: null })).toBe("wacht_op_betaling_werkgever");
    expect(uitbetaalStatus({ ...basis, goedgekeurd_at: null })).toBe("wacht_op_goedkeuring");
  });
  test("al in een ronde of uitbetaald: nooit opnieuw uitbetaalbaar", () => {
    expect(uitbetaalStatus({ ...basis, uitbetaling_status: "in_uitbetaalronde" })).toBe("in_uitbetaalronde");
    expect(uitbetaalStatus({ ...basis, uitbetaling_status: "uitbetaald" })).toBe("uitbetaald");
  });
  test("niet goedgekeurde uren tellen niet mee", () => {
    for (const status of ["ingediend", "klant_goedgekeurd", "klant_aangepast", "afgewezen"]) {
      expect(uitbetaalStatus({ ...basis, status })).toBeNull();
    }
    expect(uitbetaalStatus({ ...basis, status: "goedgekeurd", goedgekeurd_at: null })).toBeNull();
  });
});

test.describe("datums en kwartalen", () => {
  test("werkdagen slaan weekend en feestdagen over", () => {
    expect(plusWerkdagen("2026-10-23", 1)).toBe("2026-10-26"); // vr → ma
    expect(plusWerkdagen("2026-10-23", 5)).toBe("2026-10-30");
    expect(plusWerkdagen("2026-12-24", 1)).toBe("2026-12-28"); // kerst + weekend
    expect(plusWerkdagen("2026-10-21", 0)).toBe("2026-10-21");
    expect(volgendeWerkdag("2026-10-24")).toBe("2026-10-26");
  });
  test("kwartaal op factuurdatum", () => {
    expect(kwartaalVan("2026-01-01")).toBe(1);
    expect(kwartaalVan("2026-03-31")).toBe(1);
    expect(kwartaalVan("2026-04-01")).toBe(2);
    expect(kwartaalVan("2026-12-31")).toBe(4);
    expect(kwartaalGrenzen(2026, 1)).toEqual({ start: "2026-01-01", eind: "2026-03-31" });
    expect(kwartaalGrenzen(2028, 1).eind).toBe("2028-03-31");
    expect(kwartaalGrenzen(2026, 4)).toEqual({ start: "2026-10-01", eind: "2026-12-31" });
  });
  test("totalen per kwartaal (btw-aangifte), alleen het gekozen jaar", () => {
    const totalen = kwartaalTotalen(
      [
        { factuur_datum: "2026-02-10", excl_centen: 10000, btw_centen: 2100, incl_centen: 12100 },
        { factuur_datum: "2026-03-31", excl_centen: 5000, btw_centen: 1050, incl_centen: 6050 },
        { factuur_datum: "2026-10-23", excl_centen: 7000, btw_centen: 0, incl_centen: 7000 },
        { factuur_datum: "2025-12-31", excl_centen: 99999, btw_centen: 0, incl_centen: 99999 },
      ],
      2026,
    );
    expect(totalen).toEqual([
      { kwartaal: 1, aantal: 2, excl_centen: 15000, btw_centen: 3150, incl_centen: 18150 },
      { kwartaal: 2, aantal: 0, excl_centen: 0, btw_centen: 0, incl_centen: 0 },
      { kwartaal: 3, aantal: 0, excl_centen: 0, btw_centen: 0, incl_centen: 0 },
      { kwartaal: 4, aantal: 1, excl_centen: 7000, btw_centen: 0, incl_centen: 7000 },
    ]);
  });
});

test.describe("CSV en opmaak", () => {
  test("euro-notatie", () => {
    expect(euroTekst(123456)).toBe("€ 1.234,56");
    expect(euroTekst(5)).toBe("€ 0,05");
    expect(euroTekst(-1050)).toBe("-€ 10,50");
  });
  test("kwartaal-CSV met puntkomma's, NL-bedragen, BOM en totaalregel", () => {
    const csv = facturenCsv([
      { factuur_nummer: "ZF-1A2B3C4D-0001", factuur_datum: "2026-10-02", excl_centen: 16000, btw_percentage: 21, btw_centen: 3360, incl_centen: 19360, kor: false, status: "uitbetaald", uitbetaald_op: "2026-10-05T09:00:00Z" },
      { factuur_nummer: "ZF-1A2B3C4D-0002", factuur_datum: "2026-10-20", excl_centen: 5000, btw_percentage: 0, btw_centen: 0, incl_centen: 5000, kor: true, status: "in_uitbetaalronde", uitbetaald_op: null },
    ]);
    expect(csv.charCodeAt(0)).toBe(0xfeff);
    const regels = csv.slice(1).trim().split("\r\n");
    expect(regels[0]).toBe("Factuurnummer;Factuurdatum;Bedrag excl. btw;Btw-tarief;Btw;Bedrag incl. btw;Status;Uitbetaald op");
    expect(regels[1]).toBe("ZF-1A2B3C4D-0001;2026-10-02;160,00;21%;33,60;193,60;Uitbetaald;2026-10-05");
    expect(regels[2]).toBe("ZF-1A2B3C4D-0002;2026-10-20;50,00;KOR (vrijgesteld);0,00;50,00;In uitbetaalronde;");
    expect(regels[3]).toBe("Totaal;;210,00;;33,60;243,60;;");
  });
  test("CSV-velden: quotes en formule-injectie", () => {
    expect(csvVeld('a;"b"')).toBe('"a;""b"""');
    expect(csvVeld("=HYPERLINK(1)")).toBe("'=HYPERLINK(1)");
    expect(csvVeld(null)).toBe("");
  });
});

test.describe("leveranciersgegevens en blokkades", () => {
  const goed = {
    naam: "Jan Jansen",
    adres: "Kerkstraat 1",
    stad: "Utrecht",
    kvk_nummer: "12345678",
    btw_nummer: "NL123456789B01",
    iban: "NL91ABNA0417164300",
    akkoord_op: "2026-10-01T10:00:00Z",
    akkoord_versie: ZELFFACTURERING_VERSIE,
  };
  test("compleet = geen blokkades", () => {
    expect(leverancierBlokkades(goed, ZELFFACTURERING_VERSIE)).toEqual([]);
  });
  test("geen of oud akkoord, ongeldig IBAN (ook niet-ontsleuteld) en ontbrekende NAW blokkeren", () => {
    expect(leverancierBlokkades({ ...goed, akkoord_op: null }, ZELFFACTURERING_VERSIE)).toEqual(["geen_akkoord"]);
    expect(leverancierBlokkades({ ...goed, akkoord_versie: "oud" }, ZELFFACTURERING_VERSIE)).toEqual(["geen_akkoord"]);
    expect(leverancierBlokkades({ ...goed, iban: "enc:v1:xyz" }, ZELFFACTURERING_VERSIE)).toEqual(["iban"]);
    expect(leverancierBlokkades({ ...goed, iban: null, adres: null, kvk_nummer: "123", btw_nummer: null }, ZELFFACTURERING_VERSIE)).toEqual([
      "iban",
      "adres",
      "kvk_nummer",
      "btw_nummer",
    ]);
  });
  test("factuuradres gaat voor als het volledig is", () => {
    expect(kiesAdres({ adres: "Thuis 1", postcode: "1000AA", stad: "Amsterdam", factuur_adres: "Kantoor 2", factuur_postcode: "3500AB", factuur_stad: "Utrecht" })).toEqual({
      adres: "Kantoor 2",
      postcode: "3500AB",
      stad: "Utrecht",
    });
    expect(kiesAdres({ adres: "Thuis 1", postcode: "1000AA", stad: "Amsterdam", factuur_adres: "Kantoor 2", factuur_stad: " " })).toEqual({
      adres: "Thuis 1",
      postcode: "1000AA",
      stad: "Amsterdam",
    });
  });
});

test.describe("generieke admin-route: geld-velden", () => {
  test("factuur op betaald vraagt een geld-rol en krijgt betaald_op", () => {
    const r = geldVeldenAdminData("facturen", { status: "betaald" });
    expect(r.vereistGeldRol).toBe(true);
    expect(typeof r.data?.betaald_op).toBe("string");
    expect(r.optioneel).toEqual(["betaald_op"]);
    expect(geldVeldenAdminData("facturen", { status: "verzonden" }).vereistGeldRol).toBe(false);
    expect(geldVeldenAdminData("facturen", { betaald_op: null }).vereistGeldRol).toBe(true);
  });
  test("goedgekeurd_at op uren vraagt een geld-rol; andere tabellen niet", () => {
    expect(geldVeldenAdminData("uren_registraties", { goedgekeurd_at: "2026-10-23" }).vereistGeldRol).toBe(true);
    expect(geldVeldenAdminData("uren_registraties", { opmerking: "x" }).vereistGeldRol).toBe(false);
    expect(geldVeldenAdminData("klanten", { status: "betaald" }).vereistGeldRol).toBe(false);
    expect(geldVeldenAdminData("facturen", undefined).vereistGeldRol).toBe(false);
  });
});

test.describe("akkoordtekst zelffacturering (concept)", () => {
  const basis = { naam: "Jan Jansen", kvk_nummer: "12345678", afnemer_naam: "TopTalent Jobs", afnemer_kvk: "73401161", contact_email: "facturen@toptalentjobs.nl" };
  test("vult termijn en gegevens in, niets blijft als {{…}} staan", () => {
    const t = zelffactureringTekst({ ...basis, termijn_werkdagen: 5 });
    const alles = t.secties.map((s) => s.tekst).join("\n");
    expect(t.versie).toBe("concept-1");
    expect(t.concept).toBe(true);
    expect(t.titel).toContain("CONCEPT");
    expect(alles).toContain("binnen 5 werkdagen nadat de werkgever");
    expect(alles).toContain("Factuur uitgereikt door afnemer");
    expect(alles).toContain("Jan Jansen (KvK 12345678)");
    expect(alles).not.toMatch(/\{\{/);
  });
  test("zonder ingestelde termijn verschijnt een duidelijke placeholder (niets verzonnen)", () => {
    const alles = zelffactureringTekst({ ...basis, termijn_werkdagen: null }).secties.map((s) => s.tekst).join("\n");
    expect(alles).toContain(TERMIJN_ONBEKEND);
  });
});
