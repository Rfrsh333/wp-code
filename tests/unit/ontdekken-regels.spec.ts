import { test, expect } from "@playwright/test";
import {
  GEEN_ONTDEK_FILTERS,
  parseOntdekFilters,
  parseVoorkeurSoort,
  pasOntdekFiltersToe,
  reactiesLabel,
  sorteerOntdek,
  type OntdekRegel,
} from "../../src/lib/medewerker/ontdekken-regels";
import { beschikbaarVoorDienst, dagSleutelVanDatum, maandagVan, tijdsblokkenVoorDienst } from "../../src/lib/medewerker/beschikbaarheid";

const params = (q: string) => new URLSearchParams(q);

const regel = (id: string, over: Partial<OntdekRegel> = {}): OntdekRegel & { id: string } => ({
  id,
  datum: "2026-10-24",
  start_tijd: "18:00:00",
  medewerker_uurtarief: 16,
  afstand_km: 10,
  werkgever_favoriet: false,
  werkgever_verborgen: false,
  ik_ben_favoriet: false,
  ...over,
});

test.describe("parseOntdekFilters", () => {
  test("zonder parameters: zoals voorheen (op datum, niets gefilterd)", () => {
    expect(parseOntdekFilters(params(""))).toEqual({ filters: GEEN_ONTDEK_FILTERS, ongeldig: [] });
  });

  test("alle filters", () => {
    const { filters, ongeldig } = parseOntdekFilters(
      params("max_afstand_km=25&min_uurtarief=16,50&alleen_favoriete_werkgevers=1&waar_ik_favoriet_ben=true&toon_verborgen=ja&sortering=afstand"),
    );
    expect(ongeldig).toEqual([]);
    expect(filters).toEqual({
      maxAfstandKm: 25,
      minUurtarief: 16.5,
      alleenFavorieteWerkgevers: true,
      waarIkFavorietBen: true,
      toonVerborgen: true,
      sortering: "afstand",
    });
  });

  test("ongeldige waarden worden genegeerd en gemeld", () => {
    const { filters, ongeldig } = parseOntdekFilters(params("max_afstand_km=0&min_uurtarief=veel&sortering=populair&alleen_favoriete_werkgevers=0"));
    expect(filters).toEqual(GEEN_ONTDEK_FILTERS);
    expect(ongeldig).toEqual(["max_afstand_km", "min_uurtarief", "sortering"]);
  });
});

test.describe("pasOntdekFiltersToe", () => {
  const lijst = [
    regel("dichtbij", { afstand_km: 4, medewerker_uurtarief: 15 }),
    regel("ver", { afstand_km: 40, medewerker_uurtarief: 20 }),
    regel("onbekend", { afstand_km: null, medewerker_uurtarief: 18 }),
    regel("favoriet", { werkgever_favoriet: true, afstand_km: 12 }),
    regel("ikfav", { ik_ben_favoriet: true, afstand_km: 8 }),
    regel("verborgen", { werkgever_verborgen: true }),
  ];
  const ids = (l: { id: string }[]) => l.map((r) => r.id);

  test("verborgen werkgevers vallen standaard weg, met toon_verborgen niet", () => {
    expect(ids(pasOntdekFiltersToe(lijst, GEEN_ONTDEK_FILTERS, true))).not.toContain("verborgen");
    expect(ids(pasOntdekFiltersToe(lijst, { ...GEEN_ONTDEK_FILTERS, toonVerborgen: true }, true))).toContain("verborgen");
  });

  test("max_afstand_km: alleen bekende afstand binnen de grens; zonder eigen locatie genegeerd", () => {
    const f = { ...GEEN_ONTDEK_FILTERS, maxAfstandKm: 10 };
    expect(ids(pasOntdekFiltersToe(lijst, f, true))).toEqual(["dichtbij", "ikfav"]);
    expect(ids(pasOntdekFiltersToe(lijst, f, false))).toHaveLength(5);
  });

  test("min_uurtarief op wat de medewerker krijgt", () => {
    expect(ids(pasOntdekFiltersToe(lijst, { ...GEEN_ONTDEK_FILTERS, minUurtarief: 18 }, true))).toEqual(["ver", "onbekend"]);
  });

  test("favoriete werkgevers en waar ik favoriet ben", () => {
    expect(ids(pasOntdekFiltersToe(lijst, { ...GEEN_ONTDEK_FILTERS, alleenFavorieteWerkgevers: true }, true))).toEqual(["favoriet"]);
    expect(ids(pasOntdekFiltersToe(lijst, { ...GEEN_ONTDEK_FILTERS, waarIkFavorietBen: true }, true))).toEqual(["ikfav"]);
  });
});

test.describe("sorteerOntdek", () => {
  const lijst = [
    regel("b", { datum: "2026-10-25", afstand_km: null, medewerker_uurtarief: 17 }),
    regel("a", { datum: "2026-10-24", start_tijd: "20:00", afstand_km: 30, medewerker_uurtarief: 15 }),
    regel("c", { datum: "2026-10-24", start_tijd: "09:00", afstand_km: 5, medewerker_uurtarief: 17 }),
  ];
  const ids = (l: { id: string }[]) => l.map((r) => r.id);

  test("datum (en begintijd) oplopend", () => expect(ids(sorteerOntdek(lijst, "datum"))).toEqual(["c", "a", "b"]));
  test("tarief: hoogste eerst, gelijk → eerst de vroegste", () => expect(ids(sorteerOntdek(lijst, "tarief"))).toEqual(["c", "b", "a"]));
  test("afstand: dichtstbij eerst, onbekend achteraan", () => expect(ids(sorteerOntdek(lijst, "afstand"))).toEqual(["c", "a", "b"]));
  test("laat de invoer ongemoeid", () => {
    sorteerOntdek(lijst, "afstand");
    expect(ids(lijst)).toEqual(["b", "a", "c"]);
  });
});

test.describe("labels en voorkeuren", () => {
  test("reactiesLabel", () => {
    expect(reactiesLabel(0)).toBeNull();
    expect(reactiesLabel(undefined)).toBeNull();
    expect(reactiesLabel(1)).toBe("1 reactie");
    expect(reactiesLabel(3)).toBe("3 reacties");
  });

  test("parseVoorkeurSoort", () => {
    expect(parseVoorkeurSoort("favoriet")).toBe("favoriet");
    expect(parseVoorkeurSoort("verborgen")).toBe("verborgen");
    expect(parseVoorkeurSoort("blokkeren")).toBeNull();
    expect(parseVoorkeurSoort(undefined)).toBeNull();
  });
});

test.describe("beschikbaarheid voor een dienst", () => {
  test("dagSleutelVanDatum en maandagVan, los van de tijdzone", () => {
    expect(dagSleutelVanDatum("2026-10-24")).toBe("za");
    expect(dagSleutelVanDatum("2026-10-25")).toBe("zo");
    expect(dagSleutelVanDatum("2026-10-26")).toBe("ma");
    expect(maandagVan("2026-10-24")).toBe("2026-10-19");
    expect(maandagVan("2026-10-25")).toBe("2026-10-19");
    expect(maandagVan("2026-10-26")).toBe("2026-10-26");
    expect(maandagVan("2027-01-01")).toBe("2026-12-28");
  });

  test("tijdsblokkenVoorDienst: overlap met de blokken van de Beschikbaarheid-pagina", () => {
    // ochtend 06–12, middag 12–18, avond 18–24, nacht 00–06
    expect(tijdsblokkenVoorDienst("09:00", "11:00")).toEqual(["ochtend"]);
    expect(tijdsblokkenVoorDienst("12:00:00", "16:00:00")).toEqual(["middag"]);
    expect(tijdsblokkenVoorDienst("17:30", "17:59")).toEqual(["middag"]);
    expect(tijdsblokkenVoorDienst("16:00", "23:00")).toEqual(["middag", "avond"]);
    expect(tijdsblokkenVoorDienst("18:00", "00:00")).toEqual(["avond"]);
    expect(tijdsblokkenVoorDienst("22:00", "03:00")).toEqual(["nacht", "avond"]);
    expect(tijdsblokkenVoorDienst("05:00", "07:00")).toEqual(["nacht", "ochtend"]);
    // Zonder eindtijd: het blok van de begintijd.
    expect(tijdsblokkenVoorDienst("17:00")).toEqual(["middag"]);
    expect(tijdsblokkenVoorDienst("onzin", "10:00")).toEqual([]);
  });

  test("beschikbaarVoorDienst: een dienst die een gekozen blok raakt telt", () => {
    const rooster = { vr: ["middag"] };
    // Vrijdag 23 oktober 2026.
    expect(beschikbaarVoorDienst({ rooster, datum: "2026-10-23", startTijd: "17:30", eindTijd: "22:00" })).toBe(true);
    expect(beschikbaarVoorDienst({ rooster, datum: "2026-10-23", startTijd: "18:00", eindTijd: "23:00" })).toBe(false);
    expect(beschikbaarVoorDienst({ rooster: { vr: ["avond"] }, datum: "2026-10-23", startTijd: "16:00", eindTijd: "23:00" })).toBe(true);
  });

  test("null als er niets is ingevuld", () => {
    expect(beschikbaarVoorDienst({ rooster: null, datum: "2026-10-24", startTijd: "18:00" })).toBeNull();
    expect(beschikbaarVoorDienst({ rooster: { ma: [], di: [] }, datum: "2026-10-24", startTijd: "18:00" })).toBeNull();
  });
});
