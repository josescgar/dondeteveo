import { describe, expect, it } from "vitest";

import {
  filterDiscoveryCards,
  getDiscoveryCountryOptions,
} from "./race-discovery.logic";

const cards = [
  {
    countryCode: "es",
    raceSlug: "carrera-triana-los-remedios-10k",
    year: "2026",
    href: "/en/races/carrera-triana-los-remedios-10k/2026",
    upcoming: true,
    meta: {
      name: 'Triana - Los Remedios 10K "Torre Sevilla"',
      date: "2026-03-15",
      distanceKm: 10,
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
  it("builds localized country options sorted by visible label", () => {
    const races = [
      cards[0],
      {
        ...cards[0],
        countryCode: "fr",
        raceSlug: "paris-marathon",
      },
      {
        ...cards[0],
        countryCode: "ad",
        raceSlug: "andorra-run",
      },
      {
        ...cards[0],
        countryCode: "fr",
        raceSlug: "paris-half-marathon",
      },
    ];

    expect(getDiscoveryCountryOptions("en", races)).toEqual([
      { value: "ad", label: "Andorra" },
      { value: "fr", label: "France" },
      { value: "es", label: "Spain" },
    ]);

    expect(getDiscoveryCountryOptions("es", races)).toEqual([
      { value: "ad", label: "Andorra" },
      { value: "es", label: "Espa\u00f1a" },
      { value: "fr", label: "Francia" },
    ]);
  });

  it("filters cards by query", () => {
    const result = filterDiscoveryCards(cards, {
      query: "triana",
      country: "",
      year: "",
    });

    expect(result).toHaveLength(1);
  });

  it("filters cards by the ISO country value", () => {
    const result = filterDiscoveryCards(cards, {
      query: "",
      country: "es",
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
