import { describe, expect, it } from "vitest";

import {
  getAllRaceEditions,
  getDistinctRaces,
  getMostRelevantEdition,
  getRaceEdition,
} from "./catalog";

describe("race catalog", () => {
  it("loads the sample race edition", async () => {
    const edition = await getRaceEdition("sevilla-half-marathon", "2026");

    expect(edition?.meta.name).toBe("Zurich Seville Half Marathon");
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
    const edition = await getMostRelevantEdition("sevilla-half-marathon");

    expect(edition?.year).toBe("2026");
  });
});
