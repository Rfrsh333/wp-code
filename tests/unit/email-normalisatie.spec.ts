import { test, expect } from "@playwright/test";
import {
  emailIlikePatroon,
  ilikeLetterlijk,
  kiesEmailMatch,
  normaliseerEmail,
} from "../../src/lib/email-normalisatie";

test.describe("email-normalisatie (B4)", () => {
  test("adres wordt getrimd en klein", () => {
    expect(normaliseerEmail("  Jan@Gmail.COM ")).toBe("jan@gmail.com");
    expect(normaliseerEmail(null)).toBe("");
    expect(normaliseerEmail(42)).toBe("");
  });

  test("ilike vergelijkt letterlijk: % en _ zijn geen wildcard", () => {
    expect(ilikeLetterlijk("a_b%c\\d")).toBe("a\\_b\\%c\\\\d");
    expect(emailIlikePatroon("Jan_de_Vries@Example.nl")).toBe("jan\\_de\\_vries@example.nl");
  });

  test("geen ilike bij een * (PostgREST-wildcard) of leeg adres", () => {
    expect(emailIlikePatroon("a*b@x.nl")).toBeNull();
    expect(emailIlikePatroon("   ")).toBeNull();
  });

  test("kiest het al genormaliseerde adres en meldt dubbelen", () => {
    const rijen = [
      { id: "1", email: "Jan@Gmail.com" },
      { id: "2", email: "jan@gmail.com" },
    ];
    expect(kiesEmailMatch(rijen, "JAN@gmail.com")).toEqual({ rij: rijen[1], dubbel: true });
    expect(kiesEmailMatch([rijen[0]], "jan@gmail.com")).toEqual({ rij: rijen[0], dubbel: false });
  });

  test("rijen die alleen via een wildcard zouden matchen tellen niet", () => {
    expect(kiesEmailMatch([{ email: "janxde@gmail.com" }], "jan_de@gmail.com")).toEqual({ rij: null, dubbel: false });
  });
});
