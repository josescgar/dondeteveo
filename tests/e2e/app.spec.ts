import { expect, test } from "@playwright/test";

const expectNoHorizontalOverflow = async (
  page: import("@playwright/test").Page,
) => {
  const hasOverflow = await page.evaluate(
    () => document.documentElement.scrollWidth > window.innerWidth,
  );

  expect(hasOverflow).toBe(false);
};

const clickRouteLineCenter = async (
  page: import("@playwright/test").Page,
  selector: string,
) => {
  const routeLine = page.locator(selector);

  await expect(routeLine).toHaveCount(1);

  await routeLine.evaluate((element) => {
    const path = element as SVGPathElement;
    const matrix = path.getScreenCTM();

    if (!matrix) {
      return;
    }

    const midpoint = path.getPointAtLength(path.getTotalLength() / 2);
    const screenPoint = new DOMPoint(midpoint.x, midpoint.y).matrixTransform(
      matrix,
    );
    path.dispatchEvent(
      new MouseEvent("click", {
        bubbles: true,
        cancelable: true,
        clientX: screenPoint.x,
        clientY: screenPoint.y,
        screenX: screenPoint.x,
        screenY: screenPoint.y,
        view: window,
      }),
    );
  });
};

const getFieldBoxes = async (page: import("@playwright/test").Page) =>
  page.locator("[data-race-info-field]").evaluateAll((elements) =>
    elements.map((element) => {
      const { top, left, width, height } = element.getBoundingClientRect();

      return { top, left, width, height };
    }),
  );

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

test("share page shows safety margin subtitles for pace and finish plans", async ({
  page,
}) => {
  await page.goto(
    "/en/share/carrera-triana-los-remedios-10k/2026#mode=pace&value=05%3A00&name=Pepe",
  );
  await expect(
    page.getByText(/^\(±5mins, \d{2}:\d{2} - \d{2}:\d{2}\)$/).first(),
  ).toBeVisible();

  await page.goto(
    "/en/share/carrera-triana-los-remedios-10k/2026#mode=finish&value=00%3A50%3A00&name=Pepe",
  );
  await expect(
    page.getByText(/^\(±5mins, \d{2}:\d{2} - \d{2}:\d{2}\)$/).first(),
  ).toBeVisible();
});

test("share page lets spectators inspect any tapped route point", async ({
  page,
}) => {
  await page.goto(
    "/en/share/carrera-triana-los-remedios-10k/2026#mode=pace&value=05%3A00&name=Pepe",
  );

  const map = page.locator('[data-map-mode="spectator"]');

  await map.scrollIntoViewIfNeeded();
  await clickRouteLineCenter(
    page,
    '[data-map-mode="spectator"] .dtv-route-hit-area',
  );

  await expect(page.locator("[data-route-selection-panel]")).toBeVisible();
  await expect(page.locator("[data-route-selection-distance]")).toContainText(
    "km",
  );
  await expect(page.locator("[data-route-selection-time]")).toHaveText(
    /\d{2}:\d{2}/,
  );
  await expect(page.locator("[data-route-selection-time]")).toContainText(/±5/);

  await page.locator("[data-route-selection-dismiss]").click();
  await expect(page.locator("[data-route-selection-panel]")).toHaveCount(0);

  await clickRouteLineCenter(
    page,
    '[data-map-mode="spectator"] .dtv-route-hit-area',
  );
  await expect(page.locator("[data-route-selection-panel]")).toBeVisible();

  const mapBox = await map.boundingBox();

  if (!mapBox) {
    throw new Error("Could not resolve spectator map bounds");
  }

  await map.click({ position: { x: mapBox.width - 12, y: 12 } });
  await expect(page.locator("[data-route-selection-panel]")).toHaveCount(0);

  await page.locator("[data-map-fullscreen-toggle]").click();
  await expect
    .poll(() => page.evaluate(() => Boolean(document.fullscreenElement)))
    .toBe(true);
  await page.locator("[data-map-fullscreen-toggle]").click();
  await expect
    .poll(() => page.evaluate(() => Boolean(document.fullscreenElement)))
    .toBe(false);
});

test("share page time cards focus the matching map marker", async ({
  page,
}) => {
  await page.goto(
    "/en/share/carrera-triana-los-remedios-10k/2026#mode=pace&value=05%3A00&name=Pepe",
  );

  const mapSection = page.locator("[data-share-map-section]");
  const firstCard = page.locator("[data-predicted-point-card]").first();
  const pointLabel = (await firstCard.locator("h4").textContent())?.trim();
  const initialMapTop = await mapSection.evaluate((element) =>
    Math.round(element.getBoundingClientRect().top),
  );

  await firstCard.click();

  await expect(firstCard).toHaveAttribute("data-selected", "true");
  await expect
    .poll(() =>
      mapSection.evaluate((element) =>
        Math.round(element.getBoundingClientRect().top),
      ),
    )
    .toBeLessThan(initialMapTop);
  await expect
    .poll(() =>
      mapSection.evaluate((element) => {
        const rect = element.getBoundingClientRect();
        return rect.top < window.innerHeight && rect.bottom > 0;
      }),
    )
    .toBe(true);
  await expect(page.locator("[data-route-selection-panel]")).toBeVisible();
  await expect(page.locator("[data-route-selection-primary]")).toHaveText(
    pointLabel ?? "",
  );
  await expect(page.locator("[data-point-selection-detail]")).toBeVisible();
  await expect(page.locator("[data-route-selection-distance]")).toHaveCount(0);

  await page.locator("[data-route-selection-dismiss]").click();
  await expect(page.locator("[data-route-selection-panel]")).toHaveCount(0);
  await expect(firstCard).toHaveAttribute("data-selected", "false");
});

test("race detail map shows only distance for tapped route points", async ({
  page,
}) => {
  await page.goto("/en/races/carrera-triana-los-remedios-10k/2026");

  const map = page.locator('[data-map-mode="distance-only"]');

  await map.scrollIntoViewIfNeeded();
  await clickRouteLineCenter(
    page,
    '[data-map-mode="distance-only"] .dtv-route-hit-area',
  );

  await expect(page.locator("[data-route-selection-panel]")).toBeVisible();
  await expect(page.locator("[data-route-selection-distance]")).toContainText(
    "km",
  );
  await expect(page.locator("[data-route-selection-time]")).toHaveCount(0);
  await expect(page.locator("[data-point-selection-detail]")).toHaveCount(0);
});

test("race detail info fields stay aligned across breakpoints", async ({
  page,
}, testInfo) => {
  await page.goto("/es/races/carrera-triana-los-remedios-5k/2026");

  const infoGrid = page.locator("[data-race-info-grid]");
  await expect(infoGrid).toBeVisible();
  await expect(infoGrid.locator("[data-race-info-field]")).toHaveCount(3);

  const fieldBoxes = await getFieldBoxes(page);

  expect(fieldBoxes).toHaveLength(3);
  await expectNoHorizontalOverflow(page);

  if (testInfo.project.name.includes("mobile")) {
    expect(
      Math.max(...fieldBoxes.map((box) => box.left)) -
        Math.min(...fieldBoxes.map((box) => box.left)),
    ).toBeLessThan(1);
    expect(fieldBoxes[0]?.top).toBeLessThan(fieldBoxes[1]?.top ?? 0);
    expect(fieldBoxes[1]?.top).toBeLessThan(fieldBoxes[2]?.top ?? 0);
    return;
  }

  expect(
    Math.max(...fieldBoxes.map((box) => box.top)) -
      Math.min(...fieldBoxes.map((box) => box.top)),
  ).toBeLessThan(1);
  expect(fieldBoxes[0]?.left).toBeLessThan(fieldBoxes[1]?.left ?? 0);
  expect(fieldBoxes[1]?.left).toBeLessThan(fieldBoxes[2]?.left ?? 0);
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

test("mobile share map supports route taps", async ({ page }, testInfo) => {
  test.skip(
    !testInfo.project.name.includes("mobile"),
    "Mobile-only route selection test",
  );

  await page.goto(
    "/en/share/carrera-triana-los-remedios-10k/2026#mode=pace&value=05%3A00&name=Pepe",
  );

  const map = page.locator('[data-map-mode="spectator"]');

  await map.scrollIntoViewIfNeeded();
  await clickRouteLineCenter(
    page,
    '[data-map-mode="spectator"] .dtv-route-hit-area',
  );
  await expect(page.locator("[data-route-selection-panel]")).toBeVisible();
  await expect(page.locator("[data-route-selection-distance]")).toContainText(
    "km",
  );
  await expect(page.locator("[data-route-selection-time]")).toHaveText(
    /\d{2}:\d{2}/,
  );
  await expectNoHorizontalOverflow(page);
});

test("mobile share time cards scroll to the focused map marker", async ({
  page,
}, testInfo) => {
  test.skip(
    !testInfo.project.name.includes("mobile"),
    "Mobile-only time card focus test",
  );

  await page.goto(
    "/en/share/carrera-triana-los-remedios-10k/2026#mode=pace&value=05%3A00&name=Pepe",
  );

  const mapSection = page.locator("[data-share-map-section]");
  const firstCard = page.locator("[data-predicted-point-card]").first();
  const pointLabel = (await firstCard.locator("h4").textContent())?.trim();
  const initialMapTop = await mapSection.evaluate((element) =>
    Math.round(element.getBoundingClientRect().top),
  );

  await firstCard.click();

  await expect
    .poll(() =>
      mapSection.evaluate((element) =>
        Math.round(element.getBoundingClientRect().top),
      ),
    )
    .toBeLessThan(initialMapTop);
  await expect
    .poll(() =>
      mapSection.evaluate((element) => {
        const rect = element.getBoundingClientRect();
        return rect.top < window.innerHeight && rect.bottom > 0;
      }),
    )
    .toBe(true);
  await expect(page.locator("[data-route-selection-panel]")).toBeVisible();
  await expect(page.locator("[data-route-selection-primary]")).toHaveText(
    pointLabel ?? "",
  );
  await expect(page.locator("[data-point-selection-detail]")).toBeVisible();
  await expectNoHorizontalOverflow(page);
});
