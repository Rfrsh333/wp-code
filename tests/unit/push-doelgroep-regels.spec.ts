import { test, expect } from "@playwright/test";
import {
  functiePast,
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
    expect(redenGeenPush(medewerker({ functie: [] }), dienst())).toBe("functie");
    expect(redenGeenPush(medewerker({ functie: null }), dienst())).toBe("functie");
    // Dienst zonder functie past bij iedereen.
    expect(moetPushKrijgen(medewerker({ functie: ["keuken"] }), dienst({ functie: null }))).toBe(true);
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

  test("c. nachtdienst telt ook voor het blok nacht", () => {
    expect(moetPushKrijgen(medewerker({ rooster: { za: ["nacht"] } }), dienst({ startTijd: "23:00" }))).toBe(true);
    expect(redenGeenPush(medewerker({ rooster: { za: ["nacht"] } }), dienst({ startTijd: "18:00" }))).toBe("beschikbaarheid");
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

  test("synoniemen uit de richtlijntarieven (ober → bediening, barista → bar, kok → keuken)", () => {
    expect(functiePast(["ober"], "bediening")).toBe(true);
    expect(functiePast(["bediening"], "Serveerster")).toBe(true);
    expect(functiePast(["barista"], "bartender")).toBe(true);
    expect(functiePast(["kok"], "keuken")).toBe(true);
    expect(functiePast(["afwas"], "bediening")).toBe(false);
  });

  test("onbekende functie: alleen exact", () => {
    expect(functiePast(["promotie"], "promotie")).toBe(true);
    expect(functiePast(["promotie"], "hostess")).toBe(false);
  });

  test("dienst zonder functie past altijd; medewerker zonder functie past niet", () => {
    expect(functiePast([], null)).toBe(true);
    expect(functiePast(["bar"], "  ")).toBe(true);
    expect(functiePast([], "bar")).toBe(false);
    expect(functiePast(undefined, "bar")).toBe(false);
  });
});
