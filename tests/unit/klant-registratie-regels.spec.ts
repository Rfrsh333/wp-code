import { test, expect } from "@playwright/test";
import {
  ALGEMENE_VOORWAARDEN_VERSIE,
  EMAIL_VERIFICATIE_GELDIG_MS,
  emailVerificatieMailInhoud,
  emailVerificatieUrl,
  normaliseerKvk,
  valideerRegistratie,
} from "../../src/lib/klant-registratie-regels";

const geldig = {
  bedrijfsnaam: "Bistro De Kroon",
  contactpersoon: "Jan de Vries",
  email: " Jan@Kroon.NL ",
  telefoon: "0612345678",
  kvk_nummer: "1234 5678",
  akkoord_voorwaarden: true,
  wachtwoord: "lang-genoeg-wachtwoord",
};

test.describe("klant-registratie: KvK", () => {
  test("8 cijfers, spaties/punten/streepjes genegeerd", () => {
    expect(normaliseerKvk("12345678")).toBe("12345678");
    expect(normaliseerKvk("1234 5678")).toBe("12345678");
    expect(normaliseerKvk("12.34.56.78")).toBe("12345678");
    expect(normaliseerKvk(12345678)).toBe("12345678");
  });

  test("geen 8 cijfers: ongeldig", () => {
    expect(normaliseerKvk("1234567")).toBeNull();
    expect(normaliseerKvk("123456789")).toBeNull();
    expect(normaliseerKvk("1234567a")).toBeNull();
    expect(normaliseerKvk("")).toBeNull();
    expect(normaliseerKvk(null)).toBeNull();
  });
});

test.describe("klant-registratie: invoer", () => {
  test("geldige registratie: e-mail in kleine letters, KvK genormaliseerd", () => {
    const r = valideerRegistratie(geldig);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.data.email).toBe("jan@kroon.nl");
      expect(r.data.kvkNummer).toBe("12345678");
    }
  });

  test("KvK verplicht", () => {
    expect(valideerRegistratie({ ...geldig, kvk_nummer: undefined })).toMatchObject({ ok: false, veld: "kvk_nummer" });
    expect(valideerRegistratie({ ...geldig, kvk_nummer: "123" })).toMatchObject({ ok: false, veld: "kvk_nummer" });
  });

  test("akkoord met de voorwaarden verplicht, en alleen echt true telt", () => {
    expect(valideerRegistratie({ ...geldig, akkoord_voorwaarden: false })).toMatchObject({ ok: false, veld: "akkoord_voorwaarden" });
    expect(valideerRegistratie({ ...geldig, akkoord_voorwaarden: "true" })).toMatchObject({ ok: false, veld: "akkoord_voorwaarden" });
    expect(valideerRegistratie({ ...geldig, akkoord_voorwaarden: undefined })).toMatchObject({ ok: false, veld: "akkoord_voorwaarden" });
  });

  test("overige verplichte velden", () => {
    expect(valideerRegistratie({ ...geldig, bedrijfsnaam: " " })).toMatchObject({ ok: false, veld: "bedrijfsnaam" });
    expect(valideerRegistratie({ ...geldig, contactpersoon: "" })).toMatchObject({ ok: false, veld: "contactpersoon" });
    expect(valideerRegistratie({ ...geldig, email: "geen-adres" })).toMatchObject({ ok: false, veld: "email" });
    expect(valideerRegistratie({ ...geldig, wachtwoord: "" })).toMatchObject({ ok: false, veld: "wachtwoord" });
    expect(valideerRegistratie(null)).toMatchObject({ ok: false });
  });

  test("voorwaardenversie staat vast (wordt per klant opgeslagen)", () => {
    expect(ALGEMENE_VOORWAARDEN_VERSIE).toBe("3.0 (april 2025)");
  });
});

test.describe("klant-registratie: bevestigingslink", () => {
  test("minstens 24 uur geldig", () => {
    expect(EMAIL_VERIFICATIE_GELDIG_MS).toBeGreaterThanOrEqual(24 * 60 * 60 * 1000);
  });

  test("link en mailtekst", () => {
    const url = emailVerificatieUrl("https://www.toptalentjobs.nl/", "ab".repeat(32));
    expect(url).toBe(`https://www.toptalentjobs.nl/klant/email-bevestigen?token=${"ab".repeat(32)}`);
    const html = emailVerificatieMailInhoud({ contactpersoon: "<b>Jan</b>", url });
    expect(html).toContain(url);
    expect(html).not.toContain("<b>Jan</b>");
    expect(html).toContain("48 uur geldig");
  });
});
