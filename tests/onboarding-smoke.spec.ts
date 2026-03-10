import { expect, test } from "@playwright/test";

test("inschrijven pagina toont intakevelden", async ({ page }) => {
  await page.goto("/inschrijven");

  await expect(page.getByRole("heading", { name: /inschrijven/i })).toBeVisible();
  await expect(page.getByLabel(/voornaam/i)).toBeVisible();
  await expect(page.getByLabel(/telefoon/i)).toBeVisible();
  await expect(page.getByText(/beschikbaarheid/i)).toBeVisible();
});

test("contact pagina toont contactformulier", async ({ page }) => {
  await page.goto("/contact");

  await expect(page.getByRole("heading", { name: /contact/i })).toBeVisible();
  await expect(page.getByLabel(/naam/i)).toBeVisible();
  await expect(page.getByLabel(/e-mail/i)).toBeVisible();
  await expect(page.getByLabel(/onderwerp/i)).toBeVisible();
});
