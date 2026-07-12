import { test, expect } from "@playwright/test";
import { getAdminRole, hasRequiredAdminRole } from "../../src/lib/admin-auth";

// Borgt het lockout-proof rolgedrag achter de geld-gates (audit P1-2 / P2-196).

test.describe("admin-auth rollen", () => {
  const setEnv = (emails?: string, map?: string) => {
    if (emails === undefined) delete process.env.ADMIN_EMAILS;
    else process.env.ADMIN_EMAILS = emails;
    if (map === undefined) delete process.env.ADMIN_ROLE_MAP;
    else process.env.ADMIN_ROLE_MAP = map;
  };

  test.afterEach(() => setEnv(undefined, undefined));

  test("eerste ADMIN_EMAILS is standaard owner (escape hatch); rest = operations", () => {
    setEnv("rachid@x.nl,info@x.nl", "");
    expect(getAdminRole("rachid@x.nl")).toBe("owner");
    expect(getAdminRole("info@x.nl")).toBe("operations");
    // Óók owner bij volledig ontbrekende rolmap.
    setEnv("rachid@x.nl", undefined);
    expect(getAdminRole("rachid@x.nl")).toBe("owner");
  });

  test("JSON ADMIN_ROLE_MAP wordt geparsed", () => {
    setEnv("rachid@x.nl,info@x.nl", '{"info@x.nl":"finance"}');
    expect(getAdminRole("info@x.nl")).toBe("finance");
    expect(getAdminRole("rachid@x.nl")).toBe("owner");
  });

  test("CSV ADMIN_ROLE_MAP wordt geparsed", () => {
    setEnv("a@x.nl,b@x.nl", "b@x.nl:finance");
    expect(getAdminRole("b@x.nl")).toBe("finance");
  });

  test("hasRequiredAdminRole", () => {
    expect(hasRequiredAdminRole("owner", ["owner", "finance"])).toBe(true);
    expect(hasRequiredAdminRole("finance", ["owner", "finance"])).toBe(true);
    expect(hasRequiredAdminRole("operations", ["owner", "finance"])).toBe(false);
    expect(hasRequiredAdminRole(undefined, ["owner"])).toBe(false);
  });
});
