import { test, expect } from "@playwright/test";

const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:3000";

test("Utrecht regio pagina links", async ({ page }) => {
  await page.goto(new URL("/locaties/utrecht", baseURL).toString());

  await expect(page.locator('a[href="/locaties/utrecht/uitzenden"]')).toBeVisible();
  await expect(page.locator('a[href="/locaties/utrecht/detachering"]')).toBeVisible();
});

test("Amsterdam regio pagina links", async ({ page }) => {
  await page.goto(new URL("/locaties/amsterdam", baseURL).toString());

  await expect(page.locator('a[href="/locaties/amsterdam/uitzenden"]')).toBeVisible();
  await expect(page.locator('a[href="/locaties/amsterdam/detachering"]')).toBeVisible();
});

test("Footer contains Rotterdam link", async ({ page }) => {
  await page.goto(new URL("/", baseURL).toString());

  const rotterdamLink = page.getByRole("link", { name: "Rotterdam" });
  await expect(rotterdamLink).toHaveAttribute("href", "/locaties/rotterdam");
});
