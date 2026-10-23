import { test, expect } from "@playwright/test";
import {
  factuurKlantNaw,
  factuurOntvanger,
  maakKlantSnapshot,
  zonderNieuweSnapshotKolommen,
} from "../../src/lib/factuur-klant-snapshot";

test.describe("factuur klant-NAW snapshot", () => {
  test("snapshot neemt de klantgegevens over, lege waarden worden null", () => {
    expect(
      maakKlantSnapshot({ bedrijfsnaam: " Café Noord ", contactpersoon: "Anna", email: "a@b.nl", adres: "", stad: "Utrecht" }),
    ).toEqual({
      klant_naam: "Café Noord",
      klant_email: "a@b.nl",
      klant_contactpersoon: "Anna",
      klant_adres: null,
      klant_postcode: null,
      klant_stad: "Utrecht",
      klant_kvk_nummer: null,
      klant_btw_nummer: null,
    });
  });

  test("zonder migratie: alleen de nieuwe kolommen weg, klant_naam/klant_email blijven", () => {
    const rij = { factuur_nummer: "1", ...maakKlantSnapshot({ bedrijfsnaam: "X", email: "x@y.nl", adres: "Straat 1" }) };
    expect(zonderNieuweSnapshotKolommen(rij)).toEqual({ factuur_nummer: "1", klant_naam: "X", klant_email: "x@y.nl" });
  });

  test("weergave: per veld snapshot, anders live", () => {
    const naw = factuurKlantNaw(
      { klant_naam: "Oud BV", klant_adres: "Oudestraat 1", klant_contactpersoon: null },
      { bedrijfsnaam: "Nieuw BV", adres: "Nieuwstraat 2", contactpersoon: "Verwijderd", stad: "Gouda" },
    );
    expect(naw.bedrijfsnaam).toBe("Oud BV");
    expect(naw.adres).toBe("Oudestraat 1");
    expect(naw.contactpersoon).toBe("Verwijderd");
    expect(naw.stad).toBe("Gouda");
    expect(factuurKlantNaw({}, null).bedrijfsnaam).toBeNull();
  });

  test("ontvanger: live adres, maar niet het geanonimiseerde; dan de snapshot", () => {
    expect(factuurOntvanger({ klant_email: "oud@b.nl" }, { email: "nieuw@b.nl" })).toBe("nieuw@b.nl");
    expect(factuurOntvanger({ klant_email: "oud@b.nl" }, { email: "verwijderd-123@verwijderd.invalid" })).toBe("oud@b.nl");
    expect(factuurOntvanger({}, { email: "verwijderd-1@verwijderd.invalid" })).toBeNull();
  });
});
