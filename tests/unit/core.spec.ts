import { test, expect } from "@playwright/test";
import {
  calculateKlantReiskosten,
  calculateMedewerkerReiskosten,
  roundCurrency,
  sanitizeKilometers,
} from "../../src/lib/reiskosten";
import {
  berekenGewerkteUren,
  berekenToeslag,
  isFeestdag,
  berekenBewaarTot,
} from "../../src/lib/compliance/arbeidstijden";
import { encryptField, decryptField, isEncrypted } from "../../src/lib/encryption";
import { escapeHtml } from "../../src/lib/sanitize";
import { hashToken } from "../../src/lib/token-hash";

// Deze tests dekken de pure kernlogica achter de audit-fixes (geld, PII, security).
// Ze draaien zonder browser via `npx playwright test tests/unit`.

test.describe("reiskosten", () => {
  test("klant- vs medewerkertarief", () => {
    expect(calculateKlantReiskosten(10)).toBe(2.3); // €0,23/km
    expect(calculateMedewerkerReiskosten(10)).toBe(2.1); // €0,21/km
  });

  test("sanitizeKilometers weigert ongeldige/negatieve invoer", () => {
    expect(sanitizeKilometers("abc")).toBe(0);
    expect(sanitizeKilometers(-5)).toBe(0);
    expect(sanitizeKilometers(null)).toBe(0);
    expect(sanitizeKilometers("12.5")).toBe(12.5);
  });

  test("roundCurrency rondt op 2 decimalen", () => {
    expect(roundCurrency(2.345)).toBe(2.35);
    expect(roundCurrency(2.344)).toBe(2.34);
  });
});

test.describe("arbeidstijden", () => {
  test("berekenGewerkteUren met pauze en over middernacht", () => {
    expect(berekenGewerkteUren("18:00", "23:00", 30)).toBe(4.5);
    expect(berekenGewerkteUren("22:00", "02:00", 0)).toBe(4); // over middernacht
    expect(berekenGewerkteUren("09:00", "17:00", 60)).toBe(7);
  });

  test("berekenToeslag: feestdag/nacht/avond/geen", () => {
    expect(berekenToeslag("2026-12-25", "10:00", "18:00").percentage).toBe(100); // Kerst
    expect(berekenToeslag("2026-07-15", "02:00", "08:00").type).toBe("nacht"); // wo, nacht
    expect(berekenToeslag("2026-07-15", "20:00", "23:00").type).toBe("avond"); // wo, avond
    expect(berekenToeslag("2026-07-15", "10:00", "17:00").type).toBe("geen"); // wo, overdag
  });

  test("isFeestdag + berekenBewaarTot (5 jaar)", () => {
    expect(isFeestdag("2026-12-25")).toBe(true);
    expect(isFeestdag("2026-07-15")).toBe(false);
    expect(berekenBewaarTot("2020-01-01")).toBe("2025-01-01");
  });
});

test.describe("encryptie (IBAN/BTW)", () => {
  test("round-trip met sleutel; plaintext passeert", () => {
    const oud = process.env.FIELD_ENCRYPTION_KEY;
    process.env.FIELD_ENCRYPTION_KEY = Buffer.alloc(32, 7).toString("base64");
    try {
      const enc = encryptField("NL12INGB0001234567");
      expect(isEncrypted(enc)).toBe(true);
      expect(enc).not.toContain("NL12INGB0001234567");
      expect(decryptField(enc)).toBe("NL12INGB0001234567");
      // Reeds-plaintext (pre-migratie) blijft ongewijzigd bij lezen.
      expect(decryptField("gewoon-plaintext")).toBe("gewoon-plaintext");
    } finally {
      if (oud === undefined) delete process.env.FIELD_ENCRYPTION_KEY;
      else process.env.FIELD_ENCRYPTION_KEY = oud;
    }
  });

  test("zonder sleutel: niet-brekende pass-through", () => {
    const oud = process.env.FIELD_ENCRYPTION_KEY;
    delete process.env.FIELD_ENCRYPTION_KEY;
    try {
      expect(encryptField("NL12INGB0001234567")).toBe("NL12INGB0001234567");
      expect(isEncrypted(encryptField("x"))).toBe(false);
    } finally {
      if (oud !== undefined) process.env.FIELD_ENCRYPTION_KEY = oud;
    }
  });
});

test.describe("escapeHtml", () => {
  test("escapet HTML-metatekens", () => {
    expect(escapeHtml('<script>alert(1)</script>')).toBe(
      "&lt;script&gt;alert(1)&lt;&#x2F;script&gt;",
    );
    expect(escapeHtml(null)).toBe("");
  });
});

test.describe("token-hash", () => {
  test("deterministisch, niet de plaintext, 64 hex-tekens", () => {
    const t = "reset-abc123";
    expect(hashToken(t)).toBe(hashToken(t)); // deterministisch -> opzoekbaar
    expect(hashToken(t)).not.toBe(t);
    expect(hashToken(t)).toHaveLength(64);
    expect(hashToken("a")).not.toBe(hashToken("b"));
  });
});
