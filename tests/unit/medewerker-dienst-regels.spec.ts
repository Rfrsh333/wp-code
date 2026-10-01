import { test, expect } from "@playwright/test";
import {
  annuleerUitkomst,
  heeftVrijePlek,
  inzetbaarheidsMelding,
  nieuwstePerType,
  plekkenTotaal,
  telVerlopendeDocumenten,
  urenTotDienststart,
} from "../../src/lib/medewerker/dienst-regels";

test.describe("medewerker dienst-regels", () => {
  test("urenTotDienststart leest de dienststart als NL-tijd (niet UTC)", () => {
    // Dienst 3 okt 18:00 NL = 16:00 UTC; nu = 1 okt 16:00 UTC → precies 48 uur.
    expect(urenTotDienststart("2026-10-03", "18:00", new Date("2026-10-01T16:00:00Z"))).toBe(48);
    // Winter: 1 dec 18:00 NL = 17:00 UTC
    expect(urenTotDienststart("2026-12-01", "18:00:00", new Date("2026-12-01T16:00:00Z"))).toBe(1);
  });

  test("annuleerUitkomst: >48u direct, daarbinnen vervanging, gestart geweigerd", () => {
    expect(annuleerUitkomst(48.01)).toBe("direct");
    expect(annuleerUitkomst(48)).toBe("vervanging");
    expect(annuleerUitkomst(0.5)).toBe("vervanging");
    expect(annuleerUitkomst(0)).toBe("begonnen");
    expect(annuleerUitkomst(-3)).toBe("begonnen");
  });

  test("heeftVrijePlek: live telling gaat voor opgeslagen plekken", () => {
    expect(heeftVrijePlek({ status: "open", plekken_totaal: 2 }, 1)).toBe(true);
    expect(heeftVrijePlek({ status: "open", plekken_totaal: 2 }, 2)).toBe(false);
    // 'vol' terwijl er door een annulering weer plek is: live telling wint
    expect(heeftVrijePlek({ status: "vol", plekken_totaal: 2 }, 1)).toBe(true);
    expect(heeftVrijePlek({ status: "geannuleerd", plekken_totaal: 2 }, 0)).toBe(false);
    // zonder telling: opgeslagen waarden
    expect(heeftVrijePlek({ status: "open", plekken_beschikbaar: 0 })).toBe(false);
    expect(heeftVrijePlek({ status: "open", plekken_beschikbaar: null })).toBe(true);
    expect(heeftVrijePlek({ status: "vol", plekken_beschikbaar: 3 })).toBe(false);
  });

  test("plekkenTotaal valt terug op aantal_nodig en daarna 1", () => {
    expect(plekkenTotaal({ plekken_totaal: 4, aantal_nodig: 2 })).toBe(4);
    expect(plekkenTotaal({ plekken_totaal: null, aantal_nodig: 2 })).toBe(2);
    expect(plekkenTotaal({})).toBe(1);
  });

  test("inzetbaarheidsMelding: verlopen ID/werkvergunning blokkeert, overige documenten niet", () => {
    const vandaag = "2026-10-01";
    expect(inzetbaarheidsMelding({ vandaag, documenten: [] })).toBeNull();
    expect(
      inzetbaarheidsMelding({ vandaag, documenten: [{ document_type: "vog", expiry_date: "2020-01-01" }] }),
    ).toBeNull();
    expect(
      inzetbaarheidsMelding({ vandaag, documenten: [{ document_type: "id_bewijs", expiry_date: "2026-10-01" }] }),
    ).toBeNull();
    expect(
      inzetbaarheidsMelding({ vandaag, documenten: [{ document_type: "id_bewijs", expiry_date: "2026-09-30" }] }),
    ).toContain("ID-bewijs");
    expect(inzetbaarheidsMelding({ vandaag, documenten: [], werkvergunningGeldigTot: "2026-09-01" })).toContain(
      "werkvergunning",
    );
  });

  test("nieuwstePerType: per documenttype telt alleen de nieuwste upload", () => {
    const docs = [
      { document_type: "id_bewijs", uploaded_at: "2025-01-01T10:00:00Z", expiry_date: "2026-01-01" },
      { document_type: "id_bewijs", uploaded_at: "2026-09-01T10:00:00Z", expiry_date: "2031-01-01" },
      { document_type: "vog", uploaded_at: null, created_at: "2026-02-01T00:00:00Z", expiry_date: null },
      { document_type: "vog", uploaded_at: null, created_at: "2026-03-01T00:00:00Z", expiry_date: "2027-01-01" },
    ];
    const resultaat = nieuwstePerType(docs);
    expect(resultaat).toHaveLength(2);
    expect(resultaat.find((d) => d.document_type === "id_bewijs")?.expiry_date).toBe("2031-01-01");
    expect(resultaat.find((d) => d.document_type === "vog")?.expiry_date).toBe("2027-01-01");
    // Volgorde van de invoer maakt niet uit
    expect(nieuwstePerType([...docs].reverse()).find((d) => d.document_type === "id_bewijs")?.expiry_date).toBe(
      "2031-01-01",
    );
  });

  test("inzetbaarheidsMelding: oud verlopen ID telt niet als er een nieuwer geldig ID is", () => {
    const vandaag = "2026-10-01";
    const oud = { document_type: "id_bewijs", expiry_date: "2026-09-30", uploaded_at: "2024-01-01T00:00:00Z" };
    const nieuw = { document_type: "id_bewijs", expiry_date: "2031-09-30", uploaded_at: "2026-09-15T00:00:00Z" };
    expect(inzetbaarheidsMelding({ vandaag, documenten: [oud, nieuw] })).toBeNull();
    // Omgekeerd: de nieuwste upload is verlopen → blokkeren
    const nieuwVerlopen = { ...oud, uploaded_at: "2026-09-20T00:00:00Z" };
    expect(inzetbaarheidsMelding({ vandaag, documenten: [nieuw, nieuwVerlopen] })).toContain("ID-bewijs");
  });

  test("telVerlopendeDocumenten: alleen nieuwste per type, grens inclusief", () => {
    const grens = "2026-10-31";
    expect(
      telVerlopendeDocumenten(
        [
          { document_type: "id_bewijs", expiry_date: "2026-09-01", uploaded_at: "2024-01-01T00:00:00Z" },
          { document_type: "id_bewijs", expiry_date: "2031-01-01", uploaded_at: "2026-09-01T00:00:00Z" },
          { document_type: "vog", expiry_date: "2026-10-31", uploaded_at: "2026-01-01T00:00:00Z" },
          { document_type: "diploma", expiry_date: null, uploaded_at: "2026-01-01T00:00:00Z" },
        ],
        grens,
      ),
    ).toBe(1);
  });
});
