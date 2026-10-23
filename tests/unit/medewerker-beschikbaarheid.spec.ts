import { test, expect } from "@playwright/test";
import { normaliseerBeschikbaarheid, schoneBeschikbaarheid } from "../../src/lib/medewerker/beschikbaarheid";

test.describe("medewerker beschikbaarheid (dagnotatie)", () => {
  test("oude portaalnotatie (Maandag) en matching-notatie (ma) leveren hetzelfde op", () => {
    const oud = normaliseerBeschikbaarheid({ Maandag: ["ochtend"], Zondag: ["avond", "nacht"] });
    const nieuw = normaliseerBeschikbaarheid({ ma: ["ochtend"], zo: ["avond", "nacht"] });
    expect(oud).toEqual(nieuw);
    expect(oud?.ma).toEqual(["ochtend"]);
    expect(oud?.di).toEqual([]);
  });

  test("gemengde en dubbele sleutels worden samengevoegd zonder duplicaten", () => {
    expect(normaliseerBeschikbaarheid({ ma: ["ochtend"], maandag: ["ochtend", "middag"] })?.ma).toEqual([
      "ochtend",
      "middag",
    ]);
  });

  test("geen object (vrije tekst uit inschrijving) = null, zodat matching het oude pad volgt", () => {
    expect(normaliseerBeschikbaarheid("doordeweeks")).toBeNull();
    expect(normaliseerBeschikbaarheid(null)).toBeNull();
    expect(normaliseerBeschikbaarheid(["ma"])).toBeNull();
  });

  test("bij opslaan alleen bekende tijdsblokken", () => {
    expect(schoneBeschikbaarheid({ Dinsdag: ["middag", "<script>"] })?.di).toEqual(["middag"]);
  });
});
