import { test, expect } from "@playwright/test";

const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:3000";

test("Utrecht locatie pagina toegankelijk", async ({ page }) => {
  await page.goto(new URL("/locaties/utrecht", baseURL).toString());

  // Check breadcrumbs
  await expect(page.getByRole("navigation", { name: "Breadcrumb" })).toBeVisible();

  // Check main heading
  await expect(page.getByRole("heading", { name: /Horeca Personeel Utrecht/i })).toBeVisible();

  // Check related locations component
  await expect(page.getByText(/Ook actief in andere regio's/i)).toBeVisible();
});

test("Amsterdam locatie pagina toegankelijk", async ({ page }) => {
  await page.goto(new URL("/locaties/amsterdam", baseURL).toString());

  // Check breadcrumbs
  await expect(page.getByRole("navigation", { name: "Breadcrumb" })).toBeVisible();

  // Check main heading
  await expect(page.getByRole("heading", { name: /Horeca Personeel Amsterdam/i })).toBeVisible();

  // Check related locations links to other cities
  await expect(page.locator('a[href="/locaties/utrecht"]')).toBeVisible();
  await expect(page.locator('a[href="/locaties/rotterdam"]')).toBeVisible();
});

test("Rotterdam locatie pagina toegankelijk", async ({ page }) => {
  await page.goto(new URL("/locaties/rotterdam", baseURL).toString());

  // Check breadcrumbs
  await expect(page.getByRole("navigation", { name: "Breadcrumb" })).toBeVisible();

  // Check main heading
  await expect(page.getByRole("heading", { name: /Horeca Personeel Rotterdam/i })).toBeVisible();

  // Check related locations
  await expect(page.locator('a[href="/locaties/utrecht"]')).toBeVisible();
  await expect(page.locator('a[href="/locaties/amsterdam"]')).toBeVisible();
});

test("Locaties overzichtspagina toont alle steden", async ({ page }) => {
  await page.goto(new URL("/locaties", baseURL).toString());

  // Check alle drie de steden zijn zichtbaar
  await expect(page.locator('a[href="/locaties/utrecht"]')).toBeVisible();
  await expect(page.locator('a[href="/locaties/amsterdam"]')).toBeVisible();
  await expect(page.locator('a[href="/locaties/rotterdam"]')).toBeVisible();

  // Check statistics
  await expect(page.getByText(/restaurants/i)).toBeVisible();
  await expect(page.getByText(/hotels/i)).toBeVisible();
});

test("404 pagina voor ongeldige locatie", async ({ page }) => {
  await page.goto(new URL("/locaties/invalid-city", baseURL).toString());

  // Check not-found page
  await expect(page.getByRole("heading", { name: /Locatie niet gevonden/i })).toBeVisible();

  // Check suggesties naar bestaande locaties
  await expect(page.locator('a[href="/locaties/utrecht"]')).toBeVisible();
  await expect(page.locator('a[href="/locaties/amsterdam"]')).toBeVisible();
  await expect(page.locator('a[href="/locaties/rotterdam"]')).toBeVisible();
});
