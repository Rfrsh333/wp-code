import { test, expect } from "@playwright/test";
import {
  BEOORDEEL_TERMIJN_DAGEN,
  OPMERKING_MAX,
  beoordeelUrl,
  beoordelenTot,
  binnenBeoordeelTermijn,
  eigenBeoordelingVoor,
  eigenBeoordelingenPerDienst,
  herinneringPush,
  isAfgerondVoorBeoordeling,
  parseWerkgeverBeoordeling,
  type AfgerondInvoer,
} from "../../src/lib/medewerker/werkgever-beoordeling-regels";

// 23-10-2026 20:00 in Nederland (zomertijd tot 25-10: UTC+2).
const NU = new Date("2026-10-23T18:00:00Z");

const invoer = (over: Partial<AfgerondInvoer> = {}, dienst: Partial<AfgerondInvoer["dienst"]> = {}): AfgerondInvoer => ({
  aanmelding_status: "geaccepteerd",
  uren_statussen: [],
  ...over,
  dienst: { datum: "2026-10-23", start_tijd: "12:00:00", eind_tijd: "18:00:00", status: "vol", ...dienst },
});

test.describe("isAfgerondVoorBeoordeling", () => {
  test("ingepland en de dienst is voorbij (NL-tijd)", () => {
    expect(isAfgerondVoorBeoordeling(invoer(), NU)).toBe(true);
    expect(isAfgerondVoorBeoordeling(invoer({ aanmelding_status: "bevestigd" }), NU)).toBe(true);
    expect(isAfgerondVoorBeoordeling(invoer({ aanmelding_status: "voltooid" }), NU)).toBe(true);
  });

  test("dienst nog bezig of in de toekomst: niet afgerond", () => {
    expect(isAfgerondVoorBeoordeling(invoer({}, { eind_tijd: "21:00:00" }), NU)).toBe(false);
    expect(isAfgerondVoorBeoordeling(invoer({}, { datum: "2026-10-24" }), NU)).toBe(false);
  });

  test("nachtdienst eindigt de volgende dag", () => {
    expect(isAfgerondVoorBeoordeling(invoer({}, { datum: "2026-10-23", start_tijd: "18:00:00", eind_tijd: "02:00:00" }), NU)).toBe(false);
    expect(isAfgerondVoorBeoordeling(invoer({}, { datum: "2026-10-22", start_tijd: "18:00:00", eind_tijd: "02:00:00" }), NU)).toBe(true);
  });

  test("uren ingediend telt als afgerond, ook als de eindtijd nog niet voorbij is", () => {
    for (const s of ["ingediend", "klant_aangepast", "klant_goedgekeurd", "goedgekeurd", "gefactureerd"]) {
      expect(isAfgerondVoorBeoordeling(invoer({ uren_statussen: [s] }, { eind_tijd: "21:00:00" }), NU)).toBe(true);
    }
    expect(isAfgerondVoorBeoordeling(invoer({ uren_statussen: ["afgewezen"] }, { eind_tijd: "21:00:00" }), NU)).toBe(false);
  });

  test("niet ingepland (aangemeld, afgewezen, geannuleerd) of dienst geannuleerd: niet afgerond", () => {
    for (const s of ["aangemeld", "uitgenodigd", "afgewezen", "geannuleerd", "vervangen"]) {
      expect(isAfgerondVoorBeoordeling(invoer({ aanmelding_status: s }), NU)).toBe(false);
    }
    expect(isAfgerondVoorBeoordeling(invoer({ uren_statussen: ["ingediend"] }, { status: "geannuleerd" }), NU)).toBe(false);
  });

  test("ontbrekende tijden: niet afgerond (behalve met uren)", () => {
    expect(isAfgerondVoorBeoordeling(invoer({}, { eind_tijd: null }), NU)).toBe(false);
    expect(isAfgerondVoorBeoordeling(invoer({ uren_statussen: ["ingediend"] }, { eind_tijd: null }), NU)).toBe(true);
  });
});

test.describe("termijn", () => {
  test(`beoordelen kan tot ${BEOORDEEL_TERMIJN_DAGEN} dagen na de dienst`, () => {
    expect(beoordelenTot("2026-10-09")).toBe("2026-10-23");
    expect(binnenBeoordeelTermijn("2026-10-09", "2026-10-23")).toBe(true);
    expect(binnenBeoordeelTermijn("2026-10-08", "2026-10-23")).toBe(false);
    expect(binnenBeoordeelTermijn("2026-10-23", "2026-10-23")).toBe(true);
  });

  test("een dienst in de toekomst of zonder datum valt erbuiten", () => {
    expect(binnenBeoordeelTermijn("2026-10-24", "2026-10-23")).toBe(false);
    expect(binnenBeoordeelTermijn(null, "2026-10-23")).toBe(false);
  });
});

test.describe("parseWerkgeverBeoordeling", () => {
  test("alleen sterren is genoeg; deelscores en opmerking zijn optioneel", () => {
    expect(parseWerkgeverBeoordeling({ score: 4 })).toEqual({
      ok: true,
      waarde: { score: 4, score_instructies: null, score_sfeer: null, score_zoals_beschreven: null, opmerking: null },
    });
  });

  test("alles ingevuld; getallen als tekst mogen ook", () => {
    const r = parseWerkgeverBeoordeling({ score: "5", score_instructies: 4, score_sfeer: "3", score_zoals_beschreven: 5, opmerking: "  Fijne ploeg.  " });
    expect(r).toEqual({ ok: true, waarde: { score: 5, score_instructies: 4, score_sfeer: 3, score_zoals_beschreven: 5, opmerking: "Fijne ploeg." } });
  });

  test("sterren verplicht, 1 tot 5, geheel getal", () => {
    for (const score of [undefined, null, "", 0, 6, 3.5, "vijf", true]) {
      const r = parseWerkgeverBeoordeling({ score });
      expect(r.ok).toBe(false);
      if (!r.ok) expect(r.veld).toBe("score");
    }
    expect(parseWerkgeverBeoordeling(null).ok).toBe(false);
  });

  test("ongeldige deelscore geeft een fout met het veld", () => {
    const r = parseWerkgeverBeoordeling({ score: 4, score_sfeer: 9 });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.veld).toBe("score_sfeer");
  });

  test("lege deelscore is gewoon niet ingevuld", () => {
    const r = parseWerkgeverBeoordeling({ score: 4, score_instructies: "", score_sfeer: null });
    expect(r.ok && r.waarde.score_instructies).toBeNull();
  });

  test(`opmerking: max. ${OPMERKING_MAX} tekens, stuurtekens weg, leeg wordt null`, () => {
    expect(parseWerkgeverBeoordeling({ score: 3, opmerking: "x".repeat(OPMERKING_MAX) }).ok).toBe(true);
    const te = parseWerkgeverBeoordeling({ score: 3, opmerking: "x".repeat(OPMERKING_MAX + 1) });
    expect(te.ok).toBe(false);
    if (!te.ok) expect(te.veld).toBe("opmerking");
    const r = parseWerkgeverBeoordeling({ score: 3, opmerking: "a\u0000b\nc" });
    expect(r.ok && r.waarde.opmerking).toBe("ab\nc");
    const leeg = parseWerkgeverBeoordeling({ score: 3, opmerking: "   " });
    expect(leeg.ok && leeg.waarde.opmerking).toBeNull();
    expect(parseWerkgeverBeoordeling({ score: 3, opmerking: 12 }).ok).toBe(false);
  });
});

test.describe("herinnering", () => {
  test("titel 'Hoe was het bij X?' en een link die het beoordelen opent", () => {
    const p = herinneringPush({ dienstId: "d-1", klantNaam: "Café De Proef", datum: "2026-10-22", functie: "Bediening" });
    expect(p.title).toBe("Hoe was het bij Café De Proef?");
    expect(p.body).toContain("bediening");
    expect(p.url).toBe(beoordeelUrl("d-1"));
    expect(p.url).toBe("/medewerker/diensten/?tab=voltooid&beoordeel=d-1");
    expect(p.tag).toBe("werkgever-beoordeling-d-1");
  });

  test("zonder naam of functie een nette tekst", () => {
    const p = herinneringPush({ dienstId: "d-2", klantNaam: "  ", datum: "2026-10-22", functie: null });
    expect(p.title).toBe("Hoe was het bij je werkgever?");
    expect(p.body.startsWith("Geef je dienst van")).toBe(true);
  });
});

test.describe("werkgever_beoordeling in de dienstdata", () => {
  test("per dienst { score }; zonder beoordeling null", () => {
    const perDienst = eigenBeoordelingenPerDienst([
      { dienst_id: "a", score: 4 },
      { dienst_id: "b", score: 5 },
    ]);
    expect(eigenBeoordelingVoor(perDienst, "a")).toEqual({ score: 4 });
    expect(eigenBeoordelingVoor(perDienst, "b")).toEqual({ score: 5 });
    expect(eigenBeoordelingVoor(perDienst, "c")).toBeNull();
    expect(eigenBeoordelingVoor(perDienst, null)).toBeNull();
    expect(eigenBeoordelingVoor(new Map(), "a")).toBeNull();
  });

  test("ongeldige rijen vallen weg", () => {
    const perDienst = eigenBeoordelingenPerDienst([
      { dienst_id: "a", score: 0 },
      { dienst_id: "b", score: "4" },
      { dienst_id: null, score: 3 },
      { dienst_id: "c", score: 3.5 },
    ]);
    expect(perDienst.size).toBe(0);
  });
});
