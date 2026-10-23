import { test, expect } from "@playwright/test";
import {
  actieLabel,
  categorieVoorMelding,
  cursorFilter,
  inBlokken,
  klantTabUitUrl,
  leesCursor,
  leesMeldingenVraag,
  leesRol,
  legeTelling,
  maakCursor,
  maakMeldingRijen,
  meldingTijd,
  MELDING_LIMIET_MAX,
  MELDING_TEKST_MAX,
  MELDING_TITEL_MAX,
  opruimGrens,
  telling,
  veiligeMeldingUrl,
} from "../../src/lib/meldingen/meldingen-regels";
import {
  meldingContractTerOndertekening,
  meldingDienstAangeboden,
  meldingVervangerIngepland,
} from "../../src/lib/meldingen/meldingen-teksten";

const ID1 = "11111111-1111-4111-8111-111111111111";
const ID2 = "22222222-2222-4222-8222-222222222222";
const DIENST = "3f2b9c1e-7a4d-4e8b-9c0a-1b2c3d4e5f60";

test.describe("categorieVoorMelding: alle bestaande pushes", () => {
  // Elke payload uit lib/klant-push-triggers.ts, lib/dienst-push-triggers.ts, lib/klant-controle.ts,
  // api/klant/annuleren en api/klant/aanvraag (stand 23-10-2026).
  const gevallen: [string, { tag?: string; url?: string }, string][] = [
    ["klant: medewerker toegewezen", { tag: "medewerker-assigned", url: "/klant/uren?tab=diensten" }, "diensten"],
    ["klant: dienst bevestigd", { tag: "dienst-confirmed", url: "/klant/uren?tab=diensten" }, "diensten"],
    ["klant: dienststatus", { tag: "dienst-status-change", url: "/klant/uren?tab=diensten" }, "diensten"],
    ["klant: beoordeling", { tag: "review-reminder", url: "/klant/uren?tab=beoordelingen" }, "diensten"],
    ["klant: uren ingediend", { tag: "uren-submitted", url: "/klant/uren?tab=uren" }, "uren_geld"],
    ["klant: nieuwe factuur", { tag: "new-invoice", url: "/klant/uren?tab=facturen" }, "uren_geld"],
    ["klant: nieuwe aanmelding", { tag: `aanmelding-${DIENST}`, url: "/klant/uren/" }, "diensten"],
    ["medewerker: ingepland/afgewezen", { tag: `aanmelding-${DIENST}`, url: "/medewerker/diensten/" }, "diensten"],
    ["medewerker: reactie ingetrokken", { tag: `aanmelding-${DIENST}`, url: "/medewerker/shifts/" }, "diensten"],
    ["medewerker: dienst geannuleerd", { tag: `dienst-geannuleerd-${DIENST}`, url: "/medewerker/diensten/" }, "diensten"],
    ["medewerker: uitnodiging", { tag: `uitnodiging-${DIENST}`, url: "/medewerker/diensten/" }, "diensten"],
    ["medewerker: nieuwe dienst", { tag: "nieuwe-dienst-2026-10-24", url: "/medewerker/diensten/" }, "diensten"],
  ];
  for (const [naam, invoer, verwacht] of gevallen) {
    test(naam, () => expect(categorieVoorMelding(invoer)).toBe(verwacht));
  }

  test("meegegeven categorie wint van tag en url", () => {
    expect(categorieVoorMelding({ categorie: "account", tag: "uren-submitted", url: "/medewerker/uren/" })).toBe("account");
  });

  test("ongeldige meegegeven categorie wordt genegeerd", () => {
    expect(categorieVoorMelding({ categorie: "onzin" as never, tag: "new-invoice" })).toBe("uren_geld");
  });

  test("zonder tag: het pad bepaalt", () => {
    expect(categorieVoorMelding({ url: "/medewerker/uren/" })).toBe("uren_geld");
    expect(categorieVoorMelding({ url: "/medewerker/financieel" })).toBe("uren_geld");
    expect(categorieVoorMelding({ url: "/medewerker/documenten/" })).toBe("account");
    expect(categorieVoorMelding({ url: "/medewerker/gepauzeerd/" })).toBe("account");
    expect(categorieVoorMelding({ url: "/klant/dashboard?tab=kosten" })).toBe("uren_geld");
    expect(categorieVoorMelding({ url: "/klant/uren?tab=instellingen" })).toBe("account");
  });

  test("tags voor de categorieën uit de opdracht", () => {
    expect(categorieVoorMelding({ tag: "uitbetaling-okt" })).toBe("uren_geld");
    expect(categorieVoorMelding({ tag: "uren-goedgekeurd" })).toBe("uren_geld");
    expect(categorieVoorMelding({ tag: "checklist-compleet" })).toBe("account");
    expect(categorieVoorMelding({ tag: "account-gepauzeerd" })).toBe("account");
    expect(categorieVoorMelding({ tag: "documenten" })).toBe("account");
    expect(categorieVoorMelding({ tag: `vervanging-${DIENST}` })).toBe("diensten");
    expect(categorieVoorMelding({ tag: "aanbieding" })).toBe("diensten");
  });

  test("onbekend of niets: diensten", () => {
    expect(categorieVoorMelding({})).toBe("diensten");
    expect(categorieVoorMelding({ tag: "iets-anders", url: "/medewerker/berichten/" })).toBe("diensten");
    // "uren" binnen een ander woord telt niet
    expect(categorieVoorMelding({ tag: "vuurenwerk" })).toBe("diensten");
  });
});

test.describe("veiligeMeldingUrl", () => {
  test("relatieve paden blijven", () => {
    expect(veiligeMeldingUrl("/medewerker/diensten/")).toBe("/medewerker/diensten/");
    expect(veiligeMeldingUrl(" /klant/uren?tab=uren ")).toBe("/klant/uren?tab=uren");
  });
  test("al het andere wordt null", () => {
    for (const u of ["https://evil.nl", "//evil.nl/x", "/\\evil.nl", "javascript:alert(1)", "diensten", "/met spatie", "", null, undefined]) {
      expect(veiligeMeldingUrl(u as string)).toBeNull();
    }
    expect(veiligeMeldingUrl(`/${"a".repeat(600)}`)).toBeNull();
  });
});

test.describe("maakMeldingRijen", () => {
  const invoer = { title: "Je bent ingepland!", body: "Bediening bij Café op za 24 okt.", url: "/medewerker/diensten/", tag: `aanmelding-${DIENST}` };

  test("één rij per unieke, geldige ontvanger", () => {
    const rijen = maakMeldingRijen([ID1, ID2, ID1, ID1.toUpperCase(), "geen-uuid", ""], "medewerker", invoer);
    expect(rijen).toHaveLength(2);
    expect(rijen[0]).toEqual({
      user_type: "medewerker",
      user_id: ID1,
      categorie: "diensten",
      titel: "Je bent ingepland!",
      tekst: "Bediening bij Café op za 24 okt.",
      url: "/medewerker/diensten/",
    });
  });

  test("lange teksten worden ingekort, onveilige url wordt null", () => {
    const [rij] = maakMeldingRijen([ID1], "klant", { title: "x".repeat(500), body: "y".repeat(5000), url: "https://evil.nl" });
    expect(rij.titel.length).toBeLessThanOrEqual(MELDING_TITEL_MAX);
    expect(rij.tekst.length).toBeLessThanOrEqual(MELDING_TEKST_MAX);
    expect(rij.titel.endsWith("…")).toBe(true);
    expect(rij.url).toBeNull();
  });

  test("zonder titel of zonder ontvangers: niets", () => {
    expect(maakMeldingRijen([ID1], "klant", { title: "   ", body: "x" })).toEqual([]);
    expect(maakMeldingRijen([], "klant", invoer)).toEqual([]);
  });

  test("inkorten breekt geen emoji en haalt \\0 en losse surrogaten weg", () => {
    const emoji = "🎉".repeat(300); // 300 tekens, 600 UTF-16-eenheden
    const [rij] = maakMeldingRijen([ID1], "klant", { title: emoji, body: `a\u0000b\uD83Dc` });
    const tekens = Array.from(rij.titel);
    expect(tekens.length).toBe(MELDING_TITEL_MAX);
    expect(tekens.slice(0, -1).every((c) => c === "🎉")).toBe(true);
    expect(rij.titel.isWellFormed?.() ?? true).toBe(true);
    expect(rij.tekst).toBe("abc");
  });

  test("lege body mag", () => {
    expect(maakMeldingRijen([ID1], "klant", { title: "T", body: "" })[0].tekst).toBe("");
  });
});

test("inBlokken: grote broadcast in blokken van 500", () => {
  const lijst = Array.from({ length: 1201 }, (_, i) => i);
  expect(inBlokken(lijst).map((b) => b.length)).toEqual([500, 500, 201]);
  expect(inBlokken([])).toEqual([]);
  expect(inBlokken([1, 2, 3], 2)).toEqual([[1, 2], [3]]);
});

test.describe("cursor", () => {
  const ts = "2026-10-23T12:34:56.123456+00:00";

  test("heen en terug, exact (microseconden blijven)", () => {
    const c = maakCursor(ts, ID1);
    expect(c).toMatch(/^[A-Za-z0-9_-]+$/);
    expect(leesCursor(c)).toEqual({ createdAt: ts, id: ID1 });
  });

  test("ongeldige cursors", () => {
    expect(leesCursor(null)).toBeNull();
    expect(leesCursor("")).toBeNull();
    expect(leesCursor("!!!")).toBeNull();
    expect(leesCursor(btoa(`niet-een-datum|${ID1}`))).toBeNull();
    expect(leesCursor(btoa(`${ts}|geen-uuid`))).toBeNull();
    expect(leesCursor(btoa(`${ts}|${ID1}|extra`))).toBeNull();
    expect(leesCursor("a".repeat(300))).toBeNull();
  });

  test("filter: ouder dan de cursor, met id als tiebreaker", () => {
    expect(cursorFilter({ createdAt: ts, id: ID1 })).toBe(
      `created_at.lt."${ts}",and(created_at.eq."${ts}",id.lt.${ID1})`,
    );
  });
});

test.describe("leesMeldingenVraag", () => {
  test("standaard: alles, geen cursor, 20", () => {
    expect(leesMeldingenVraag({})).toEqual({ ok: true, vraag: { categorie: null, cursor: null, limiet: 20 } });
    expect(leesMeldingenVraag({ categorie: "alles" })).toEqual({ ok: true, vraag: { categorie: null, cursor: null, limiet: 20 } });
  });
  test("categorie en limiet (begrensd)", () => {
    const r = leesMeldingenVraag({ categorie: "uren_geld", limiet: "500" });
    expect(r).toEqual({ ok: true, vraag: { categorie: "uren_geld", cursor: null, limiet: MELDING_LIMIET_MAX } });
  });
  test("fouten", () => {
    expect(leesMeldingenVraag({ categorie: "geld" }).ok).toBe(false);
    expect(leesMeldingenVraag({ limiet: "0" }).ok).toBe(false);
    expect(leesMeldingenVraag({ limiet: "2.5" }).ok).toBe(false);
    expect(leesMeldingenVraag({ limiet: "abc" }).ok).toBe(false);
    expect(leesMeldingenVraag({ voor: "kapot" }).ok).toBe(false);
  });
  test("cursor wordt gelezen", () => {
    const c = maakCursor("2026-10-01T08:00:00+00:00", ID2);
    const r = leesMeldingenVraag({ voor: c });
    expect(r.ok && r.vraag.cursor).toEqual({ createdAt: "2026-10-01T08:00:00+00:00", id: ID2 });
  });
});

test("leesRol", () => {
  expect(leesRol(null)).toEqual({ ok: true, rol: null });
  expect(leesRol("")).toEqual({ ok: true, rol: null });
  expect(leesRol("medewerker")).toEqual({ ok: true, rol: "medewerker" });
  expect(leesRol("klant")).toEqual({ ok: true, rol: "klant" });
  expect(leesRol("admin")).toEqual({ ok: false });
});

test("telling: totaal is de som, nooit negatief", () => {
  expect(legeTelling()).toEqual({ totaal: 0, per_categorie: { diensten: 0, uren_geld: 0, account: 0 } });
  expect(telling({ diensten: 3, uren_geld: 2, account: null })).toEqual({ totaal: 5, per_categorie: { diensten: 3, uren_geld: 2, account: 0 } });
  expect(telling({ diensten: -1 }).totaal).toBe(0);
});

test("opruimGrens: 90 dagen terug", () => {
  expect(opruimGrens(new Date("2026-10-23T04:45:00Z"))).toBe("2026-07-25T04:45:00.000Z");
  expect(opruimGrens(new Date("2026-10-23T04:45:00Z"), 1)).toBe("2026-10-22T04:45:00.000Z");
});

test.describe("meldingTijd (Nederlandse tijd)", () => {
  const nu = new Date("2026-10-23T14:00:00Z"); // 16:00 in Amsterdam (zomertijd)
  test("kort geleden", () => {
    expect(meldingTijd("2026-10-23T13:59:30Z", nu)).toBe("zojuist");
    expect(meldingTijd("2026-10-23T13:55:00Z", nu)).toBe("5 min geleden");
    expect(meldingTijd("2026-10-23T11:00:00Z", nu)).toBe("3 uur geleden");
  });
  test("gisteren met tijd, daarna dagen, daarna datum", () => {
    expect(meldingTijd("2026-10-22T12:05:00Z", nu)).toBe("gisteren 14:05");
    expect(meldingTijd("2026-10-19T10:00:00Z", nu)).toBe("4 dagen geleden");
    expect(meldingTijd("2026-10-12T10:00:00Z", nu)).toBe("12 okt");
    expect(meldingTijd("2025-12-31T10:00:00Z", nu)).toBe("31 dec 2025");
  });
  test("ongeldig of in de toekomst", () => {
    expect(meldingTijd("geen datum", nu)).toBe("");
    expect(meldingTijd("2026-10-23T15:00:00Z", nu)).toBe("zojuist");
  });
});

test("klantTabUitUrl: tab-urls worden een tabwissel", () => {
  expect(klantTabUitUrl("/klant/uren?tab=uren")).toBe("uren");
  expect(klantTabUitUrl("/klant/uren/?tab=facturen")).toBe("facturen");
  expect(klantTabUitUrl("/klant/dashboard?tab=beoordelingen")).toBe("beoordelingen");
  expect(klantTabUitUrl("/klant/uren/")).toBe("overzicht");
  expect(klantTabUitUrl("/klant/login")).toBeNull();
  expect(klantTabUitUrl("/medewerker/diensten/")).toBeNull();
  expect(klantTabUitUrl("https://evil.nl/klant/uren?tab=uren")).toBeNull();
  // kapotte %-reeks: niet gooien
  expect(klantTabUitUrl("/klant/uren?tab=%E0%A4%A")).toBe("%E0%A4%A");
  expect(actieLabel("/klant/uren?tab=%E0%A4%A")).toBe("Bekijken");
  expect(categorieVoorMelding({ url: "/klant/uren?tab=%zz" })).toBe("diensten");
});

test("actieLabel", () => {
  expect(actieLabel("/medewerker/diensten/")).toBe("Naar diensten");
  expect(actieLabel("/medewerker/shifts/")).toBe("Naar Ontdekken");
  expect(actieLabel("/medewerker/contracten/")).toBe("Naar contracten");
  expect(actieLabel("/klant/uren?tab=uren")).toBe("Naar uren");
  expect(actieLabel("/klant/uren?tab=beoordelingen")).toBe("Beoordelen");
  expect(actieLabel("/klant/uren/")).toBe("Bekijken");
  expect(actieLabel(null)).toBeNull();
});

test.describe("meldingen voor gebeurtenissen die alleen een mail kregen", () => {
  const dienst = { functie: "Bediening", klant_naam: "Café De Proef", datum: "2026-10-24", start_tijd: "17:00:00" };

  test("dienst aangeboden", () => {
    const m = meldingDienstAangeboden(dienst);
    expect(m.categorie).toBe("diensten");
    expect(m.url).toBe("/medewerker/diensten/");
    expect(m.body).toContain("Bediening bij Café De Proef op za 24 okt om 17:00");
    expect(meldingDienstAangeboden(null).body).toContain("een dienst");
  });

  test("vervanger ingepland", () => {
    const m = meldingVervangerIngepland(dienst);
    expect(m.categorie).toBe("diensten");
    expect(m.body).toBe("Je neemt Bediening bij Café De Proef op za 24 okt om 17:00 over.");
    expect(meldingVervangerIngepland(undefined).body).toBe("Je neemt een dienst over.");
  });

  test("contract ter ondertekening", () => {
    const m = meldingContractTerOndertekening("Raamovereenkomst 2026");
    expect(m.categorie).toBe("account");
    expect(m.url).toBe("/medewerker/contracten/");
    expect(m.body).toContain('"Raamovereenkomst 2026"');
    expect(meldingContractTerOndertekening(null).body).toContain("Er staat een contract");
  });

  test("passen op de opslagregels", () => {
    const rijen = maakMeldingRijen([ID1], "medewerker", meldingDienstAangeboden(dienst));
    expect(rijen).toHaveLength(1);
    expect(rijen[0].categorie).toBe("diensten");
  });
});
