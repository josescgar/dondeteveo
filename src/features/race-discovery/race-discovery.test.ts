import { describe, expect, it } from "vitest";

import { filterDiscoveryCards } from "./race-discovery.logic";

const cards = [
  {
    countryCode: "es",
    raceSlug: "sevilla-half-marathon",
    year: "2026",
    href: "/en/races/sevilla-half-marathon/2026",
    upcoming: true,
    meta: {
      name: "Zurich Seville Half Marathon",
      date: "2026-01-25",
      distanceKm: 21.0975,
      city: "Seville",
      startTime: "09:00",
      timezone: "Europe/Madrid",
      officialWebsiteUrl: "https://example.com",
      summary: "Summary",
      heroNote: "Hero note",
    },
  },
];

describe("race discovery logic", () => {
  it("filters cards by query", () => {
    const result = filterDiscoveryCards(cards, {
      query: "seville",
      country: "",
      year: "",
    });

    expect(result).toHaveLength(1);
  });

  it("returns no cards when query does not match", () => {
    const result = filterDiscoveryCards(cards, {
      query: "madrid",
      country: "",
      year: "",
    });

    expect(result).toHaveLength(0);
  });
});
