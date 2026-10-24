import { test, expect } from "@playwright/test";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { hasRequiredAdminRole, type AdminRole } from "../../src/lib/admin-auth";
import { UITBETALING_ROLLEN } from "../../src/lib/uitbetaling/config";

/**
 * Stap 6 "Geld": uitbetalingen alleen voor eigenaar en financiën (owner/finance), bevestigd door
 * Rachid. Bewaakt de rollenlijst én dat elke route onder api/admin/uitbetalingen de toegangscheck
 * doet voordat er iets anders gebeurt.
 */

const ALLE_ROLLEN: AdminRole[] = ["owner", "operations", "recruiter", "finance"];

test.describe("uitbetalingen: rollen", () => {
  test("precies owner en finance", () => {
    expect([...UITBETALING_ROLLEN].sort()).toEqual(["finance", "owner"]);
    const toegestaan = ALLE_ROLLEN.filter((r) => hasRequiredAdminRole(r, UITBETALING_ROLLEN));
    expect(toegestaan.sort()).toEqual(["finance", "owner"]);
    expect(hasRequiredAdminRole(undefined, UITBETALING_ROLLEN)).toBe(false);
  });

  test("elke route onder api/admin/uitbetalingen begint met uitbetalingToegang", () => {
    const basis = join(__dirname, "../../src/app/api/admin/uitbetalingen");
    const routes = (readdirSync(basis, { recursive: true }) as string[]).filter((f) => f.endsWith("route.ts"));
    expect(routes.length).toBeGreaterThanOrEqual(6);
    for (const route of routes) {
      const bron = readFileSync(join(basis, route), "utf8");
      const handlers = [...bron.matchAll(/export async function (GET|POST|PUT|PATCH|DELETE)\([^)]*\)[^{]*\{\s*([^\n]*)/g)];
      expect(handlers.length, route).toBeGreaterThan(0);
      for (const [, methode, eersteRegel] of handlers) {
        expect(eersteRegel, `${route} ${methode}`).toContain("await uitbetalingToegang(request)");
      }
    }
  });
});
