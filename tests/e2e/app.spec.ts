import { expect, test } from "@playwright/test";

const expectNoHorizontalOverflow = async (
  page: import("@playwright/test").Page,
) => {
  const hasOverflow = await page.evaluate(
    () => document.documentElement.scrollWidth > window.innerWidth,
  );

  expect(hasOverflow).toBe(false);
};

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
    page.getByText(/All times are in the race.s local timezone\./i),
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

test("mobile navigation opens and links work", async ({ page }, testInfo) => {
  test.skip(
    !testInfo.project.name.includes("mobile"),
    "Mobile-only navigation test",
  );

  await page.goto("/en");
  await expectNoHorizontalOverflow(page);

  const menuToggle = page.locator("[data-mobile-nav-toggle]");

  await expect(menuToggle).toHaveAttribute("aria-expanded", "false");
  await menuToggle.click();
  await expect(menuToggle).toHaveAttribute("aria-expanded", "true");
  await expect(page.locator("[data-mobile-nav-panel]")).toBeVisible();
  await expect(page.getByRole("link", { name: /About/i })).toBeVisible();
  await expectNoHorizontalOverflow(page);

  await page.keyboard.press("Escape");
  await expect(menuToggle).toHaveAttribute("aria-expanded", "false");

  await menuToggle.click();
  await expect(menuToggle).toHaveAttribute("aria-expanded", "true");

  await page.getByRole("link", { name: /About/i }).click();
  await expect(page).toHaveURL(/\/en\/about$/);
  await expect(
    page.getByRole("heading", { level: 1, name: /About/i }),
  ).toBeVisible();
  await expectNoHorizontalOverflow(page);

  await page.locator("[data-mobile-nav-toggle]").click();
  await page.getByRole("link", { name: /Race discovery/i }).click();
  await expect(page).toHaveURL(/\/en\/races$/);
  await expectNoHorizontalOverflow(page);
});
