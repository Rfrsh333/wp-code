import { test, expect } from "@playwright/test";
import {
  AUTO_INTREKKEN_OPTIES,
  binnenDienst,
  effectieveAanmeldStatus,
  eigenTijdenToegestaan,
  geldendeTijden,
  geschatteVerdiensten,
  heeftVoorwaarden,
  intrekInfo,
  intrekMoment,
  isAutomatischIngetrokken,
  kledingVoorMail,
  klantUurtariefVoorAanmelding,
  LEGE_VOORWAARDEN,
  medewerkerTariefVanDienst,
  medewerkerUurtariefVoorAanmelding,
  parseKledingvoorschrift,
  parsePauzeMinuten,
  REACTIE_FOUTCODES,
  reactieUitBody,
  reactieVoorWerkgever,
  richtlijnBereik,
  tegenbodAdvies,
  valideerReactie,
  vooringevuldeUren,
  wijktAfVanGezien,
  type ReactieDienst,
} from "../../src/lib/medewerker/reactie-regels";
import { medewerkerUurtarief, verdienstenVanRegel } from "../../src/lib/medewerker/uren-regels";
import { nlMoment } from "../../src/lib/nl-tijd";
import { richtlijnVoorFunctie } from "../../src/lib/pricing/richtlijntarieven";

// Za 7 november 2026 (wintertijd, UTC+1), 14:00–22:00, klanttarief € 22 → medewerker € 18.
const dienst = (over: Partial<ReactieDienst> = {}): ReactieDienst => ({
  datum: "2026-11-07",
  start_tijd: "14:00:00",
  eind_tijd: "22:00:00",
  uurtarief: 22,
  kledingvoorschrift: null,
  ...over,
});
const NU = new Date("2026-11-01T10:00:00Z");

test.describe("tarief per aanmelding (tegenbod)", () => {
  test("zonder tegenbod geldt het tarief van de dienst", () => {
    expect(klantUurtariefVoorAanmelding(22, null)).toBe(22);
    expect(klantUurtariefVoorAanmelding(22, undefined)).toBe(22);
    expect(medewerkerUurtariefVoorAanmelding(22, null)).toBe(18);
    expect(klantUurtariefVoorAanmelding(null, null)).toBe(0);
  });

  test("tegenbod T: medewerker krijgt T, werkgever betaalt T + € 4", () => {
    expect(medewerkerUurtariefVoorAanmelding(22, 20)).toBe(20);
    expect(klantUurtariefVoorAanmelding(22, 20)).toBe(24);
    expect(klantUurtariefVoorAanmelding(22, 15.1)).toBe(19.1);
    // Ook lager dan de dienst kan (geen harde ondergrens).
    expect(klantUurtariefVoorAanmelding(22, 12.5)).toBe(16.5);
    // Ongeldig tegenbod (0, negatief, NaN) telt niet.
    expect(klantUurtariefVoorAanmelding(22, 0)).toBe(22);
    expect(klantUurtariefVoorAanmelding(22, -3)).toBe(22);
    expect(klantUurtariefVoorAanmelding(22, Number.NaN)).toBe(22);
  });

  test("verdiensten via de bestaande formule komen uit op het tegenbod", () => {
    // haalUrenRegistraties zet klant_uurtarief = tegenbod + 4; verdienstenVanRegel trekt 4 eraf.
    const klant = klantUurtariefVoorAanmelding(22, 15.1);
    // Op centen, zodat het scherm nooit "× €15.100000000000001" toont.
    expect(medewerkerUurtarief(klant)).toBe(15.1);
    const bedrag = verdienstenVanRegel({
      status: "klant_goedgekeurd",
      gewerkte_uren: 4,
      start_tijd: "10:00",
      eind_tijd: "14:00",
      datum: "2026-10-06", // dinsdag overdag, geen toeslag
      klant_uurtarief: klant,
    });
    expect(bedrag).toBeCloseTo(60.4, 6);
  });

  test("medewerkertarief van de dienst is nooit negatief", () => {
    expect(medewerkerTariefVanDienst(3)).toBe(0);
    expect(medewerkerTariefVanDienst(null)).toBe(0);
    expect(medewerkerTariefVanDienst(19.99)).toBe(15.99);
  });
});

test.describe("tijden per aanmelding", () => {
  test("eigen tijden gelden alleen als begin én eind gevuld zijn", () => {
    const d = { start_tijd: "14:00:00", eind_tijd: "22:00:00" };
    expect(geldendeTijden(d, null)).toEqual({ start_tijd: "14:00", eind_tijd: "22:00", eigen_tijden: false });
    expect(geldendeTijden(d, { voorgestelde_start_tijd: "16:00:00", voorgestelde_eind_tijd: "20:30:00" })).toEqual({
      start_tijd: "16:00",
      eind_tijd: "20:30",
      eigen_tijden: true,
    });
    expect(geldendeTijden(d, { voorgestelde_start_tijd: "16:00", voorgestelde_eind_tijd: null }).eigen_tijden).toBe(false);
  });

  test("binnen de dienst, ook over middernacht", () => {
    expect(binnenDienst("14:00", "22:00", "16:00", "20:00")).toBe(true);
    expect(binnenDienst("14:00", "22:00", "14:00", "22:00")).toBe(true);
    expect(binnenDienst("14:00", "22:00", "13:00", "20:00")).toBe(false);
    expect(binnenDienst("14:00", "22:00", "16:00", "23:00")).toBe(false);
    expect(binnenDienst("14:00", "22:00", "20:00", "16:00")).toBe(false);
    expect(binnenDienst("14:00", "22:00", "18:00", "18:00")).toBe(false);
    // Nachtdienst 22:00–06:00
    expect(binnenDienst("22:00", "06:00", "23:00", "04:00")).toBe(true);
    expect(binnenDienst("22:00", "06:00", "01:00", "06:00")).toBe(true);
    expect(binnenDienst("22:00", "06:00", "21:00", "23:00")).toBe(false);
    expect(binnenDienst("22:00", "06:00", "05:00", "07:00")).toBe(false);
  });

  test("eigen begintijd na middernacht niet toegestaan (datum, check-in en toeslag rekenen met de dienstdatum)", () => {
    expect(eigenTijdenToegestaan("22:00", "06:00", "23:00", "04:00")).toBe(true);
    expect(eigenTijdenToegestaan("22:00", "06:00", "00:30", "04:00")).toBe(false);
    expect(eigenTijdenToegestaan("14:00", "22:00", "16:00", "20:00")).toBe(true);
    const r = valideerReactie(
      { voorgestelde_start_tijd: "01:00", voorgestelde_eind_tijd: "05:00" },
      dienst({ start_tijd: "22:00", eind_tijd: "06:00" }),
      NU,
    );
    expect(!r.ok && r.code).toBe(REACTIE_FOUTCODES.ongeldigeTijden);
    const ok = valideerReactie(
      { voorgestelde_start_tijd: "23:00", voorgestelde_eind_tijd: "03:00" },
      dienst({ start_tijd: "22:00", eind_tijd: "06:00" }),
      NU,
    );
    expect(ok.ok).toBe(true);
  });

  test("± verdiensten: pauze eraf, nachtdienst goed", () => {
    expect(geschatteVerdiensten({ start_tijd: "14:00", eind_tijd: "22:00", pauze_minuten: 30, uurtarief: 18 })).toEqual({
      uren: 7.5,
      bedrag: 135,
    });
    expect(geschatteVerdiensten({ start_tijd: "22:00", eind_tijd: "02:00", uurtarief: 20 })).toEqual({ uren: 4, bedrag: 80 });
    expect(geschatteVerdiensten({ start_tijd: "", eind_tijd: "", uurtarief: 20 })).toEqual({ uren: 0, bedrag: 0 });
  });

  test("vooringevulde uren: geldende tijden + pauze van de dienst", () => {
    expect(vooringevuldeUren({ start_tijd: "14:00:00", eind_tijd: "22:00:00", pauze_minuten: 30 }, null)).toEqual({
      start: "14:00",
      eind: "22:00",
      pauze: 30,
    });
    expect(
      vooringevuldeUren({ start_tijd: "14:00", eind_tijd: "22:00", pauze_minuten: null }, { voorgestelde_start_tijd: "17:00", voorgestelde_eind_tijd: "21:00" }),
    ).toEqual({ start: "17:00", eind: "21:00", pauze: 0 });
  });
});

test.describe("valideerReactie", () => {
  test("oude app: alleen dienst_id → geen voorwaarden", () => {
    const r = valideerReactie({}, dienst(), NU);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.voorwaarden).toEqual(LEGE_VOORWAARDEN);
      expect(heeftVoorwaarden(r.voorwaarden)).toBe(false);
    }
  });

  test("oude app op een dienst met kledingvoorschrift → 422 met code en de tekst", () => {
    const r = valideerReactie({}, dienst({ kledingvoorschrift: "Zwarte broek, wit overhemd" }), NU);
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.status).toBe(422);
      expect(r.code).toBe(REACTIE_FOUTCODES.kledingAkkoordVereist);
      expect(r.kledingvoorschrift).toBe("Zwarte broek, wit overhemd");
      expect(r.error).toContain("Zwarte broek");
    }
    // "true" als tekst telt niet als akkoord.
    expect(valideerReactie({ kleding_akkoord: "true" }, dienst({ kledingvoorschrift: "Zwart" }), NU).ok).toBe(false);
  });

  test("akkoord kleding slaat het tijdstip op", () => {
    const r = valideerReactie({ kleding_akkoord: true }, dienst({ kledingvoorschrift: "Zwart" }), NU);
    expect(r.ok && r.voorwaarden.kleding_akkoord_op).toBe(NU.toISOString());
    // Zonder voorschrift wordt een akkoord niet opgeslagen.
    const zonder = valideerReactie({ kleding_akkoord: true }, dienst(), NU);
    expect(zonder.ok && zonder.voorwaarden.kleding_akkoord_op).toBeNull();
  });

  test("tegenbod: komma, afronding, gelijk aan dienst = geen tegenbod, tikfout geweigerd", () => {
    const met = valideerReactie({ voorgesteld_uurtarief: "19,955" }, dienst(), NU);
    expect(met.ok && met.voorwaarden.voorgesteld_uurtarief).toBe(19.96);
    const gelijk = valideerReactie({ voorgesteld_uurtarief: 18 }, dienst(), NU);
    expect(gelijk.ok && gelijk.voorwaarden.voorgesteld_uurtarief).toBeNull();
    for (const fout of [0, -1, "abc", 1000.01, 0.004, "0,001"]) {
      const r = valideerReactie({ voorgesteld_uurtarief: fout }, dienst(), NU);
      expect(r.ok).toBe(false);
      if (!r.ok) expect(r.code).toBe(REACTIE_FOUTCODES.ongeldigUurtarief);
    }
    // Onder het minimumloon mag (alleen een zachte waarschuwing in de UI).
    const laag = valideerReactie({ voorgesteld_uurtarief: 10 }, dienst(), NU);
    expect(laag.ok && laag.voorwaarden.voorgesteld_uurtarief).toBe(10);
  });

  test("eigen tijden: binnen de dienst, beide verplicht, hele dienst = geen eigen tijden", () => {
    const ok = valideerReactie({ voorgestelde_start_tijd: "16:00", voorgestelde_eind_tijd: "21:00" }, dienst(), NU);
    expect(ok.ok && [ok.voorwaarden.voorgestelde_start_tijd, ok.voorwaarden.voorgestelde_eind_tijd]).toEqual(["16:00", "21:00"]);
    const heel = valideerReactie({ voorgestelde_start_tijd: "14:00", voorgestelde_eind_tijd: "22:00" }, dienst(), NU);
    expect(heel.ok && heel.voorwaarden.voorgestelde_start_tijd).toBeNull();
    for (const invoer of [
      { voorgestelde_start_tijd: "16:00" },
      { voorgestelde_start_tijd: "13:00", voorgestelde_eind_tijd: "18:00" },
      { voorgestelde_start_tijd: "20:00", voorgestelde_eind_tijd: "16:00" },
      { voorgestelde_start_tijd: "25:00", voorgestelde_eind_tijd: "26:00" },
    ]) {
      const r = valideerReactie(invoer, dienst(), NU);
      expect(r.ok).toBe(false);
      if (!r.ok) expect(r.code).toBe(REACTIE_FOUTCODES.ongeldigeTijden);
    }
  });

  test("motivatie: getrimd, max. 500 tekens", () => {
    const r = valideerReactie({ motivatie: "  Ik heb 3 jaar bediening gedaan.  " }, dienst(), NU);
    expect(r.ok && r.voorwaarden.motivatie).toBe("Ik heb 3 jaar bediening gedaan.");
    expect(valideerReactie({ motivatie: "x".repeat(500) }, dienst(), NU).ok).toBe(true);
    const lang = valideerReactie({ motivatie: "x".repeat(501) }, dienst(), NU);
    expect(!lang.ok && lang.code).toBe(REACTIE_FOUTCODES.motivatieTeLang);
    const leeg = valideerReactie({ motivatie: "   " }, dienst(), NU);
    expect(leeg.ok && leeg.voorwaarden.motivatie).toBeNull();
  });

  test("automatisch intrekken: 12/24/48, uit = null, moment mag niet al voorbij zijn", () => {
    expect([...AUTO_INTREKKEN_OPTIES]).toEqual([12, 24, 48]);
    for (const uit of [null, undefined, "", 0, "0", false]) {
      const r = valideerReactie({ auto_intrekken_uren: uit }, dienst(), NU);
      expect(r.ok && r.voorwaarden.auto_intrekken_uren).toBeNull();
    }
    const r = valideerReactie({ auto_intrekken_uren: "24" }, dienst(), NU);
    expect(r.ok && r.voorwaarden.auto_intrekken_uren).toBe(24);
    const fout = valideerReactie({ auto_intrekken_uren: 6 }, dienst(), NU);
    expect(!fout.ok && fout.code).toBe(REACTIE_FOUTCODES.ongeldigIntrekmoment);
    // Dienst begint over 20 uur: 24 uur vooraf intrekken kan niet meer, 12 wel.
    const morgen = dienst({ datum: "2026-11-02", start_tijd: "07:00" }); // 06:00 UTC = 20 uur na NU
    const teLaat = valideerReactie({ auto_intrekken_uren: 24 }, morgen, NU);
    expect(!teLaat.ok && teLaat.code).toBe(REACTIE_FOUTCODES.intrekmomentVoorbij);
    expect(valideerReactie({ auto_intrekken_uren: 12 }, morgen, NU).ok).toBe(true);
  });

  test("reactievelden uit de body: hoogste niveau of in data", () => {
    expect(reactieUitBody({ dienst_id: "x", motivatie: "a", data: { motivatie: "b" } }).motivatie).toBe("a");
    expect(reactieUitBody({ action: "aanmelden", data: { auto_intrekken_uren: 12 } }).auto_intrekken_uren).toBe(12);
    expect(reactieUitBody(null)).toEqual({
      voorgesteld_uurtarief: undefined,
      voorgestelde_start_tijd: undefined,
      voorgestelde_eind_tijd: undefined,
      motivatie: undefined,
      kleding_akkoord: undefined,
      auto_intrekken_uren: undefined,
    });
  });
});

test.describe("automatisch intrekken (lazy check)", () => {
  const d = { datum: "2026-11-07", start_tijd: "14:00:00" };
  const start = nlMoment("2026-11-07", "14:00");

  test("intrekmoment = dienststart in NL-tijd min X uur", () => {
    expect(intrekMoment("2026-11-07", "14:00", 24).toISOString()).toBe("2026-11-06T13:00:00.000Z");
    // Zomertijd: 1 juli 14:00 NL = 12:00 UTC
    expect(intrekMoment("2026-07-01", "14:00", 12).toISOString()).toBe("2026-07-01T00:00:00.000Z");
  });

  test("alleen open reacties met een geldige keuze, vanaf het intrekmoment", () => {
    const vlakVoor = new Date(start.getTime() - 24 * 3600e3 - 1);
    const precies = new Date(start.getTime() - 24 * 3600e3);
    expect(isAutomatischIngetrokken({ status: "aangemeld", auto_intrekken_uren: 24 }, d, vlakVoor)).toBe(false);
    expect(isAutomatischIngetrokken({ status: "aangemeld", auto_intrekken_uren: 24 }, d, precies)).toBe(true);
    expect(isAutomatischIngetrokken({ status: "geaccepteerd", auto_intrekken_uren: 24 }, d, precies)).toBe(false);
    expect(isAutomatischIngetrokken({ status: "aangemeld", auto_intrekken_uren: null }, d, precies)).toBe(false);
    expect(isAutomatischIngetrokken({ status: "aangemeld", auto_intrekken_uren: 7 }, d, precies)).toBe(false);
    expect(isAutomatischIngetrokken({ status: "aangemeld", auto_intrekken_uren: 24 }, null, precies)).toBe(false);
  });

  test("effectieve status: verlopen reactie telt als geannuleerd", () => {
    const na = new Date(start.getTime() - 1000);
    expect(effectieveAanmeldStatus({ status: "aangemeld", auto_intrekken_uren: 12 }, d, na)).toBe("geannuleerd");
    expect(effectieveAanmeldStatus({ status: "aangemeld" }, d, na)).toBe("aangemeld");
    expect(effectieveAanmeldStatus({ status: "geaccepteerd", auto_intrekken_uren: 12 }, d, na)).toBe("geaccepteerd");
  });

  test("intrekInfo: reden en vlag voor de medewerker-API, ook vóór de cron", () => {
    const na = new Date(start.getTime() - 1000);
    // Lazy: de cron heeft nog niet gedraaid (reden nog leeg), toch al ingetrokken.
    expect(intrekInfo({ status: "aangemeld", auto_intrekken_uren: 12, annuleer_reden: null }, d, na)).toEqual({
      status: "geannuleerd",
      annuleer_reden: "automatisch_ingetrokken",
      automatisch_ingetrokken: true,
    });
    // Door de cron ingetrokken.
    expect(intrekInfo({ status: "geannuleerd", annuleer_reden: "automatisch_ingetrokken" }, d, na)).toEqual({
      status: "geannuleerd",
      annuleer_reden: "automatisch_ingetrokken",
      automatisch_ingetrokken: true,
    });
    // Zelf afgemeld of door de werkgever geannuleerd: wel geannuleerd, niet automatisch.
    expect(intrekInfo({ status: "geannuleerd", annuleer_reden: null }, d, na)).toEqual({
      status: "geannuleerd",
      annuleer_reden: null,
      automatisch_ingetrokken: false,
    });
    // Open reactie vóór het intrekmoment, en zonder migratie (velden ontbreken).
    const ruimVoor = new Date(start.getTime() - 48 * 3600e3);
    expect(intrekInfo({ status: "aangemeld", auto_intrekken_uren: 12 }, d, ruimVoor)).toEqual({
      status: "aangemeld",
      annuleer_reden: null,
      automatisch_ingetrokken: false,
    });
    expect(intrekInfo({ status: "geaccepteerd" }, d, na).automatisch_ingetrokken).toBe(false);
  });
});

test.describe("weergave voor de werkgever", () => {
  const dienstInfo = { datum: "2026-11-07", start_tijd: "14:00:00", eind_tijd: "22:00:00", uurtarief: 22, pauze_minuten: 30 };

  test("tegenbod + eigen tijden: wat de werkgever betaalt en ± kosten", () => {
    const r = reactieVoorWerkgever(
      {
        status: "aangemeld",
        voorgesteld_uurtarief: 20,
        voorgestelde_start_tijd: "16:00:00",
        voorgestelde_eind_tijd: "22:00:00",
        motivatie: " Ervaren barista ",
        kleding_akkoord_op: "2026-11-01T10:00:00.000Z",
        auto_intrekken_uren: 24,
      },
      dienstInfo,
      NU,
    );
    expect(r.klant_uurtarief).toBe(24);
    expect(r.dienst_uurtarief).toBe(22);
    expect(r.eigen_tarief).toBe(true);
    expect([r.start_tijd, r.eind_tijd, r.eigen_tijden]).toEqual(["16:00", "22:00", true]);
    expect(r.geschatte_uren).toBe(5.5);
    expect(r.geschatte_kosten).toBe(132);
    expect(r.motivatie).toBe("Ervaren barista");
    expect(r.intrekken_op).toBe("2026-11-06T13:00:00.000Z");
    expect(r.automatisch_ingetrokken).toBe(false);
    // Het tegenbod zelf (wat de medewerker krijgt) zit er niet in.
    expect(Object.keys(r)).not.toContain("voorgesteld_uurtarief");
  });

  test("zonder voorstel: dienst-tarief en -tijden; ingetrokken door de cron telt ook", () => {
    const r = reactieVoorWerkgever({ status: "geannuleerd", annuleer_reden: "automatisch_ingetrokken" }, dienstInfo, NU);
    expect([r.klant_uurtarief, r.eigen_tarief, r.eigen_tijden]).toEqual([22, false, false]);
    expect(r.automatisch_ingetrokken).toBe(true);
    expect(r.auto_intrekken_uren).toBeNull();
  });

  test("intrekmoment alleen bij een open reactie", () => {
    const gekozen = reactieVoorWerkgever({ status: "geaccepteerd", auto_intrekken_uren: 24 }, dienstInfo, NU);
    expect(gekozen.auto_intrekken_uren).toBe(24);
    expect(gekozen.intrekken_op).toBeNull();
    const verlopen = reactieVoorWerkgever({ status: "aangemeld", auto_intrekken_uren: 48 }, dienstInfo, new Date("2026-11-06T12:00:00Z"));
    expect(verlopen.automatisch_ingetrokken).toBe(true);
    expect(verlopen.intrekken_op).toBeNull();
  });

  test("accepteren met wat de werkgever zag", () => {
    const huidig = { klant_uurtarief: 24, start_tijd: "16:00", eind_tijd: "22:00" };
    expect(wijktAfVanGezien(huidig, undefined)).toBe(false);
    expect(wijktAfVanGezien(huidig, { klant_uurtarief: 24, start_tijd: "16:00:00" })).toBe(false);
    expect(wijktAfVanGezien(huidig, { klant_uurtarief: 22 })).toBe(true);
    expect(wijktAfVanGezien(huidig, { eind_tijd: "21:00" })).toBe(true);
  });
});

test.describe("tegenbod-advies (zacht)", () => {
  test("onder minimumloon en boven de dienst geven een waarschuwing, geen blokkade", () => {
    const laag = tegenbodAdvies(12, { dienstUurtarief: 22, functie: "bediening" });
    expect(laag.onderMinimumloon).toBe(true);
    expect(laag.klantUurtarief).toBe(16);
    expect(laag.waarschuwing).toContain("minimumloon");

    const hoog = tegenbodAdvies(21, { dienstUurtarief: 22 });
    expect(hoog.hogerDanDienst).toBe(true);
    expect(hoog.waarschuwing).toContain("€ 3,00 per uur meer");

    const gelijk = tegenbodAdvies(18, { dienstUurtarief: 22 });
    expect(gelijk.waarschuwing).toBeNull();

    const extreem = tegenbodAdvies(60, { dienstUurtarief: 22, functie: "afwas" });
    expect(extreem.bovenRichtlijn).toBe(true);
  });

  test("richtlijnBereik voor de medewerker-API: min/max/label van de functie, of null", () => {
    const volledig = richtlijnVoorFunctie("bediening")!;
    expect(richtlijnBereik("bediening")).toEqual({ min: volledig.min, max: volledig.max, label: volledig.label });
    // Aliassen zoals in de rest van de prijsregels.
    expect(richtlijnBereik("Ober")).toEqual(richtlijnBereik("bediening"));
    expect(richtlijnBereik("onbekende functie")).toBeNull();
    expect(richtlijnBereik(null)).toBeNull();
  });

  test("de app kan bovenRichtlijn narekenen: tegenbod + € 4 > richtlijn.max", () => {
    const r = richtlijnBereik("afwas")!;
    const net = Math.round((r.max - 4) * 100) / 100; // werkgever betaalt precies max
    expect(tegenbodAdvies(net, { functie: "afwas", dienstUurtarief: 22 }).bovenRichtlijn).toBe(false);
    expect(tegenbodAdvies(net + 0.01, { functie: "afwas", dienstUurtarief: 22 }).bovenRichtlijn).toBe(true);
    expect(net + 0.01 + 4 > r.max).toBe(true);
    // De waarschuwing noemt het label uit het veld.
    expect(tegenbodAdvies(net + 1, { functie: "afwas" }).waarschuwing).toContain(r.label.toLowerCase());
  });
});

test.describe("kledingvoorschrift en pauze op de dienst", () => {
  test("mail: nieuw veld, anders notities", () => {
    expect(kledingVoorMail({ kledingvoorschrift: "Zwart", notities: "Ingang achterom" })).toBe("Zwart");
    expect(kledingVoorMail({ kledingvoorschrift: "  ", notities: "Zwarte schoenen" })).toBe("Zwarte schoenen");
    expect(kledingVoorMail({})).toBeNull();
  });

  test("parse kledingvoorschrift", () => {
    expect(parseKledingvoorschrift(undefined)).toEqual({ ok: true, waarde: null });
    expect(parseKledingvoorschrift("  Zwart  ")).toEqual({ ok: true, waarde: "Zwart" });
    expect(parseKledingvoorschrift("x".repeat(501)).ok).toBe(false);
    expect(parseKledingvoorschrift(5).ok).toBe(false);
  });

  test("parse pauze: 0–240 minuten en korter dan de dienst", () => {
    expect(parsePauzeMinuten("")).toEqual({ ok: true, waarde: null });
    expect(parsePauzeMinuten("30")).toEqual({ ok: true, waarde: 30 });
    expect(parsePauzeMinuten(0)).toEqual({ ok: true, waarde: 0 });
    expect(parsePauzeMinuten(241).ok).toBe(false);
    expect(parsePauzeMinuten(12.5).ok).toBe(false);
    expect(parsePauzeMinuten(-5).ok).toBe(false);
    expect(parsePauzeMinuten(120, { start_tijd: "10:00", eind_tijd: "12:00" }).ok).toBe(false);
    expect(parsePauzeMinuten(30, { start_tijd: "22:00", eind_tijd: "02:00" }).ok).toBe(true);
  });
});
