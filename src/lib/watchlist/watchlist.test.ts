import { mkdtemp, readdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import {
  discoverySourcesFileSchema,
  watchedRaceSchema,
  type WatchedRace,
} from "./schemas";
import { loadDiscoverySources, loadWatchedRaces } from "./watchlist";

const DATA_DIRECTORY = path.join(process.cwd(), "data");

const unknownFact = { value: null, sourceUrl: null, checkedOn: null };

const buildRace = (overrides: Partial<WatchedRace> = {}): WatchedRace => ({
  slug: "example-10k",
  countryCode: "es",
  name: "Example 10K",
  city: "Seville",
  distanceKm: 10,
  catalogStatus: "candidate",
  trackingIssue: 1,
  usualMonth: 3,
  officialWebsiteUrl: "https://example.com/",
  coursePageUrl: null,
  regulationsUrl: null,
  trackSource: {
    type: "none",
    url: null,
    loginRequired: null,
    checkedOn: null,
    notes: "Not checked yet.",
  },
  nextEdition: {
    year: 2027,
    date: {
      value: "2027-03-14",
      sourceUrl: "https://example.com/",
      checkedOn: "2026-11-27",
    },
    startTime: unknownFact,
    waves: unknownFact,
    routeConfirmed: unknownFact,
  },
  ...overrides,
});

const getCatalogRaces = async (): Promise<
  { countryCode: string; slug: string }[]
> => {
  const races: { countryCode: string; slug: string }[] = [];
  const countries = await readdir(DATA_DIRECTORY, { withFileTypes: true });
  for (const country of countries.filter((entry) => entry.isDirectory())) {
    const slugs = await readdir(path.join(DATA_DIRECTORY, country.name), {
      withFileTypes: true,
    });
    for (const slug of slugs.filter((entry) => entry.isDirectory())) {
      races.push({ countryCode: country.name, slug: slug.name });
    }
  }
  return races;
};

describe("watched race schema", () => {
  it("accepts a valid race", () => {
    expect(watchedRaceSchema.safeParse(buildRace()).success).toBe(true);
  });

  it("rejects a known fact without a source URL and check date", () => {
    const race = buildRace();
    const result = watchedRaceSchema.safeParse({
      ...race,
      nextEdition: {
        ...race.nextEdition,
        startTime: { value: "09:00", sourceUrl: null, checkedOn: null },
      },
    });
    expect(result.success).toBe(false);
  });

  it("accepts an unknown fact that records where it was checked", () => {
    const race = buildRace();
    const result = watchedRaceSchema.safeParse({
      ...race,
      nextEdition: {
        ...race.nextEdition,
        startTime: {
          value: null,
          sourceUrl: "https://example.com/",
          checkedOn: "2026-11-27",
        },
      },
    });
    expect(result.success).toBe(true);
  });

  it("rejects a next edition date outside the next edition year", () => {
    const race = buildRace();
    const result = watchedRaceSchema.safeParse({
      ...race,
      nextEdition: { ...race.nextEdition, year: 2028 },
    });
    expect(result.success).toBe(false);
  });

  it("rejects invalid dates, times and months", () => {
    const race = buildRace();
    expect(
      watchedRaceSchema.safeParse({
        ...race,
        nextEdition: {
          ...race.nextEdition,
          date: { ...race.nextEdition.date, value: "2027-02-30" },
        },
      }).success,
    ).toBe(false);
    expect(
      watchedRaceSchema.safeParse({
        ...race,
        nextEdition: {
          ...race.nextEdition,
          startTime: {
            value: "25:00",
            sourceUrl: "https://example.com/",
            checkedOn: "2026-11-27",
          },
        },
      }).success,
    ).toBe(false);
    expect(
      watchedRaceSchema.safeParse({ ...race, usualMonth: 13 }).success,
    ).toBe(false);
  });

  it("rejects a URL on a track source of type none", () => {
    const race = buildRace();
    const result = watchedRaceSchema.safeParse({
      ...race,
      trackSource: { ...race.trackSource, url: "https://example.com/a.gpx" },
    });
    expect(result.success).toBe(false);
  });

  it("rejects unknown track source types and unknown fields", () => {
    const race = buildRace();
    expect(
      watchedRaceSchema.safeParse({
        ...race,
        trackSource: { ...race.trackSource, type: "garmin" },
      }).success,
    ).toBe(false);
    expect(
      watchedRaceSchema.safeParse({ ...race, unexpected: true }).success,
    ).toBe(false);
  });
});

describe("discovery sources schema", () => {
  const source = {
    id: "example",
    name: "Example calendar",
    url: "https://example.com/",
    countryCode: "es",
    coverage: "Road races in Spain.",
    howToRead: "Filter by distance.",
    verifiedOn: "2026-11-27",
  };

  it("accepts a valid file", () => {
    expect(
      discoverySourcesFileSchema.safeParse({ sources: [source] }).success,
    ).toBe(true);
  });

  it("rejects duplicate ids", () => {
    expect(
      discoverySourcesFileSchema.safeParse({ sources: [source, source] })
        .success,
    ).toBe(false);
  });
});

describe("watchlist loader", () => {
  let directory: string | undefined;

  afterEach(async () => {
    if (directory) {
      await rm(directory, { recursive: true, force: true });
      directory = undefined;
    }
  });

  it("rejects a file not named after its slug", async () => {
    directory = await mkdtemp(path.join(tmpdir(), "watchlist-"));
    await writeFile(
      path.join(directory, "other-name.json"),
      JSON.stringify(buildRace()),
    );
    await expect(loadWatchedRaces(directory)).rejects.toThrow(
      /must be named after its slug/,
    );
  });

  it("reports which file is invalid", async () => {
    directory = await mkdtemp(path.join(tmpdir(), "watchlist-"));
    await writeFile(
      path.join(directory, "example-10k.json"),
      JSON.stringify({ ...buildRace(), distanceKm: -1 }),
    );
    await expect(loadWatchedRaces(directory)).rejects.toThrow(
      /Invalid watched race example-10k\.json/,
    );
  });
});

describe("watchlist registry files", () => {
  it("validates every watched race file", async () => {
    const races = await loadWatchedRaces();
    expect(races.length).toBeGreaterThan(0);
  });

  it("validates the discovery sources file", async () => {
    const sources = await loadDiscoverySources();
    expect(sources.length).toBeGreaterThan(0);
  });

  it("watches every race in the catalog with status in-catalog", async () => {
    const races = await loadWatchedRaces();
    const catalogRaces = await getCatalogRaces();

    for (const { countryCode, slug } of catalogRaces) {
      const watched = races.find((race) => race.slug === slug);
      expect(watched, `missing watchlist entry for ${slug}`).toBeDefined();
      expect(watched?.catalogStatus, slug).toBe("in-catalog");
      expect(watched?.countryCode, slug).toBe(countryCode);
    }
  });

  it("marks only races present in the catalog as in-catalog", async () => {
    const races = await loadWatchedRaces();
    const catalogSlugs = new Set(
      (await getCatalogRaces()).map((race) => race.slug),
    );

    for (const race of races) {
      expect(catalogSlugs.has(race.slug), race.slug).toBe(
        race.catalogStatus === "in-catalog",
      );
    }
  });
});
