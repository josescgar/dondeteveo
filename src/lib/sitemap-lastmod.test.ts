import { describe, expect, it } from "vitest";

import { resolveLastmodSources } from "./sitemap-lastmod";

const editionDirectories = new Map([
  ["valencia-marathon/2026", "data/es/valencia-marathon/2026"],
]);

describe("resolveLastmodSources", () => {
  it("dates edition pages by their data folder", () => {
    expect(
      resolveLastmodSources(
        "/en/races/valencia-marathon/2026/",
        editionDirectories,
      ),
    ).toEqual(["data/es/valencia-marathon/2026"]);
  });

  it("dates homepages and race listings by the whole catalog", () => {
    expect(resolveLastmodSources("/es/", editionDirectories)).toEqual(["data"]);
    expect(resolveLastmodSources("/en/races/", editionDirectories)).toEqual([
      "data",
    ]);
  });

  it("dates static pages by their page source", () => {
    expect(resolveLastmodSources("/es/privacy/", editionDirectories)).toEqual([
      "src/pages/[locale]/privacy.astro",
    ]);
  });

  it("returns null for unknown routes so the fallback applies", () => {
    expect(
      resolveLastmodSources("/en/races/unknown/2026/", editionDirectories),
    ).toBeNull();
    expect(resolveLastmodSources("/", editionDirectories)).toBeNull();
    expect(
      resolveLastmodSources("/en/somewhere/else/", editionDirectories),
    ).toBeNull();
  });
});
