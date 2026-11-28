import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

import { describe, expect, it } from "vitest";

import {
  createLastmodResolver,
  listEditionDirectories,
  resolveLastmodSources,
} from "./sitemap-lastmod";

describe("missing data folder", () => {
  it("falls back to the build time instead of throwing", () => {
    const root = mkdtempSync(path.join(tmpdir(), "dtv-lastmod-"));
    try {
      const fallback = new Date("2026-11-28T00:00:00Z");

      expect(listEditionDirectories(root).size).toBe(0);
      const resolve = createLastmodResolver(root, fallback);
      expect(
        resolve("https://dondeteveo.com/en/races/valencia-marathon/2026/"),
      ).toBe(fallback.toISOString());
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
});

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
