import type { Locale } from "../../lib/config";
import type { RaceSummary } from "../../lib/races/catalog";

export type DiscoveryFilters = {
  query: string;
  country: string;
  year: string;
};

export type DiscoveryCard = RaceSummary & {
  href: string;
};

export const getDiscoveryCards = (
  locale: Locale,
  races: RaceSummary[],
): DiscoveryCard[] =>
  races.map((race) => ({
    ...race,
    href: `/${locale}/races/${race.raceSlug}/${race.year}`,
  }));

export const filterDiscoveryCards = (
  cards: DiscoveryCard[],
  filters: DiscoveryFilters,
): DiscoveryCard[] => {
  const normalizedQuery = filters.query.trim().toLowerCase();

  return cards.filter((card) => {
    const matchesQuery =
      normalizedQuery.length === 0 ||
      card.meta.name.toLowerCase().includes(normalizedQuery);
    const matchesCountry =
      filters.country.length === 0 || card.countryCode === filters.country;
    const matchesYear = filters.year.length === 0 || card.year === filters.year;

    return matchesQuery && matchesCountry && matchesYear;
  });
};
