import { test, expect } from "@playwright/test";
import {
  dienstEindMoment,
  isTeRegistreren,
  isVerdiend,
  medewerkerUurtarief,
  telVerdiend,
  verdienstenVanRegel,
} from "../../src/lib/medewerker/uren-regels";
import { berekenToeslagRegel } from "../../src/lib/toeslag";

const regel = (over: Partial<Parameters<typeof verdienstenVanRegel>[0]> = {}) => ({
  status: "klant_goedgekeurd",
  gewerkte_uren: 4,
  start_tijd: "10:00",
  eind_tijd: "14:00",
  datum: "2026-10-06", // dinsdag, geen toeslag
  klant_uurtarief: 20,
  ...over,
});

test.describe("medewerker uren-regels", () => {
  test("verdiend = klant_goedgekeurd, goedgekeurd of gefactureerd", () => {
    expect(isVerdiend("klant_goedgekeurd")).toBe(true);
    expect(isVerdiend("goedgekeurd")).toBe(true);
    expect(isVerdiend("gefactureerd")).toBe(true);
    expect(isVerdiend("ingediend")).toBe(false);
    expect(isVerdiend("klant_aangepast")).toBe(false);
  });

  test("bedrag per regel = bestaande formule (uren × (tarief − 4) + toeslag)", () => {
    expect(medewerkerUurtarief(20)).toBe(16);
    expect(medewerkerUurtarief(3)).toBe(0);
    expect(verdienstenVanRegel(regel())).toBe(64);
    // Zondagavond: toeslag komt erbovenop, exact zoals lib/toeslag hem berekent
    const zondag = regel({ datum: "2026-10-04", start_tijd: "18:00", eind_tijd: "22:00" });
    const toeslag = berekenToeslagRegel(4, 16, "2026-10-04", "18:00", "22:00").bedrag;
    expect(verdienstenVanRegel(zondag)).toBeCloseTo(64 + toeslag, 6);
  });

  test("telVerdiend: alleen verdiende regels binnen de maand van de dienstdatum", () => {
    const periode = { start: "2026-10-01", eind: "2026-10-31" };
    const totaal = telVerdiend(
      [
        regel(),
        regel({ status: "gefactureerd", gewerkte_uren: 2 }),
        regel({ status: "ingediend" }),
        regel({ datum: "2026-09-30" }),
        regel({ datum: "2026-10-29", status: "goedgekeurd", gewerkte_uren: 1 }), // donderdag
      ],
      periode,
    );
    expect(totaal).toEqual({ bedrag: 64 + 32 + 16, uren: 7 });
  });

  test("dienstEindMoment: nachtdienst eindigt de volgende dag (NL-tijd)", () => {
    expect(dienstEindMoment("2026-10-01", "22:00", "03:00").toISOString()).toBe("2026-10-02T01:00:00.000Z");
    expect(dienstEindMoment("2026-10-01", "10:00:00", "14:00:00").toISOString()).toBe("2026-10-01T12:00:00.000Z");
  });

  test("isTeRegistreren: afgelopen, geen uren, ingecheckt of QR niet verplicht", () => {
    const basis = {
      datum: "2026-10-01",
      start_tijd: "22:00",
      eind_tijd: "03:00",
      check_in_at: "2026-10-01T20:00:00Z",
      qr_verplicht: true,
      heeft_uren: false,
    };
    // Nachtdienst loopt nog om 00:30 NL
    expect(isTeRegistreren(basis, new Date("2026-10-01T22:30:00Z"))).toBe(false);
    expect(isTeRegistreren(basis, new Date("2026-10-02T02:00:00Z"))).toBe(true);
    expect(isTeRegistreren({ ...basis, heeft_uren: true }, new Date("2026-10-03T00:00:00Z"))).toBe(false);
    expect(isTeRegistreren({ ...basis, check_in_at: null }, new Date("2026-10-03T00:00:00Z"))).toBe(false);
    expect(
      isTeRegistreren({ ...basis, check_in_at: null, qr_verplicht: false }, new Date("2026-10-03T00:00:00Z")),
    ).toBe(true);
  });
});
