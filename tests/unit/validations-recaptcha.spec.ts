import { test, expect } from "@playwright/test";
import { contactSchema, formatZodErrors, personeelAanvraagSchema } from "../../src/lib/validations";

const contact = {
  naam: "Test",
  email: "test@example.nl",
  onderwerp: "Vraag",
  bericht: "Hallo",
};

test.describe("validations: recaptchaToken", () => {
  test("null en ontbrekend geven geen Engelse Zod-fout (route weigert in het Nederlands)", () => {
    const metNull = contactSchema.safeParse({ ...contact, recaptchaToken: null });
    expect(metNull.success).toBe(true);
    if (metNull.success) expect(metNull.data.recaptchaToken).toBeUndefined();
    expect(contactSchema.safeParse(contact).success).toBe(true);
  });

  test("verkeerd type geeft de Nederlandse melding", () => {
    const res = contactSchema.safeParse({ ...contact, recaptchaToken: 123 });
    expect(res.success).toBe(false);
    if (!res.success) expect(formatZodErrors(res.error)).toBe("reCAPTCHA verificatie vereist");
  });

  test("personeel-aanvraag accepteert null-token ook", () => {
    const res = personeelAanvraagSchema.safeParse({
      bedrijfsnaam: "Café X",
      contactpersoon: "Jan",
      email: "jan@example.nl",
      telefoon: "0612345678",
      typePersoneel: ["bediening"],
      aantalPersonen: "2",
      contractType: [],
      startDatum: "2026-11-01",
      werkdagen: [],
      werktijden: "",
      locatie: "Utrecht",
      recaptchaToken: null,
    });
    expect(res.success).toBe(true);
  });
});
