import { expect, test } from "@playwright/test";

// `e2e-provisional-10k` is a test-only race served from tests/fixtures/data
// (see RACE_DATA_FIXTURES_DIR in playwright.config.ts): a confirmed 2025
// edition and a 2099 edition created with `npm run data:rollover`, whose route
// and start time are provisional.
const RACE = "e2e-provisional-10k";
const PROVISIONAL_YEAR = "2099";
const SHARE_FRAGMENT = "#mode=pace&value=05%3A30&name=Pepe";

test("race page shows the provisional notice for route and start time", async ({
  page,
}) => {
  await page.goto(`/en/races/${RACE}/${PROVISIONAL_YEAR}/`);

  const pageNotice = page
    .locator("[data-provisional-notice]")
    .filter({ has: page.locator("[data-provisional-fact]") });
  await expect(pageNotice).toBeVisible();
  await expect(pageNotice).toContainText("Pending confirmation");
  await expect(
    pageNotice.locator('[data-provisional-fact="route"]'),
  ).toContainText("Course from the previous edition, pending confirmation.");
  await expect(
    pageNotice.locator('[data-provisional-fact="startTime"]'),
  ).toContainText("Start time pending confirmation.");

  const plannerNotice = page
    .locator("form")
    .locator("[data-provisional-notice]");
  await expect(plannerNotice).toBeVisible();
  await expect(plannerNotice).toContainText(
    "Predicted times are based on these provisional details.",
  );

  // Provisional editions stay indexable like any other edition.
  await expect(page.locator('meta[name="robots"]')).toHaveCount(0);
});

test("race page shows the provisional notice in Spanish", async ({ page }) => {
  await page.goto(`/es/races/${RACE}/${PROVISIONAL_YEAR}/`);

  const pageNotice = page
    .locator("[data-provisional-notice]")
    .filter({ has: page.locator("[data-provisional-fact]") });
  await expect(pageNotice).toContainText("Pendiente de confirmación");
  await expect(pageNotice).toContainText(
    "Recorrido de la edición anterior, pendiente de confirmación.",
  );
  await expect(pageNotice).toContainText(
    "Hora de salida pendiente de confirmación.",
  );
});

test("share view shows the provisional notice next to predicted times", async ({
  page,
}) => {
  await page.goto(`/en/share/${RACE}/${PROVISIONAL_YEAR}/${SHARE_FRAGMENT}`);

  const notice = page.locator("[data-provisional-notice]");
  await expect(notice).toBeVisible();
  await expect(notice.locator('[data-provisional-fact="route"]')).toBeVisible();
  await expect(
    notice.locator('[data-provisional-fact="startTime"]'),
  ).toBeVisible();
  await expect(notice).toContainText(
    "Links shared now will show the updated times once they are confirmed.",
  );
  await expect(
    page.locator("[data-predicted-point-card]").first(),
  ).toBeVisible();
});

test("convenience race route redirects to an upcoming provisional edition", async ({
  page,
}) => {
  await page.goto(`/en/races/${RACE}/`);

  await expect(page).toHaveURL(
    new RegExp(`/en/races/${RACE}/${PROVISIONAL_YEAR}/$`),
  );
});

test("confirmed editions show no provisional notice", async ({ page }) => {
  await page.goto(`/en/races/${RACE}/2025/`);
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await expect(page.locator("[data-provisional-notice]")).toHaveCount(0);

  await page.goto(`/en/share/${RACE}/2025/${SHARE_FRAGMENT}`);
  await expect(
    page.locator("[data-predicted-point-card]").first(),
  ).toBeVisible();
  await expect(page.locator("[data-provisional-notice]")).toHaveCount(0);
});
