import { test, expect } from "@playwright/test";
import {
  kiesDienstVoorFavoriet,
  magKlantAanmeldingWijzigen,
  parseUurtarief,
  schoonProfielUpdate,
  uurtariefFout,
  valideerUrenAanpassing,
} from "../../src/lib/klant-portaal-regels";

test.describe("klantportaal: aanmeldingsovergangen", () => {
  test("aangemeld mag naar geaccepteerd of afgewezen", () => {
    expect(magKlantAanmeldingWijzigen("aangemeld", "geaccepteerd")).toBe(true);
    expect(magKlantAanmeldingWijzigen("aangemeld", "afgewezen")).toBe(true);
  });

  test("geen herstel van geannuleerd/afgewezen en geen willekeurige statussen", () => {
    expect(magKlantAanmeldingWijzigen("geannuleerd", "geaccepteerd")).toBe(false);
    expect(magKlantAanmeldingWijzigen("afgewezen", "geaccepteerd")).toBe(false);
    expect(magKlantAanmeldingWijzigen("geaccepteerd", "geaccepteerd")).toBe(false);
    expect(magKlantAanmeldingWijzigen("uitgenodigd", "geaccepteerd")).toBe(false);
    expect(magKlantAanmeldingWijzigen("aangemeld", "bevestigd")).toBe(false);
    expect(magKlantAanmeldingWijzigen("aangemeld", "")).toBe(false);
    expect(magKlantAanmeldingWijzigen(null, "geaccepteerd")).toBe(false);
  });
});

test.describe("klantportaal: urenaanpassing", () => {
  test("dagdienst met pauze", () => {
    const r = valideerUrenAanpassing({ startTijd: "09:00", eindTijd: "17:30", pauzeMinuten: 30 });
    expect(r).toEqual({ ok: true, startTijd: "09:00", eindTijd: "17:30", pauzeMinuten: 30, uren: 8 });
  });

  test("nachtdienst over middernacht telt positief", () => {
    const r = valideerUrenAanpassing({ startTijd: "22:00", eindTijd: "03:00", pauzeMinuten: "0" });
    expect(r.ok && r.uren).toBe(5);
  });

  test("seconden in de tijd worden geaccepteerd en afgekapt", () => {
    const r = valideerUrenAanpassing({ startTijd: "18:00:00", eindTijd: "23:00:00", pauzeMinuten: "" });
    expect(r).toEqual({ ok: true, startTijd: "18:00", eindTijd: "23:00", pauzeMinuten: 0, uren: 5 });
  });

  test("ongeldige invoer wordt geweigerd", () => {
    expect(valideerUrenAanpassing({ startTijd: "25:00", eindTijd: "03:00" }).ok).toBe(false);
    expect(valideerUrenAanpassing({ startTijd: "9", eindTijd: "17:00" }).ok).toBe(false);
    expect(valideerUrenAanpassing({ startTijd: "09:00", eindTijd: "09:00" }).ok).toBe(false);
    expect(valideerUrenAanpassing({ startTijd: "09:00", eindTijd: "17:00", pauzeMinuten: -15 }).ok).toBe(false);
    expect(valideerUrenAanpassing({ startTijd: "09:00", eindTijd: "17:00", pauzeMinuten: 7.5 }).ok).toBe(false);
    expect(valideerUrenAanpassing({ startTijd: "09:00", eindTijd: "10:00", pauzeMinuten: 60 }).ok).toBe(false);
    expect(valideerUrenAanpassing({ startTijd: 900, eindTijd: "10:00" }).ok).toBe(false);
  });
});

test.describe("klantportaal: uurtarief", () => {
  test("parse met komma of punt", () => {
    expect(parseUurtarief("14,50")).toBe(14.5);
    expect(parseUurtarief("27.00")).toBe(27);
    expect(parseUurtarief(30)).toBe(30);
    expect(Number.isNaN(parseUurtarief(""))).toBe(true);
    expect(Number.isNaN(parseUurtarief("abc"))).toBe(true);
  });

  test("ondergrens en geldigheid", () => {
    expect(uurtariefFout(25, 25)).toBeNull();
    expect(uurtariefFout(24.99, 25)).toContain("minimale uurtarief");
    expect(uurtariefFout(NaN, 25)).not.toBeNull();
    expect(uurtariefFout(0, 0)).not.toBeNull();
    expect(uurtariefFout(5000, 25)).not.toBeNull();
    // zonder ingestelde ondergrens alleen positief
    expect(uurtariefFout(10, 0)).toBeNull();
  });
});

test.describe("klantportaal: favoriet uitnodigen", () => {
  const diensten = [
    { id: "a", functie: "bediening" },
    { id: "b", functie: "keuken" },
  ];

  test("één dienst: altijd die", () => {
    expect(kiesDienstVoorFavoriet(["bar"], [diensten[0]])).toBe("a");
  });

  test("meerdere diensten: functie-match, hoofdletterongevoelig", () => {
    expect(kiesDienstVoorFavoriet(["Keuken"], diensten)).toBe("b");
    expect(kiesDienstVoorFavoriet("bediening", diensten)).toBe("a");
  });

  test("meerdere diensten zonder match: niet gokken", () => {
    expect(kiesDienstVoorFavoriet(["afwas"], diensten)).toBeNull();
    expect(kiesDienstVoorFavoriet(null, diensten)).toBeNull();
    expect(kiesDienstVoorFavoriet(["bar"], [])).toBeNull();
  });
});

test.describe("klantportaal: profielupdate", () => {
  test("alleen whitelist-velden, getrimd en genormaliseerd", () => {
    const r = schoonProfielUpdate({
      contactpersoon: "  Jan  ",
      postcode: "1234ab",
      kvk_nummer: "1234 5678",
      status: "actief",
      klant_id: "x",
      email: "evil@example.com",
    });
    expect(r).toEqual({ ok: true, update: { contactpersoon: "Jan", postcode: "1234 AB", kvk_nummer: "12345678" } });
  });

  test("lege optionele velden worden null, contactpersoon is verplicht", () => {
    expect(schoonProfielUpdate({ telefoon: "" })).toEqual({ ok: true, update: { telefoon: null } });
    expect(schoonProfielUpdate({ contactpersoon: " " }).ok).toBe(false);
  });

  test("ongeldige waarden en lege update worden geweigerd", () => {
    expect(schoonProfielUpdate({ kvk_nummer: "123" }).ok).toBe(false);
    expect(schoonProfielUpdate({ postcode: "ABCD 12" }).ok).toBe(false);
    expect(schoonProfielUpdate({ telefoon: 123 }).ok).toBe(false);
    expect(schoonProfielUpdate({ status: "actief" }).ok).toBe(false);
  });
});
