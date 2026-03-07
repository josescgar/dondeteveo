import { expect, test } from "@playwright/test";

test("root redirects to a localized homepage", async ({ page }) => {
  await page.goto("/");
  await page.waitForURL(/\/(en|es)$/);

  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
});

test("race discovery reaches a race page and share flow", async ({ page }) => {
  await page.goto("/en/races");
  await page
    .getByRole("link", { name: /Zurich Seville Half Marathon/i })
    .click();
  await expect(page).toHaveURL(/\/en\/races\/sevilla-half-marathon\/2026/);

  await page.getByRole("link", { name: /Generate share link/i }).click();
  await expect(page).toHaveURL(/\/en\/share\/sevilla-half-marathon\/2026#/);
  await expect(
    page.getByText(/All times are shown in the race timezone only\./i),
  ).toBeVisible();
});

test("share page stays noindex", async ({ page }) => {
  await page.goto(
    "/en/share/sevilla-half-marathon/2026#mode=pace&value=05%3A00&name=Pepe",
  );

  const robotsContent = await page
    .locator('meta[name="robots"]')
    .getAttribute("content");
  expect(robotsContent).toBe("noindex,follow");
});
