import { describe, expect, it } from "vitest";

import {
  filterDiscoveryCards,
  getDiscoveryCityOptions,
  getDiscoveryCountryOptions,
  paginateDiscoveryCards,
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
      city: "",
      year: "",
    });

    expect(result).toHaveLength(1);
  });

  it("filters cards by the ISO country value", () => {
    const result = filterDiscoveryCards(cards, {
      query: "",
      country: "es",
      city: "",
      year: "",
    });

    expect(result).toHaveLength(1);
  });

  it("paginates to at most visibleCount cards", () => {
    const manyCards = Array.from({ length: 5 }, (_, i) => ({
      ...cards[0],
      raceSlug: `race-${i}`,
      href: `/en/races/race-${i}/2026`,
    }));

    expect(paginateDiscoveryCards(manyCards, 3)).toHaveLength(3);
  });

  it("returns all cards when visibleCount exceeds length", () => {
    expect(paginateDiscoveryCards(cards, 100)).toHaveLength(1);
  });

  it("returns empty array for empty input", () => {
    expect(paginateDiscoveryCards([], 10)).toHaveLength(0);
  });

  it("returns no cards when query does not match", () => {
    const result = filterDiscoveryCards(cards, {
      query: "madrid",
      country: "",
      city: "",
      year: "",
    });

    expect(result).toHaveLength(0);
  });

  it("builds sorted unique city options", () => {
    const races = [
      cards[0],
      {
        ...cards[0],
        raceSlug: "malaga-half",
        meta: { ...cards[0].meta, city: "Málaga" },
      },
      {
        ...cards[0],
        raceSlug: "seville-half",
        meta: { ...cards[0].meta, city: "Seville" },
      },
    ];

    expect(getDiscoveryCityOptions(races)).toEqual([
      { value: "Málaga", label: "Málaga" },
      { value: "Seville", label: "Seville" },
    ]);
  });

  it("filters cards by city", () => {
    const result = filterDiscoveryCards(cards, {
      query: "",
      country: "",
      city: "Seville",
      year: "",
    });

    expect(result).toHaveLength(1);
  });

  it("returns no cards when city does not match", () => {
    const result = filterDiscoveryCards(cards, {
      query: "",
      country: "",
      city: "Madrid",
      year: "",
    });

    expect(result).toHaveLength(0);
  });

  it("composes city filter with other filters", () => {
    const multiCards = [
      cards[0],
      {
        ...cards[0],
        countryCode: "fr",
        raceSlug: "paris-marathon",
        meta: { ...cards[0].meta, city: "Paris" },
      },
    ];

    const result = filterDiscoveryCards(multiCards, {
      query: "",
      country: "es",
      city: "Seville",
      year: "2026",
    });

    expect(result).toHaveLength(1);
    expect(result[0].raceSlug).toBe("carrera-triana-los-remedios-10k");
  });
});
