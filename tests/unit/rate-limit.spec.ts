import { test, expect } from "@playwright/test";
import { authFailClosedIngeschakeld, checkRedisRateLimit } from "../../src/lib/rate-limit-redis";

// Borgt dat fail-closed op auth-endpoints een BEWUSTE keuze blijft (audit P1-10).
// Zonder deze poort sluit een onbereikbare Redis iedereen buiten: admin, medewerker
// én klant kunnen dan niet meer inloggen.

test.describe("auth rate-limit fail-closed", () => {
  const zetVlag = (waarde?: string) => {
    if (waarde === undefined) delete process.env.AUTH_RATE_LIMIT_FAIL_CLOSED;
    else process.env.AUTH_RATE_LIMIT_FAIL_CLOSED = waarde;
  };

  test.afterEach(() => zetVlag(undefined));

  test("staat standaard UIT en gaat alleen aan bij exact '1'", () => {
    zetVlag(undefined);
    expect(authFailClosedIngeschakeld()).toBe(false);
    zetVlag("");
    expect(authFailClosedIngeschakeld()).toBe(false);
    zetVlag("true");
    expect(authFailClosedIngeschakeld()).toBe(false);
    zetVlag("1");
    expect(authFailClosedIngeschakeld()).toBe(true);
  });

  test("zonder Redis en zonder vlag blijft inloggen mogelijk", async () => {
    zetVlag(undefined);
    const r = await checkRedisRateLimit(`test-zonder-vlag:${Date.now()}`, null, {
      failClosed: true,
    });
    expect(r.success).toBe(true);
  });

  test("een onbereikbare Redis weigert pas als de vlag aan staat", async () => {
    // limiter waarvan .limit() gooit = de dode-Upstash-situatie.
    const kapotteLimiter = {
      limit: async () => {
        throw new Error("ENOTFOUND upstash.io");
      },
    } as unknown as Parameters<typeof checkRedisRateLimit>[1];

    zetVlag(undefined);
    const zonder = await checkRedisRateLimit(`test-kapot-a:${Date.now()}`, kapotteLimiter, {
      failClosed: true,
    });
    expect(zonder.success).toBe(true);

    zetVlag("1");
    const met = await checkRedisRateLimit(`test-kapot-b:${Date.now()}`, kapotteLimiter, {
      failClosed: true,
    });
    expect(met.success).toBe(false);
  });

  test("endpoints zonder failClosed degraderen altijd naar de fallback", async () => {
    zetVlag("1");
    const r = await checkRedisRateLimit(`test-open:${Date.now()}`, null);
    expect(r.success).toBe(true);
  });
});
