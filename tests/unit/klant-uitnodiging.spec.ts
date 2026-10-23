import { test, expect } from "@playwright/test";
import {
  beoordeelUitnodiging,
  KLANT_UITNODIGING_GELDIG_MS,
  letterlijkLikePatroon,
  moetBestaandeKlantUitnodigen,
  statusNaDienstInplannen,
  uitnodigingMailInhoud,
  uitnodigingUrl,
} from "../../src/lib/klant-uitnodiging-regels";

// Resetlink van "wachtwoord vergeten" (lib/klant-password-reset.ts, KLANT_RESET_GELDIG_MS).
const KLANT_RESET_GELDIG_MS = 2 * 60 * 60 * 1000;

test.describe("klant-uitnodiging: wie mag een uitnodiging krijgen", () => {
  test("actieve klant met e-mail: ja, status blijft", () => {
    expect(beoordeelUitnodiging({ email: "jan@bistro.nl", status: "actief" })).toEqual({ ok: true, zetActief: false });
  });

  test("klant zonder status (oude omgezette lead): ja, en wordt actief", () => {
    expect(beoordeelUitnodiging({ email: "jan@bistro.nl", status: null })).toEqual({ ok: true, zetActief: true });
    expect(beoordeelUitnodiging({ email: "jan@bistro.nl", status: "" })).toEqual({ ok: true, zetActief: true });
  });

  test("geen of ongeldig e-mailadres: nee", () => {
    expect(beoordeelUitnodiging({ email: null, status: "actief" })).toMatchObject({ ok: false, reden: "geen_email" });
    expect(beoordeelUitnodiging({ email: "geen-adres", status: "actief" })).toMatchObject({ ok: false, reden: "geen_email" });
  });

  test("verwijderd account: nooit, ook niet met heractiveren", () => {
    expect(beoordeelUitnodiging({ email: "x@y.nl", status: "verwijderd" }, { heractiveren: true })).toMatchObject({ ok: false, reden: "verwijderd" });
    expect(beoordeelUitnodiging({ email: "verwijderd-1@verwijderd.invalid", status: "inactief" }, { heractiveren: true })).toMatchObject({
      ok: false,
      reden: "verwijderd",
    });
  });

  test("inactief: alleen met uitdrukkelijk heractiveren", () => {
    expect(beoordeelUitnodiging({ email: "x@y.nl", status: "inactief" })).toMatchObject({ ok: false, reden: "gedeactiveerd" });
    expect(beoordeelUitnodiging({ email: "x@y.nl", status: "inactief" }, { heractiveren: true })).toEqual({ ok: true, zetActief: true });
  });
});

test.describe("klant-uitnodiging: geldigheid en link", () => {
  test("7 dagen geldig, langer dan de resetlink van 2 uur", () => {
    expect(KLANT_UITNODIGING_GELDIG_MS).toBe(7 * 24 * 60 * 60 * 1000);
    expect(KLANT_UITNODIGING_GELDIG_MS).toBeGreaterThan(KLANT_RESET_GELDIG_MS);
  });

  test("link gaat naar de resetpagina met welkomsttekst", () => {
    expect(uitnodigingUrl("https://www.toptalentjobs.nl/", "ab12")).toBe(
      "https://www.toptalentjobs.nl/klant/wachtwoord-reset?token=ab12&welkom=1",
    );
  });
});

test.describe("klant-uitnodiging: mailtekst", () => {
  test("escapet bedrijfsnaam en contactpersoon", () => {
    const html = uitnodigingMailInhoud({ contactpersoon: "<b>Jan</b> de Vries", bedrijfsnaam: "Bistro <script>", url: "https://x/y" });
    expect(html).not.toContain("<script>");
    expect(html).not.toContain("<b>Jan</b>");
    expect(html).toContain("Bistro &lt;script&gt;");
    expect(html).toContain("7 dagen geldig");
  });

  test("geen 'Beste <bedrijfsnaam>' als de contactpersoon de bedrijfsnaam is", () => {
    const html = uitnodigingMailInhoud({ contactpersoon: "Restaurant De Kroon", bedrijfsnaam: "Restaurant De Kroon", url: "https://x" });
    expect(html).not.toContain("Beste Restaurant");
    expect(html).toContain("Welkom bij TopTalent Business");
    expect(uitnodigingMailInhoud({ contactpersoon: "Jan de Vries", bedrijfsnaam: "De Kroon", url: "https://x" })).toContain("Beste Jan, welkom");
  });
});

test.describe("ensureKlantForDienst-regels", () => {
  test("een gedeactiveerde of verwijderde klant wordt niet heractiveerd", () => {
    expect(statusNaDienstInplannen("inactief")).toBeNull();
    expect(statusNaDienstInplannen("verwijderd")).toBeNull();
    expect(statusNaDienstInplannen("actief")).toBeNull();
    expect(statusNaDienstInplannen(null)).toBe("actief");
    expect(statusNaDienstInplannen("")).toBe("actief");
  });

  test("bestaande klant: alleen uitnodigen als het e-mailadres net is aangevuld en er geen wachtwoord is", () => {
    expect(moetBestaandeKlantUitnodigen({ emailNetToegevoegd: true, heeftWachtwoord: false, status: "actief" })).toBe(true);
    expect(moetBestaandeKlantUitnodigen({ emailNetToegevoegd: false, heeftWachtwoord: false, status: "actief" })).toBe(false);
    expect(moetBestaandeKlantUitnodigen({ emailNetToegevoegd: true, heeftWachtwoord: true, status: "actief" })).toBe(false);
    expect(moetBestaandeKlantUitnodigen({ emailNetToegevoegd: true, heeftWachtwoord: false, status: "inactief" })).toBe(false);
  });

  test("bedrijfsnaam matcht letterlijk (geen % of _ als joker)", () => {
    expect(letterlijkLikePatroon("Café_100%")).toBe("Café\\_100\\%");
    expect(letterlijkLikePatroon("a\\b")).toBe("a\\\\b");
  });
});
