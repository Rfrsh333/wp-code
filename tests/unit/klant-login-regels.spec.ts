import { test, expect } from "@playwright/test";
import { beoordeelKlantLogin } from "../../src/lib/klant-login-regels";

test.describe("klant-login: eerlijke meldingen zonder enumeratie", () => {
  test("onbekend adres, fout wachtwoord en account zonder wachtwoord: precies hetzelfde antwoord", () => {
    const onbekend = beoordeelKlantLogin({ gevonden: false, wachtwoordKlopt: false, status: null });
    const fout = beoordeelKlantLogin({ gevonden: true, wachtwoordKlopt: false, status: "actief" });
    // Zonder wachtwoord vergelijkt de route met een dummy-hash: wachtwoordKlopt is dan altijd false.
    const zonderWachtwoordInactief = beoordeelKlantLogin({ gevonden: true, wachtwoordKlopt: false, status: "inactief" });
    expect(fout).toEqual(onbekend);
    expect(zonderWachtwoordInactief).toEqual(onbekend);
    expect(onbekend).toMatchObject({ ok: false, status: 401, code: "ongeldige_inloggegevens" });
  });

  test("de melding vertelt wat je doet zonder wachtwoord of activatie", () => {
    const r = beoordeelKlantLogin({ gevonden: false, wachtwoordKlopt: false, status: null });
    expect(!r.ok && r.error).toContain("nog niet geactiveerd");
    expect(!r.ok && r.error).toContain("Wachtwoord vergeten");
  });

  test("niet actief alleen bij een kloppend wachtwoord", () => {
    expect(beoordeelKlantLogin({ gevonden: true, wachtwoordKlopt: true, status: "inactief" })).toMatchObject({
      ok: false,
      status: 403,
      code: "account_niet_actief",
    });
    expect(beoordeelKlantLogin({ gevonden: true, wachtwoordKlopt: true, status: null })).toMatchObject({ ok: false, status: 403 });
    expect(beoordeelKlantLogin({ gevonden: true, wachtwoordKlopt: true, status: "actief" })).toEqual({ ok: true });
  });

  test("web spreekt aan met u, de app met je", () => {
    const web = beoordeelKlantLogin({ gevonden: true, wachtwoordKlopt: true, status: "inactief" }, "u");
    const app = beoordeelKlantLogin({ gevonden: true, wachtwoordKlopt: true, status: "inactief" }, "je");
    expect(!web.ok && web.error).toMatch(/^Uw account/);
    expect(!app.ok && app.error).toMatch(/^Je account/);
  });
});
