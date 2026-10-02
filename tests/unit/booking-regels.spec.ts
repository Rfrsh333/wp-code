import { test, expect } from "@playwright/test";
import {
  berekenEindtijd,
  geldigeSource,
  tijdvakkenOverlappen,
  vindOverlap,
  volledigeTijd,
} from "../../src/lib/bookings/regels";

test.describe("booking-regels", () => {
  test("eindtijd volgt de duur van het afspraaktype (niet altijd +60)", () => {
    expect(berekenEindtijd("10:00", 90)).toBe("11:30");
    expect(berekenEindtijd("10:00:00", 15)).toBe("10:15");
    expect(berekenEindtijd("23:30", 60)).toBeNull();
    expect(volledigeTijd("09:45")).toBe("09:45:00");
  });

  test("overlap: ook bij verschillende starttijden", () => {
    const intake = { start: "10:00:00", eind: "11:30:00" };
    expect(tijdvakkenOverlappen({ start: "10:30", eind: "11:00" }, intake)).toBe(true);
    expect(tijdvakkenOverlappen({ start: "09:30", eind: "10:30" }, intake)).toBe(true);
    expect(tijdvakkenOverlappen({ start: "09:00", eind: "12:00" }, intake)).toBe(true);
  });

  test("aansluitende tijdvakken overlappen niet", () => {
    const a = { start: "10:00", eind: "11:00" };
    expect(tijdvakkenOverlappen({ start: "11:00", eind: "11:30" }, a)).toBe(false);
    expect(tijdvakkenOverlappen({ start: "09:30", eind: "10:00" }, a)).toBe(false);
  });

  test("vindOverlap geeft het botsende tijdvak terug", () => {
    const bezet = [
      { id: "a", start: "09:00", eind: "09:30" },
      { id: "b", start: "13:00", eind: "14:00" },
    ];
    expect(vindOverlap({ start: "13:45", eind: "14:15" }, bezet)?.id).toBe("b");
    expect(vindOverlap({ start: "10:00", eind: "11:00" }, bezet)).toBeNull();
  });

  test("source blijft binnen de CHECK", () => {
    expect(geldigeSource("admin")).toBe("admin");
    expect(geldigeSource("reschedule")).toBe("website");
    expect(geldigeSource(null)).toBe("website");
  });
});
