import { expect, test } from "@playwright/test";

const expectNoHorizontalOverflow = async (
  page: import("@playwright/test").Page,
) => {
  const hasOverflow = await page.evaluate(
    () => document.documentElement.scrollWidth > window.innerWidth,
  );

  expect(hasOverflow).toBe(false);
};

test("root serves the Spanish homepage for Spanish browsers", async ({
  browser,
}) => {
  const context = await browser.newContext({ locale: "es-ES" });
  const page = await context.newPage();

  await page.goto("/");

  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await expect(page).toHaveURL("/");

  await context.close();
});

test("root redirects to /en for English browsers", async ({ browser }) => {
  const context = await browser.newContext({ locale: "en-US" });
  const page = await context.newPage();

  await page.goto("/");
  await page.waitForURL(/\/en$/);

  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();

  await context.close();
});

test("root stays on / for English browser with saved Spanish preference", async ({
  browser,
}) => {
  const context = await browser.newContext({ locale: "en-US" });
  const page = await context.newPage();

  await page.goto("/en");
  await page.evaluate(() => localStorage.setItem("dtv-locale", "es"));

  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await expect(page).toHaveURL("/");

  await context.close();
});

test("race discovery reaches a race page and share flow", async ({ page }) => {
  await page.goto("/en/races");
  await page
    .getByRole("link", { name: /Triana - Los Remedios .*10K/i })
    .click();
  await expect(page).toHaveURL(
    /\/en\/races\/carrera-triana-los-remedios-10k\/2026/,
  );

  await page.getByRole("link", { name: /Generate share link/i }).click();
  await expect(page).toHaveURL(
    /\/en\/share\/carrera-triana-los-remedios-10k\/2026#/,
  );
  await expect(
    page.getByText(/All times are in the race.s local timezone\./i).first(),
  ).toBeVisible();
});

test("share page stays noindex", async ({ page }) => {
  await page.goto(
    "/en/share/carrera-triana-los-remedios-10k/2026#mode=pace&value=05%3A00&name=Pepe",
  );

  const robotsContent = await page
    .locator('meta[name="robots"]')
    .getAttribute("content");
  expect(robotsContent).toBe("noindex,follow");
});

test("special race notes appear only for races that define them", async ({
  page,
}) => {
  await page.goto("/en/races/carrera-triana-los-remedios-5k/2026");
  await expect(page.getByText(/Important race note/i)).toBeVisible();
  await expect(
    page.getByText(/The listed start time is approximate\./i).first(),
  ).toBeVisible();

  await page.goto(
    "/en/share/carrera-triana-los-remedios-5k/2026#mode=pace&value=05%3A30&name=Pepe",
  );
  await expect(page.getByText(/Important race note/i)).toBeVisible();
  await expect(
    page.getByText(/The listed start time is approximate\./i).first(),
  ).toBeVisible();

  await page.goto("/en/races/carrera-triana-los-remedios-10k/2026");
  await expect(page.getByText(/Important race note/i)).toHaveCount(0);

  await page.goto(
    "/en/share/carrera-triana-los-remedios-10k/2026#mode=pace&value=05%3A00&name=Pepe",
  );
  await expect(page.getByText(/Important race note/i)).toHaveCount(0);
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
