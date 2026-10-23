import { test, expect } from "@playwright/test";
import { isOntbrekendeKolom, ontbrekendeKolom, schrijfMetKolomFallback } from "../../src/lib/db-kolom-fallback";

test.describe("db-kolom-fallback", () => {
  test("herkent Postgres- en PostgREST-meldingen", () => {
    expect(ontbrekendeKolom({ code: "42703", message: 'column klanten.av_versie does not exist' })).toBe("av_versie");
    expect(ontbrekendeKolom({ code: "42703", message: 'column "kvk_nummer" of relation "klanten" does not exist' })).toBe("kvk_nummer");
    expect(ontbrekendeKolom({ code: "PGRST204", message: "Could not find the 'uitgenodigd_op' column of 'klanten' in the schema cache" })).toBe(
      "uitgenodigd_op",
    );
    expect(isOntbrekendeKolom({ code: "23505", message: "duplicate key" })).toBe(false);
    expect(ontbrekendeKolom(null)).toBeNull();
  });

  test("laat alleen optionele kolommen weg en probeert opnieuw", async () => {
    const pogingen: Record<string, unknown>[] = [];
    const bestaand = new Set(["email", "bedrijfsnaam"]);
    const r = await schrijfMetKolomFallback({ email: "a@b.nl", bedrijfsnaam: "X", kvk_nummer: "1", av_versie: "v" }, ["kvk_nummer", "av_versie"], async (d) => {
      pogingen.push(d);
      const mist = Object.keys(d).find((k) => !bestaand.has(k));
      return mist ? { data: null, error: { code: "PGRST204", message: `Could not find the '${mist}' column` } } : { data: { id: 1 }, error: null };
    });
    expect(r.error).toBeNull();
    expect(r.data).toEqual({ id: 1 });
    expect(r.weggelaten.sort()).toEqual(["av_versie", "kvk_nummer"]);
    expect(pogingen).toHaveLength(3);
  });

  test("een ontbrekende kernkolom blijft een fout", async () => {
    const r = await schrijfMetKolomFallback({ email: "a@b.nl" }, ["kvk_nummer"], async () => ({
      data: null,
      error: { code: "42703", message: "column klanten.email does not exist" },
    }));
    expect(r.error?.code).toBe("42703");
    expect(r.weggelaten).toEqual([]);
  });
});
