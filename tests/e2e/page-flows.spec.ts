import { expect, test } from "@playwright/test";

test("homepage loads with hero and race search", async ({ page }) => {
  await page.goto("/en");

  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await expect(page.getByRole("heading", { level: 1 })).toContainText(
    "where should I see you",
  );

  const cta = page.getByRole("link", { name: "Find your race", exact: true });
  await expect(cta).toBeVisible();
  await expect(cta).toHaveAttribute("href", "/en/races");

  await expect(page.locator("#race-search")).toBeVisible();
  await expect(
    page.locator("#race-search").getByLabel(/Search/i),
  ).toBeVisible();
  await expect(page.locator(".race-row").first()).toBeVisible();
});

test("race listing shows races with working links", async ({ page }) => {
  await page.goto("/en/races");

  await expect(
    page.getByRole("heading", { level: 1, name: /Race discovery/i }),
  ).toBeVisible();
  await expect(page.getByLabel(/Search/i)).toBeVisible();
  await expect(page.locator(".race-row").first()).toBeVisible();

  await page.locator(".race-row").first().click();

  await expect(page).toHaveURL(/\/en\/races\/[\w-]+\/\d{4}/);
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
});

test("race detail shows info, map, and share planner", async ({ page }) => {
  await page.goto("/en/races/carrera-triana-los-remedios-10k/2026");

  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();

  const infoGrid = page.locator("[data-race-info-grid]");
  await expect(infoGrid).toBeVisible();
  await expect(infoGrid.locator("[data-race-info-field]")).not.toHaveCount(0);
  await expect(infoGrid).toContainText("Seville");

  await expect(page.locator('[data-map-mode="distance-only"]')).toBeVisible();

  await expect(page.getByLabel(/Mode/i)).toBeVisible();
  await expect(
    page.getByRole("link", { name: /Generate share link/i }),
  ).toBeVisible();
});

test("share planner generates URL with custom inputs", async ({ page }) => {
  await page.goto("/en/races/carrera-triana-los-remedios-10k/2026");

  const valueInput = page.getByLabel(/Pace per km/i);
  await valueInput.click();
  await page.keyboard.type("0630");

  await page.getByLabel(/Optional nickname/i).fill("TestRunner");

  const shareLink = page.getByRole("link", { name: /Generate share link/i });
  await expect(shareLink).toHaveAttribute("href", /mode=pace/);
  await expect(shareLink).toHaveAttribute("href", /value=06%3A30/);
  await expect(shareLink).toHaveAttribute("href", /name=TestRunner/);

  await shareLink.click();
  await expect(page).toHaveURL(
    /\/en\/share\/carrera-triana-los-remedios-10k\/2026#/,
  );
});

test("share view displays runner info and timing cards", async ({ page }) => {
  await page.goto(
    "/en/share/carrera-triana-los-remedios-10k/2026#mode=pace&value=06%3A00&name=Maria",
  );

  await expect(page.locator("#share-h1-name-slot")).toContainText("Maria");

  const cards = page.locator("[data-predicted-point-card]");
  await expect(cards.first()).toBeVisible();
  expect(await cards.count()).toBeGreaterThan(0);

  const firstCard = cards.first();
  await expect(firstCard.locator("h4")).toBeVisible();
  await expect(firstCard).toContainText("km");
  await expect(firstCard.getByText(/\d{2}:\d{2}/).first()).toBeVisible();

  await expect(page.locator("[data-share-map-section]")).toBeVisible();
  await expect(
    page.getByText(/All times are in the race.s local timezone\./i).first(),
  ).toBeVisible();
});
