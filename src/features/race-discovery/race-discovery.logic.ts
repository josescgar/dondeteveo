import type { Locale } from "../../lib/config";
import { formatCountryName } from "../../lib/format";
import { buildRacePath } from "../../lib/routes";
import type { RaceSummary } from "../../lib/races/catalog";

export type DiscoveryFilters = {
  query: string;
  country: string;
  year: string;
};

export type DiscoveryCard = RaceSummary & {
  href: string;
};

export type DiscoveryCountryOption = {
  value: string;
  label: string;
};

export const getDiscoveryCards = (
  locale: Locale,
  races: RaceSummary[],
): DiscoveryCard[] =>
  races.map((race) => ({
    ...race,
    href: buildRacePath(locale, race.raceSlug, race.year),
  }));

export const getDiscoveryCountryOptions = (
  locale: Locale,
  races: RaceSummary[],
): DiscoveryCountryOption[] =>
  [...new Set(races.map((race) => race.countryCode))]
    .map((countryCode) => ({
      value: countryCode,
      label: formatCountryName(countryCode, locale),
    }))
    .sort(
      (left, right) =>
        left.label.localeCompare(right.label, locale) ||
        left.value.localeCompare(right.value),
    );

export const paginateDiscoveryCards = (
  cards: DiscoveryCard[],
  visibleCount: number,
): DiscoveryCard[] => cards.slice(0, visibleCount);

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
