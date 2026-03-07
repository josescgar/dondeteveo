import { expect, test } from "@playwright/test";

test.describe("visual regression", () => {
  test("homepage", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 1200 });
    await page.goto("/en");
    await expect(page).toHaveScreenshot("homepage-en.png", { fullPage: true });
  });

  test("race page", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 1400 });
    await page.goto("/en/races/sevilla-half-marathon/2026");
    await expect(page).toHaveScreenshot("race-page-en.png", { fullPage: true });
  });

  test("share page", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 1200 });
    await page.goto(
      "/en/share/sevilla-half-marathon/2026#mode=pace&value=05%3A00&name=Pepe",
    );
    await expect(page).toHaveScreenshot("share-page-en-mobile.png", {
      fullPage: true,
    });
  });
});
