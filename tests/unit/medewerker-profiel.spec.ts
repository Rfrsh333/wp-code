import { test, expect } from "@playwright/test";
import { isGeldigIban, maskeerIban, normaliseerIban } from "../../src/lib/medewerker/iban";
import { huidigeBadge, volgendeBadge } from "../../src/lib/medewerker/badges";

test.describe("medewerker profiel", () => {
  test("IBAN: normaliseren en mod-97", () => {
    expect(normaliseerIban("nl91 abna 0417 1643 00")).toBe("NL91ABNA0417164300");
    expect(isGeldigIban("NL91 ABNA 0417 1643 00")).toBe(true);
    expect(isGeldigIban("NL91ABNA0417164301")).toBe(false); // controlegetal klopt niet
    expect(isGeldigIban("NL91ABNA04171643")).toBe(false); // te kort voor NL
    expect(isGeldigIban("DE89370400440532013000")).toBe(true);
    expect(isGeldigIban("")).toBe(false);
    expect(maskeerIban("NL91ABNA0417164300")).toBe("NL•• •••• 4300");
  });

  test("badges: drempels gelijk aan de server (>5, >20, >50 beoordelingen)", () => {
    expect(huidigeBadge(null).badge).toBe("starter");
    expect(huidigeBadge("onbekend").badge).toBe("starter");
    expect(volgendeBadge("starter", 3, 4)).toMatchObject({ label: "Rising Star", progress: 50, scoreOk: true });
    expect(volgendeBadge("rising", 21, 3.9)).toMatchObject({ label: "Star", progress: 100, scoreOk: false });
    expect(volgendeBadge("toptalent", 80, 5)).toBeNull();
  });
});
