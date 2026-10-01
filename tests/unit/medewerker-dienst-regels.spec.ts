import { test, expect } from "@playwright/test";
import {
  annuleerUitkomst,
  heeftVrijePlek,
  inzetbaarheidsMelding,
  plekkenTotaal,
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
});
