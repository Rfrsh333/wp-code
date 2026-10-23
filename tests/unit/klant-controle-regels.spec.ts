import { test, expect } from "@playwright/test";
import { beoordeelDienstPlaatsen, DIENST_STATUS_IN_CONTROLE, eersteDienstInControleMelding } from "../../src/lib/klant-controle-regels";

test.describe("eerste-dienstcontrole: mag de klant plaatsen, en met welke status", () => {
  test("e-mail niet bevestigd: niets plaatsen", () => {
    expect(beoordeelDienstPlaatsen({ emailBevestigd: false, gecontroleerd: true, demo: false })).toMatchObject({
      ok: false,
      status: 403,
      code: "email_niet_bevestigd",
    });
  });

  test("bevestigd maar nog niet gecontroleerd: in controle (geen push)", () => {
    expect(beoordeelDienstPlaatsen({ emailBevestigd: true, gecontroleerd: false, demo: false })).toEqual({
      ok: true,
      dienstStatus: DIENST_STATUS_IN_CONTROLE,
    });
  });

  test("gecontroleerd (door TopTalent aangemaakt/uitgenodigd of goedgekeurd): direct open", () => {
    expect(beoordeelDienstPlaatsen({ emailBevestigd: true, gecontroleerd: true, demo: false })).toEqual({ ok: true, dienstStatus: "open" });
  });

  test("demo-account (reviewer): altijd direct, geen controle", () => {
    expect(beoordeelDienstPlaatsen({ emailBevestigd: false, gecontroleerd: false, demo: true })).toEqual({ ok: true, dienstStatus: "open" });
  });

  test("status heet in_controle; medewerkers zien alleen open/vol", () => {
    expect(DIENST_STATUS_IN_CONTROLE).toBe("in_controle");
    expect(["open", "vol"]).not.toContain(DIENST_STATUS_IN_CONTROLE);
  });
});

test.describe("eerste-dienstcontrole: melding aan TopTalent", () => {
  const klant = { bedrijfsnaam: "Bistro <X>", contactpersoon: "Jan", email: "jan@x.nl", telefoon: "06", kvk_nummer: "12345678" };
  const dienst = { functie: "bediening", aantal_nodig: 2, datum: "2026-10-30", start_tijd: "18:00:00", eind_tijd: "23:00:00", locatie: "Utrecht", uurtarief: 27.5 };

  test("Telegram zonder persoonsgegevens", () => {
    const m = eersteDienstInControleMelding(klant, [dienst], "https://x/admin");
    expect(m.telegram).toContain("2026-10-30");
    expect(m.telegram).not.toContain("Bistro");
    expect(m.telegram).not.toContain("jan@x.nl");
  });

  test("mail met klant, KvK en dienst, ge-escaped", () => {
    const m = eersteDienstInControleMelding(klant, [dienst], "https://x/admin");
    expect(m.html).toContain("Bistro &lt;X&gt;");
    expect(m.html).toContain("12345678");
    expect(m.html).toContain("bediening (2x) op 2026-10-30, 18:00-23:00 in Utrecht");
    expect(m.html).toContain("€ 27,50 per uur");
  });
});
