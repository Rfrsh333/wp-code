import { test, expect } from "@playwright/test";
import {
  functiePast,
  kiesOntvangers,
  moetPushKrijgen,
  moetPushKrijgenVoorEen,
  redenGeenPush,
  type PushDienst,
  type PushMedewerker,
} from "../../src/lib/medewerker/push-doelgroep-regels";

const UTRECHT = { lat: 52.096, lng: 5.116 };
const AMERSFOORT = { lat: 52.156, lng: 5.388 }; // ± 20 km van Utrecht
const AMSTERDAM = { lat: 52.373, lng: 4.893 }; // ± 34 km van Utrecht

// Zaterdag 24 oktober 2026, 18:00 (avond). Maandag van die week: 19 oktober.
const dienst = (over: Partial<PushDienst> = {}): PushDienst => ({
  klantId: "k1",
  functie: "bediening",
  datum: "2026-10-24",
  startTijd: "18:00",
  demo: false,
  locatie: AMERSFOORT,
  weekStart: "2026-10-19",
  ...over,
});

const medewerker = (over: Partial<PushMedewerker> = {}): PushMedewerker => ({
  id: "m1",
  status: "actief",
  functie: ["bediening", "bar"],
  demo: false,
  rooster: null,
  beschikbaarVanaf: null,
  locatie: UTRECHT,
  maxAfstandKm: null,
  verborgenKlantIds: new Set(),
  ...over,
});

test.describe("moetPushKrijgen", () => {
  test("alles klopt → push", () => {
    expect(moetPushKrijgen(medewerker(), dienst())).toBe(true);
    expect(redenGeenPush(medewerker(), dienst())).toBeNull();
  });

  test("alleen actieve medewerkers", () => {
    expect(redenGeenPush(medewerker({ status: "inactief" }), dienst())).toBe("niet_actief");
    expect(redenGeenPush(medewerker({ status: "gepauzeerd" }), dienst())).toBe("niet_actief");
    expect(redenGeenPush(medewerker({ status: null }), dienst())).toBe("niet_actief");
  });

  test("demo blijft gescheiden: demo-dienst alleen naar demo-medewerkers en omgekeerd", () => {
    expect(redenGeenPush(medewerker({ demo: true }), dienst())).toBe("andere_wereld");
    expect(redenGeenPush(medewerker(), dienst({ demo: true }))).toBe("andere_wereld");
    expect(moetPushKrijgen(medewerker({ demo: true }), dienst({ demo: true }))).toBe(true);
  });

  test("a. functie moet passen", () => {
    expect(redenGeenPush(medewerker({ functie: ["keuken"] }), dienst())).toBe("functie");
    expect(redenGeenPush(medewerker({ functie: ["keuken"] }), dienst({ functie: "bartending" }))).toBe("functie");
    expect(moetPushKrijgen(medewerker({ functie: ["bar"] }), dienst({ functie: "bartending" }))).toBe(true);
    // Medewerker zonder functie of dienst zonder (bekende) functie: wel sturen.
    expect(moetPushKrijgen(medewerker({ functie: [] }), dienst())).toBe(true);
    expect(moetPushKrijgen(medewerker({ functie: null }), dienst())).toBe(true);
    expect(moetPushKrijgen(medewerker({ functie: ["keuken"] }), dienst({ functie: null }))).toBe(true);
    expect(moetPushKrijgen(medewerker({ functie: ["keuken"] }), dienst({ functie: "catering" }))).toBe(true);
  });

  test("b. verborgen werkgever → geen push, andere werkgever wel", () => {
    const m = medewerker({ verborgenKlantIds: new Set(["k1"]) });
    expect(redenGeenPush(m, dienst())).toBe("verborgen");
    expect(moetPushKrijgen(m, dienst({ klantId: "k2" }))).toBe(true);
  });

  test("c. beschikbaarheid: alleen als ingevuld", () => {
    // Geen rooster → wel sturen.
    expect(moetPushKrijgen(medewerker({ rooster: null }), dienst())).toBe(true);
    // Vrije tekst uit de inschrijving telt niet als rooster.
    expect(moetPushKrijgen(medewerker({ rooster: "weekenden" }), dienst())).toBe(true);
    // Rooster met alleen lege dagen telt als niet ingevuld.
    expect(moetPushKrijgen(medewerker({ rooster: { ma: [], za: [] } }), dienst())).toBe(true);
    // Zaterdag avond beschikbaar → push; zaterdag alleen ochtend → geen push.
    expect(moetPushKrijgen(medewerker({ rooster: { za: ["avond"] } }), dienst())).toBe(true);
    expect(moetPushKrijgen(medewerker({ rooster: { Zaterdag: ["hele_dag"] } }), dienst())).toBe(true);
    expect(redenGeenPush(medewerker({ rooster: { za: ["ochtend"] } }), dienst())).toBe("beschikbaarheid");
    expect(redenGeenPush(medewerker({ rooster: { ma: ["avond"] } }), dienst())).toBe("beschikbaarheid");
    // Beschikbaar vanaf na de dienstdatum → geen push.
    expect(redenGeenPush(medewerker({ beschikbaarVanaf: "2026-11-01" }), dienst())).toBe("beschikbaarheid");
    expect(moetPushKrijgen(medewerker({ beschikbaarVanaf: "2026-10-24" }), dienst())).toBe(true);
  });

  test("c. weekoverride gaat voor het vaste rooster; een lege override = die week niet", () => {
    const overrides = new Map<string, unknown>([["2026-10-19", { za: [] }]]);
    expect(redenGeenPush(medewerker({ rooster: { za: ["avond"] }, overrides }), dienst())).toBe("beschikbaarheid");
    const welBeschikbaar = new Map<string, unknown>([["2026-10-19", { za: ["avond"] }]]);
    expect(moetPushKrijgen(medewerker({ rooster: { ma: ["ochtend"] }, overrides: welBeschikbaar }), dienst())).toBe(true);
    // Override voor een andere week telt niet.
    const andereWeek = new Map<string, unknown>([["2026-10-26", { za: [] }]]);
    expect(moetPushKrijgen(medewerker({ rooster: { za: ["avond"] }, overrides: andereWeek }), dienst())).toBe(true);
  });

  test("c. tijdsblokken: overlap van de hele dienst, nacht na middernacht", () => {
    expect(moetPushKrijgen(medewerker({ rooster: { za: ["nacht"] } }), dienst({ startTijd: "23:00", eindTijd: "03:00" }))).toBe(true);
    expect(redenGeenPush(medewerker({ rooster: { za: ["nacht"] } }), dienst({ startTijd: "18:00", eindTijd: "23:00" }))).toBe("beschikbaarheid");
    // Middag loopt tot 18:00 (zoals de Beschikbaarheid-pagina): een dienst vanaf 17:30 telt.
    expect(moetPushKrijgen(medewerker({ rooster: { za: ["middag"] } }), dienst({ startTijd: "17:30", eindTijd: "22:00" }))).toBe(true);
    // Avond-medewerker en een dienst van 16 tot 23 uur.
    expect(moetPushKrijgen(medewerker({ rooster: { za: ["avond"] } }), dienst({ startTijd: "16:00", eindTijd: "23:00" }))).toBe(true);
  });

  test("d. maximale afstand: alleen als ingesteld én beide locaties bekend", () => {
    // Geen grens → altijd.
    expect(moetPushKrijgen(medewerker({ maxAfstandKm: null }), dienst({ locatie: AMSTERDAM }))).toBe(true);
    // Binnen 25 km: Amersfoort ja, Amsterdam nee.
    expect(moetPushKrijgen(medewerker({ maxAfstandKm: 25 }), dienst({ locatie: AMERSFOORT }))).toBe(true);
    expect(redenGeenPush(medewerker({ maxAfstandKm: 25 }), dienst({ locatie: AMSTERDAM }))).toBe("afstand");
    // Locatie van de dienst of de medewerker onbekend → wel sturen.
    expect(moetPushKrijgen(medewerker({ maxAfstandKm: 5 }), dienst({ locatie: null }))).toBe(true);
    expect(moetPushKrijgen(medewerker({ maxAfstandKm: 5, locatie: null }), dienst({ locatie: AMSTERDAM }))).toBe(true);
  });

  test("meerdere diensten in één aanvraag: push als er minstens één past", () => {
    const m = medewerker({ functie: ["keuken"] });
    expect(moetPushKrijgenVoorEen(m, [dienst({ functie: "bediening" }), dienst({ functie: "keuken" })])).toBe(true);
    expect(moetPushKrijgenVoorEen(m, [dienst({ functie: "bediening" }), dienst({ functie: "bar" })])).toBe(false);
    expect(moetPushKrijgenVoorEen(m, [])).toBe(false);
  });
});

test.describe("functiePast", () => {
  test("hoofdletterongevoelig, ook een losse tekst", () => {
    expect(functiePast(["Bediening"], "bediening")).toBe(true);
    expect(functiePast("bar", "Bar")).toBe(true);
    expect(functiePast(["  keuken "], "KEUKEN")).toBe(true);
  });

  test("barista hoort bij bar én bediening", () => {
    expect(functiePast(["bar"], "barista")).toBe(true);
    expect(functiePast(["bediening"], "barista")).toBe(true);
    expect(functiePast(["keuken"], "barista")).toBe(false);
  });

  test("hoofdfunctie van de medewerker tegen de functies uit platform_options", () => {
    // Medewerkers: bediening | bar | keuken | afwas (candidate-to-medewerker, admin-formulier).
    expect(functiePast(["bar"], "bartending")).toBe(true);
    expect(functiePast(["keuken"], "hulpkok")).toBe(true);
    expect(functiePast(["keuken"], "zelfstandig werkend kok")).toBe(true);
    expect(functiePast(["afwas"], "spoelkeuken medewerker")).toBe(true);
    expect(functiePast(["bediening"], "hosting")).toBe(true);
    expect(functiePast(["bediening"], "runner")).toBe(true);
    expect(functiePast(["bediening"], "Gastheer / gastvrouw")).toBe(true);
    expect(functiePast(["bediening"], "Serveerster")).toBe(true);
    // Andere groep: geen push.
    expect(functiePast(["bediening"], "bartending")).toBe(false);
    expect(functiePast(["afwas"], "hulpkok")).toBe(false);
    expect(functiePast(["bar", "keuken"], "bediening")).toBe(false);
  });

  test("synoniemen ook aan de kant van de medewerker", () => {
    expect(functiePast(["ober"], "bediening")).toBe(true);
    expect(functiePast(["barista"], "bartender")).toBe(true);
    expect(functiePast(["kok"], "keuken")).toBe(true);
  });

  test("onbekende dienstfunctie (buiten de vier groepen) past bij iedereen", () => {
    expect(functiePast(["bediening"], "catering")).toBe(true);
    expect(functiePast(["afwas"], "garderobe")).toBe(true);
    expect(functiePast(["bar"], "festivalmedewerker")).toBe(true);
  });

  test("dienst zonder functie of medewerker zonder functie: past", () => {
    expect(functiePast([], null)).toBe(true);
    expect(functiePast(["bar"], "  ")).toBe(true);
    expect(functiePast([], "bar")).toBe(true);
    expect(functiePast(undefined, "bar")).toBe(true);
  });
});

test.describe("kiesOntvangers (met de functienamen van prod, 23-10-2026)", () => {
  // medewerkers.functie op prod: bar (1), bediening (3).
  const team = [
    medewerker({ id: "bar1", functie: ["bar"] }),
    medewerker({ id: "bed1", functie: ["bediening"] }),
    medewerker({ id: "bed2", functie: ["bediening"] }),
    medewerker({ id: "bed3", functie: ["bediening"] }),
  ];
  const ids = (r: { ids: string[] }) => [...r.ids].sort();

  test("barista: bar én bediening", () => {
    const r = kiesOntvangers(team, [dienst({ functie: "barista" })]);
    expect(ids(r)).toEqual(["bar1", "bed1", "bed2", "bed3"]);
    expect(r.functieTerugval).toBe(0);
  });

  test("bediening: alleen bediening", () => {
    const r = kiesOntvangers(team, [dienst({ functie: "bediening" })]);
    expect(ids(r)).toEqual(["bed1", "bed2", "bed3"]);
    expect(r.redenen).toEqual({ functie: 1 });
  });

  test("catering, sitecrew - hospitality en schoonmaak: buiten de groepen, dus iedereen", () => {
    for (const functie of ["catering", "sitecrew - hospitality", "schoonmaak", "Sitecrew - Hospitality"]) {
      expect(ids(kiesOntvangers(team, [dienst({ functie })]))).toEqual(["bar1", "bed1", "bed2", "bed3"]);
    }
  });

  test("terugval: past op functie niemand, dan iedereen die de andere filters doorstaat", () => {
    // Geen keukenmedewerkers op prod: een hulpkok-dienst zou anders stil blijven.
    const r = kiesOntvangers(team, [dienst({ functie: "hulpkok" })]);
    expect(ids(r)).toEqual(["bar1", "bed1", "bed2", "bed3"]);
    expect(r.functieTerugval).toBe(1);
  });

  test("terugval houdt verborgen, beschikbaarheid, afstand, wereld en actief aan", () => {
    const anders = [
      medewerker({ id: "bar1", functie: ["bar"], verborgenKlantIds: new Set(["k1"]) }),
      medewerker({ id: "bed1", functie: ["bediening"], rooster: { za: ["ochtend"] } }),
      medewerker({ id: "bed2", functie: ["bediening"], maxAfstandKm: 5 }),
      medewerker({ id: "bed3", functie: ["bediening"] }),
      medewerker({ id: "demo1", functie: ["bediening"], demo: true }),
      medewerker({ id: "weg1", functie: ["bediening"], status: "inactief" }),
    ];
    const r = kiesOntvangers(anders, [dienst({ functie: "hulpkok" })]);
    expect(ids(r)).toEqual(["bed3"]);
    expect(r.functieTerugval).toBe(1);
  });

  test("geen terugval als er wel iemand op functie past", () => {
    const r = kiesOntvangers(team, [dienst({ functie: "bartending" })]);
    expect(ids(r)).toEqual(["bar1"]);
    expect(r.functieTerugval).toBe(0);
  });

  test("past niemand, ook niet zonder functiefilter, dan niemand", () => {
    const allemaalVerborgen = team.map((m) => ({ ...m, verborgenKlantIds: new Set(["k1"]) }));
    const r = kiesOntvangers(allemaalVerborgen, [dienst({ functie: "hulpkok" })]);
    expect(r.ids).toEqual([]);
    expect(r.functieTerugval).toBe(0);
    expect(r.redenen).toEqual({ functie: 4 });
  });

  test("meerdere diensten in één aanvraag: per dienst, samengevoegd", () => {
    const r = kiesOntvangers(team, [dienst({ functie: "bartending" }), dienst({ functie: "hulpkok" })]);
    expect(ids(r)).toEqual(["bar1", "bed1", "bed2", "bed3"]);
    expect(r.functieTerugval).toBe(1);
  });
});
