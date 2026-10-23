import { test, expect } from "@playwright/test";
import {
  ACCOUNT_GEPAUZEERD_CODE,
  ACCOUNT_NIET_ACTIEF_CODE,
  loginToegang,
  magWachtwoordResetten,
} from "../../src/lib/medewerker/account-status";
import { isAccountGepauzeerd } from "../../src/lib/sessie-verlopen";

test.describe("medewerker accountstatus (B5)", () => {
  test("actief logt gewoon in", () => {
    expect(loginToegang("actief")).toEqual({ soort: "actief" });
  });

  test("gepauzeerd mag inloggen met een duidelijke melding", () => {
    const t = loginToegang("gepauzeerd");
    expect(t.soort).toBe("gepauzeerd");
    if (t.soort === "gepauzeerd") {
      expect(t.code).toBe(ACCOUNT_GEPAUZEERD_CODE);
      expect(t.melding).toContain("boete");
      expect(t.melding).not.toContain("Ongeldige inloggegevens");
    }
  });

  test("inactief, onbekend of leeg: eerlijke melding, geen 'ongeldige inloggegevens'", () => {
    for (const status of ["inactief", "gedeactiveerd", null, undefined, ""]) {
      const t = loginToegang(status);
      expect(t.soort).toBe("geweigerd");
      if (t.soort === "geweigerd") {
        expect(t.code).toBe(ACCOUNT_NIET_ACTIEF_CODE);
        expect(t.melding).toContain("niet actief");
      }
    }
  });

  test("wachtwoord resetten kan ook als je gepauzeerd bent", () => {
    expect(magWachtwoordResetten("actief")).toBe(true);
    expect(magWachtwoordResetten("gepauzeerd")).toBe(true);
    expect(magWachtwoordResetten("inactief")).toBe(false);
  });

  test("403 gepauzeerd op een portaalpagina: doorsturen naar de gepauzeerd-pagina", () => {
    const basis = {
      portaal: "medewerker" as const,
      status: 403,
      accountStatus: "gepauzeerd",
      url: "/api/medewerker/dashboard",
      origin: "https://www.toptalentjobs.nl",
      paginaPad: "/medewerker/dashboard",
    };
    expect(isAccountGepauzeerd(basis)).toBe(true);
    // Niet op de pagina zelf (lus), niet op openbare pagina's, niet zonder header, niet voor klanten.
    expect(isAccountGepauzeerd({ ...basis, paginaPad: "/medewerker/gepauzeerd/" })).toBe(false);
    expect(isAccountGepauzeerd({ ...basis, paginaPad: "/medewerker/login" })).toBe(false);
    expect(isAccountGepauzeerd({ ...basis, accountStatus: null })).toBe(false);
    expect(isAccountGepauzeerd({ ...basis, status: 401 })).toBe(false);
    expect(isAccountGepauzeerd({ ...basis, portaal: "klant" })).toBe(false);
    expect(isAccountGepauzeerd({ ...basis, url: "https://ander.nl/api/medewerker/x" })).toBe(false);
  });
});
