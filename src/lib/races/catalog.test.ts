import { describe, expect, it } from "vitest";

import {
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
