import { afterEach, describe, expect, it, vi } from "vitest";

import {
  FIXTURE_DATA_DIRECTORY_ENV,
  getAllRaceEditions,
  getDistinctRaces,
  getMostRelevantEdition,
  getRaceEdition,
} from "./catalog";

describe("race catalog", () => {
  it("loads a real race edition", async () => {
    const edition = await getRaceEdition(
      "carrera-triana-los-remedios-10k",
      "2026",
    );

    expect(edition?.meta.name).toBe(
      'Triana - Los Remedios 10K "Torre Sevilla"',
    );
    expect(edition?.meta.timezone).toBe("Europe/Madrid");
  });

  it("returns distinct race slugs across loaded editions", async () => {
    const editions = await getAllRaceEditions();
    const distinctRaces = await getDistinctRaces();
    const expectedDistinctRaces = [
      ...new Set(editions.map((edition) => edition.raceSlug)),
    ].sort();

    expect(distinctRaces).toEqual(expectedDistinctRaces);
  });

  it("returns the most relevant edition for a race", async () => {
    const edition = await getMostRelevantEdition(
      "carrera-triana-los-remedios-10k",
    );

    expect(edition?.year).toBe("2026");
  });
});

describe("race catalog test fixtures", () => {
  const FIXTURE_RACE = "e2e-provisional-10k";

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("ignores fixtures unless the fixture directory is configured", async () => {
    vi.stubEnv(FIXTURE_DATA_DIRECTORY_ENV, "");

    expect(await getDistinctRaces()).not.toContain(FIXTURE_RACE);
  });

  it("merges valid fixture editions, including a provisional one", async () => {
    vi.stubEnv(FIXTURE_DATA_DIRECTORY_ENV, "tests/fixtures/data");

    const provisional = await getRaceEdition(FIXTURE_RACE, "2099");
    expect(provisional?.meta.provisional).toEqual({
      route: true,
      startTime: true,
    });
    expect((await getMostRelevantEdition(FIXTURE_RACE))?.year).toBe("2099");
    expect(
      (await getRaceEdition(FIXTURE_RACE, "2025"))?.meta.provisional,
    ).toBeUndefined();
  });

  it("ignores the fixture directory outside dev mode, as in astro build", async () => {
    vi.stubEnv(FIXTURE_DATA_DIRECTORY_ENV, "tests/fixtures/data");
    vi.stubEnv("DEV", false);
    vi.stubEnv("PROD", true);

    expect(await getDistinctRaces()).not.toContain(FIXTURE_RACE);
  });
});
