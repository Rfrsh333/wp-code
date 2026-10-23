import { test, expect } from "@playwright/test";
import { offerteGeaccepteerdMelding, offerteMailHtml, offerteOnlineUrl } from "../../src/lib/offerte-mail";

test.describe("offertemail aan de klant", () => {
  const basis = {
    contactpersoon: "Jan",
    introductie: null,
    offerteNummer: "OFF-2026-ABC123",
    geldigTot: "06 november 2026",
    onlineUrl: offerteOnlineUrl("https://www.toptalentjobs.nl/", "a".repeat(64)),
    telefoon: "+31617889189",
  };

  test("bevat de link naar de online offerte", () => {
    const html = offerteMailHtml(basis);
    expect(basis.onlineUrl).toBe(`https://www.toptalentjobs.nl/offerte/${"a".repeat(64)}`);
    expect(html).toContain(`href="https://www.toptalentjobs.nl/offerte/${"a".repeat(64)}"`);
    expect(html).toContain("Offerte online bekijken en accepteren");
  });

  test("een url met aanhalingstekens breekt het attribuut niet open", () => {
    const html = offerteMailHtml({ ...basis, onlineUrl: 'https://x/offerte/a" onclick="y' });
    expect(html).not.toContain('" onclick="');
  });

  test("zonder token geen online-knop", () => {
    expect(offerteMailHtml({ ...basis, onlineUrl: null })).not.toContain("online bekijken en accepteren");
  });

  test("contactpersoon en AI-introductie worden ge-escaped (punt 16)", () => {
    const html = offerteMailHtml({ ...basis, contactpersoon: '<img src=x onerror="alert(1)">', introductie: "Regel 1\n<script>x</script>" });
    expect(html).not.toContain("<img src=x");
    expect(html).not.toContain("<script>");
    expect(html).toContain("&lt;img src=x");
    expect(html).toContain("Regel 1<br>&lt;script&gt;");
  });
});

test.describe("melding bij online accepteren", () => {
  const offerte = {
    offerte_nummer: "OFF-2026-ABC123",
    bedrijfsnaam: "Bistro <De Kroon>",
    contactpersoon: "Jan",
    email: "jan@kroon.nl",
    telefoon: "0612345678",
    locatie: "Utrecht",
    totaal_bedrag: 1234.5,
    geldig_tot: null,
  };

  test("Telegram zonder persoonsgegevens", () => {
    const m = offerteGeaccepteerdMelding(offerte, { ondertekendDoor: "Jan de Vries", adminUrl: "https://x/admin" });
    expect(m.telegram).toContain("OFF-2026-ABC123");
    expect(m.telegram).not.toContain("Kroon");
    expect(m.telegram).not.toContain("jan@kroon.nl");
    expect(m.telegram).not.toContain("Jan");
  });

  test("mail aan TopTalent met escaping en details", () => {
    const m = offerteGeaccepteerdMelding(offerte, { ondertekendDoor: "Jan <b>de Vries</b>", adminUrl: "https://x/admin" });
    expect(m.onderwerp).toBe("Offerte geaccepteerd - OFF-2026-ABC123 - Bistro <De Kroon>");
    expect(m.html).toContain("Bistro &lt;De Kroon&gt;");
    expect(m.html).toContain("jan@kroon.nl");
    expect(m.html).not.toContain("<b>de Vries</b>");
  });
});
