import { test, expect } from "@playwright/test";
import { isSessieVerlopen } from "../../src/lib/sessie-verlopen";

const origin = "https://www.toptalentjobs.nl";
const basis = { portaal: "medewerker" as const, status: 401, origin, paginaPad: "/medewerker/diensten" };

test.describe("sessie verlopen (401-afhandeling)", () => {
  test("401 van het eigen portaal-API op een beveiligde pagina = uitloggen", () => {
    expect(isSessieVerlopen({ ...basis, url: "/api/medewerker/diensten" })).toBe(true);
    expect(isSessieVerlopen({ ...basis, url: `${origin}/api/medewerker/dashboard-summary?x=1` })).toBe(true);
  });

  test("andere status, ander portaal, ander domein of uitgezonderde route: niets doen", () => {
    expect(isSessieVerlopen({ ...basis, status: 403, url: "/api/medewerker/diensten" })).toBe(false);
    expect(isSessieVerlopen({ ...basis, url: "/api/klant/diensten" })).toBe(false);
    expect(isSessieVerlopen({ ...basis, url: "https://elders.nl/api/medewerker/diensten" })).toBe(false);
    expect(isSessieVerlopen({ ...basis, url: "/api/medewerker/login" })).toBe(false);
    expect(isSessieVerlopen({ ...basis, url: "/api/medewerker/wachtwoord-reset/request" })).toBe(false);
    expect(isSessieVerlopen({ ...basis, url: "/api/ai-chat" })).toBe(false);
  });

  test("op openbare pagina's (login, wachtwoord vergeten) nooit doorsturen", () => {
    expect(isSessieVerlopen({ ...basis, paginaPad: "/medewerker/login", url: "/api/medewerker/status" })).toBe(false);
    expect(isSessieVerlopen({ ...basis, paginaPad: "/medewerker/wachtwoord-vergeten/", url: "/api/medewerker/x" })).toBe(false);
    expect(
      isSessieVerlopen({ ...basis, portaal: "klant", paginaPad: "/klant/registreren", url: "/api/klant/dashboard" }),
    ).toBe(false);
    expect(isSessieVerlopen({ ...basis, portaal: "klant", paginaPad: "/klant/uren", url: "/api/klant/uren" })).toBe(true);
  });
});
