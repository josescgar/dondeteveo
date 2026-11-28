import { expect, test } from "@playwright/test";

// Valencia 2026 has 9 waves, six cheer points and a Spanish official site
// override. `e2e-provisional-10k` (tests/fixtures/data) has a past 2025
// edition and an upcoming 2099 edition, so the past/upcoming links stay
// deterministic whatever the date.
const VALENCIA_ES = "/es/races/valencia-marathon/2026/";
const FIXTURE_RACE = "e2e-provisional-10k";

test("edition page has spectator sections under H2s in race local time", async ({
  page,
}) => {
  await page.goto(VALENCIA_ES);

  await expect(page).toHaveTitle(
    "Maratón Valencia Trinidad Alfonso Zurich 2026: dónde animar",
  );
  await expect(page.locator('meta[name="description"]')).toHaveAttribute(
    "content",
    /dónde animar el 6 de diciembre de 2026 en Valencia/,
  );

  // Count in the light DOM only: the Astro dev toolbar adds its own
  // headings inside a shadow root.
  expect(
    await page.evaluate(() => document.querySelectorAll("h1").length),
  ).toBe(1);
  for (const name of [
    "Vista general del recorrido",
    "Dónde animar",
    "Horarios de salida",
    "Preguntas frecuentes",
  ]) {
    await expect(
      // The "// " eyebrow prefix is CSS generated content.
      page.getByRole("heading", { level: 2, name: new RegExp(`${name}$`) }),
    ).toBeVisible();
  }

  const startTimes = page.locator('[data-edition-section="start-times"]');
  await expect(startTimes).toContainText("Europe/Madrid");
  await expect(startTimes.locator("[data-start-time-row]")).toHaveCount(9);
  await expect(startTimes).toContainText("Oleada 1 (menos de 2:50)");
  await expect(startTimes).toContainText("09:35");

  const whereToWatch = page.locator('[data-edition-section="where-to-watch"]');
  await expect(whereToWatch).toContainText("Plaza del Ayuntamiento");
  await expect(whereToWatch).toContainText("30,5 km");
  await expect(whereToWatch).not.toContainText("Punto para animar - ");

  await expect(page.locator('[data-edition-section="faq"] h3')).toHaveCount(5);

  await expect(page.locator("[data-official-website]")).toHaveAttribute(
    "href",
    "https://www.valenciaciudaddelrunning.com/maraton/presentacion/",
  );
});

test("English edition page keeps the English official site", async ({
  page,
}) => {
  await page.goto("/en/races/valencia-marathon/2026/");

  await expect(page.locator("[data-official-website]")).toHaveAttribute(
    "href",
    "https://www.valenciaciudaddelrunning.com/en/marathon/presentation/",
  );
  await expect(
    page.locator('[data-edition-section="start-times"]'),
  ).toContainText("Wave 1 (under 2:50)");
});

test("past edition points to the upcoming edition and lists siblings", async ({
  page,
}) => {
  await page.goto(`/en/races/${FIXTURE_RACE}/2025/`);

  const pointer = page.locator("[data-upcoming-edition-pointer]");
  await expect(pointer).toBeVisible();
  await expect(pointer).toHaveAttribute(
    "href",
    `/en/races/${FIXTURE_RACE}/2099/`,
  );

  const otherEditions = page.locator('[data-edition-section="other-editions"]');
  await expect(
    otherEditions.locator(`a[href="/en/races/${FIXTURE_RACE}/2099/"]`),
  ).toBeVisible();

  await page.goto(`/en/races/${FIXTURE_RACE}/2099/`);
  await expect(page.locator("[data-upcoming-edition-pointer]")).toHaveCount(0);
  await expect(
    page
      .locator('[data-edition-section="other-editions"]')
      .locator(`a[href="/en/races/${FIXTURE_RACE}/2025/"]`),
  ).toBeVisible();
});

test("related races never link the current race and cap at six", async ({
  page,
}) => {
  await page.goto(VALENCIA_ES);

  const links = page.locator('[data-edition-section="more-races"] a');
  const count = await links.count();
  expect(count).toBeGreaterThan(0);
  expect(count).toBeLessThanOrEqual(6);
  const hrefs = await links.evaluateAll((anchors) =>
    anchors.map((anchor) => anchor.getAttribute("href") ?? ""),
  );
  expect(hrefs.some((href) => href.includes("/valencia-marathon/"))).toBe(
    false,
  );
});

test("edition page has no horizontal scroll", async ({ page }) => {
  for (const url of [
    VALENCIA_ES,
    `/es/races/${FIXTURE_RACE}/2025/`,
    "/en/races/san-silvestre-vallecana-10k/2026/",
  ]) {
    await page.goto(url);
    const overflow = await page.evaluate(
      () =>
        document.documentElement.scrollWidth -
        document.documentElement.clientWidth,
    );
    expect(overflow, url).toBeLessThanOrEqual(0);
  }
});
