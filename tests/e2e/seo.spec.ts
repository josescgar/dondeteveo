import { expect, test, type Page } from "@playwright/test";

const readJsonLdTypes = async (page: Page): Promise<string[]> => {
  const scripts = await page
    .locator('script[type="application/ld+json"]')
    .allTextContents();
  return scripts.flatMap((script) => {
    const document = JSON.parse(script) as {
      "@type"?: string;
      "@graph"?: { "@type": string }[];
    };
    return document["@graph"]
      ? document["@graph"].map((node) => node["@type"])
      : [document["@type"] ?? ""];
  });
};

test("homepage emits WebSite and Organization structured data", async ({
  page,
}) => {
  await page.goto("/es/");

  expect(await readJsonLdTypes(page)).toEqual(["WebSite", "Organization"]);
  await expect(page).toHaveTitle(/Dónde animar/);
  await expect(
    page.locator('link[rel="alternate"][hreflang="x-default"]'),
  ).toHaveAttribute("href", "https://dondeteveo.com/en/");
});

test("race edition emits SportsEvent and BreadcrumbList", async ({ page }) => {
  await page.goto("/en/races/carrera-triana-los-remedios-10k/2026/");

  expect(await readJsonLdTypes(page)).toEqual([
    "SportsEvent",
    "BreadcrumbList",
  ]);
});

test("noindex share page emits no structured data and spaces its heading", async ({
  page,
}) => {
  await page.goto("/es/share/carrera-triana-los-remedios-10k/2026/");

  expect(await readJsonLdTypes(page)).toEqual([]);
  await expect(page.locator("#share-h1-static")).toContainText(
    "Dónde animar en la Carrera",
  );
});

test("footer links to Privacy and Contribute", async ({ page }) => {
  await page.goto("/en/");

  const footer = page.locator("footer");
  await expect(
    footer.getByRole("link", { name: "Privacy", exact: true }),
  ).toHaveAttribute("href", "/en/privacy/");
  await expect(
    footer.getByRole("link", { name: "Contribute", exact: true }),
  ).toHaveAttribute("href", "/en/contribute/");
});
