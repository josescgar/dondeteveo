import { expect, test } from "@playwright/test";

test("default theme is light (no data-theme attribute)", async ({ page }) => {
  await page.goto("/en");

  const hasDataTheme = await page.evaluate(() =>
    document.documentElement.hasAttribute("data-theme"),
  );
  expect(hasDataTheme).toBe(false);

  await expect(page.locator("img.header-logo--light")).toBeVisible();
  await expect(page.locator("img.header-logo--dark")).not.toBeVisible();
});

test("toggle to dark mode", async ({ page }) => {
  await page.goto("/en");

  await page.locator("[data-theme-toggle]").click();

  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await expect(page.locator("img.header-logo--dark")).toBeVisible();
  await expect(page.locator("img.header-logo--light")).not.toBeVisible();
  await expect(page.locator("[data-theme-icon-sun]")).toBeVisible();
  await expect(page.locator("[data-theme-icon-moon]")).not.toBeVisible();
});

test("toggle back to light mode", async ({ page }) => {
  await page.goto("/en");

  await page.locator("[data-theme-toggle]").click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");

  await page.locator("[data-theme-toggle]").click();

  const hasDataTheme = await page.evaluate(() =>
    document.documentElement.hasAttribute("data-theme"),
  );
  expect(hasDataTheme).toBe(false);

  await expect(page.locator("img.header-logo--light")).toBeVisible();
  await expect(page.locator("img.header-logo--dark")).not.toBeVisible();
  await expect(page.locator("[data-theme-icon-moon]")).toBeVisible();
  await expect(page.locator("[data-theme-icon-sun]")).not.toBeVisible();
});

test("theme persists across navigation via localStorage", async ({ page }) => {
  await page.goto("/en");
  await page.locator("[data-theme-toggle]").click();

  const stored = await page.evaluate(() => localStorage.getItem("dtv-theme"));
  expect(stored).toBe("dark");

  await page.goto("/en/races");
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await expect(page.locator("img.header-logo--dark")).toBeVisible();
});

test("theme respects prefers-color-scheme: dark", async ({ browser }) => {
  const context = await browser.newContext({ colorScheme: "dark" });
  const page = await context.newPage();

  await page.goto("/en");
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");

  await context.close();
});

test("stored preference overrides prefers-color-scheme", async ({
  browser,
}) => {
  const context = await browser.newContext({ colorScheme: "dark" });
  const page = await context.newPage();

  await page.goto("/en");
  await page.evaluate(() => localStorage.setItem("dtv-theme", "light"));

  await page.goto("/en");

  const hasDataTheme = await page.evaluate(() =>
    document.documentElement.hasAttribute("data-theme"),
  );
  expect(hasDataTheme).toBe(false);

  await context.close();
});
