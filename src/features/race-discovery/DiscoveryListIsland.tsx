import { useMemo, useState } from "preact/hooks";

import { getDictionary } from "../../lib/i18n";
import {
  formatDistance,
  formatRaceDate,
  getTodayInTimeZone,
} from "../../lib/format";
import { DISCOVERY_PAGE_SIZE, type Locale } from "../../lib/config";
import { buildContributePath } from "../../lib/routes";
import type { RaceSummary } from "../../lib/races/catalog";
import {
  filterDiscoveryCards,
  getDiscoveryCards,
  getDiscoveryCityOptions,
  getDiscoveryCountryOptions,
  paginateDiscoveryCards,
} from "./race-discovery.logic";

type Props = {
  locale: Locale;
  races: RaceSummary[];
};

const inputClass =
  "w-full border-b border-line-solid bg-transparent px-0 py-2 font-mono text-sm text-text outline-none transition focus:border-accent";

export default function DiscoveryListIsland({ locale, races }: Props) {
  const dictionary = getDictionary(locale);
  const [query, setQuery] = useState("");
  const [country, setCountry] = useState("");
  const [city, setCity] = useState("");
  const [year, setYear] = useState("");
  const [includePast, setIncludePast] = useState(false);
  const [visibleCount, setVisibleCount] = useState(DISCOVERY_PAGE_SIZE);

  const cards = useMemo(
    () => getDiscoveryCards(locale, races),
    [locale, races],
  );
  const filteredCards = useMemo(
    () =>
      filterDiscoveryCards(cards, { query, country, city, year, includePast }),
    [cards, country, city, query, year, includePast],
  );
  const visibleCards = useMemo(
    () => paginateDiscoveryCards(filteredCards, visibleCount),
    [filteredCards, visibleCount],
  );
  const availableCountries = useMemo(
    () => getDiscoveryCountryOptions(locale, races),
    [locale, races],
  );
  const availableCities = useMemo(() => {
    const filteredRaces = country
      ? races.filter((race) => race.countryCode === country)
      : races;
    return getDiscoveryCityOptions(filteredRaces, locale);
  }, [races, country, locale]);

  const availableYears = [...new Set(races.map((race) => race.year))].sort();

  return (
    <div class="space-y-6">
      <div class="grid gap-6 md:grid-cols-[2fr_1fr_1fr]">
        <label class="flex flex-col gap-1.5">
          <span class="text-muted font-mono text-[10px] tracking-[0.26em] uppercase">
            {dictionary.search}
          </span>
          <input
            type="search"
            value={query}
            onInput={(event) => {
              setQuery(event.currentTarget.value);
              setVisibleCount(DISCOVERY_PAGE_SIZE);
            }}
            placeholder={dictionary.raceSearchPlaceholder}
            class={inputClass}
          />
        </label>
        <label class="hidden flex-col gap-1.5">
          <span class="text-muted font-mono text-[10px] tracking-[0.26em] uppercase">
            {dictionary.country}
          </span>
          <select
            value={country}
            onInput={(event) => {
              setCountry(event.currentTarget.value);
              setCity("");
              setVisibleCount(DISCOVERY_PAGE_SIZE);
            }}
            class={inputClass}
          >
            <option value="">{dictionary.allFilter}</option>
            {availableCountries.map((country) => (
              <option value={country.value}>{country.label}</option>
            ))}
          </select>
        </label>
        <label class="flex flex-col gap-1.5">
          <span class="text-muted font-mono text-[10px] tracking-[0.26em] uppercase">
            {dictionary.city}
          </span>
          <select
            value={city}
            onInput={(event) => {
              setCity(event.currentTarget.value);
              setVisibleCount(DISCOVERY_PAGE_SIZE);
            }}
            class={inputClass}
          >
            <option value="">{dictionary.allFilter}</option>
            {availableCities.map((cityOption) => (
              <option value={cityOption.value}>{cityOption.label}</option>
            ))}
          </select>
        </label>
        <label class="flex flex-col gap-1.5">
          <span class="text-muted font-mono text-[10px] tracking-[0.26em] uppercase">
            {dictionary.date}
          </span>
          <select
            value={year}
            onInput={(event) => {
              setYear(event.currentTarget.value);
              setVisibleCount(DISCOVERY_PAGE_SIZE);
            }}
            class={inputClass}
          >
            <option value="">{dictionary.allFilter}</option>
            {availableYears.map((yearOption) => (
              <option value={yearOption}>{yearOption}</option>
            ))}
          </select>
        </label>
      </div>

      <label class="text-muted flex items-center gap-2 font-mono text-sm">
        <input
          type="checkbox"
          checked={includePast}
          onInput={(event) => {
            setIncludePast(event.currentTarget.checked);
            setVisibleCount(DISCOVERY_PAGE_SIZE);
          }}
          class="accent-accent"
        />
        {dictionary.includePastRaces}
      </label>

      <div>
        {filteredCards.length > 0 ? (
          visibleCards.map((card) => {
            const isUpcoming =
              card.meta.date >= getTodayInTimeZone(card.meta.timezone);
            return (
              <a
                href={card.href}
                class="race-row group border-line hover:bg-surface flex items-center justify-between gap-4 border-b py-4 pr-2 transition-colors"
              >
                <div class="flex min-w-0 items-center gap-4">
                  <div
                    class={`w-0.5 shrink-0 self-stretch ${isUpcoming ? "bg-accent" : "bg-line-solid"}`}
                  ></div>
                  <div class="min-w-0">
                    <h2 class="font-display text-text text-xl leading-tight font-bold uppercase">
                      {card.meta.name}
                    </h2>
                    <div class="text-muted mt-0.5 font-mono text-xs">
                      {card.meta.city}
                    </div>
                  </div>
                </div>
                <div class="flex shrink-0 items-center gap-4 font-mono text-xs">
                  <span
                    class={`bg-surface-raised px-2 py-0.5 text-[10px] tracking-wider ${isUpcoming ? "text-accent" : "text-muted"}`}
                  >
                    {isUpcoming
                      ? dictionary.upcomingEdition
                      : dictionary.pastEdition}
                  </span>
                  <span class="text-muted hidden md:inline">
                    {formatRaceDate(card.meta.date, locale)}
                  </span>
                  <span class="text-muted hidden lg:inline">
                    {formatDistance(card.meta.distanceKm, locale)}
                  </span>
                  <span class="text-muted">{card.year}</span>
                  <span class="text-accent transition-transform group-hover:translate-x-0.5">
                    →
                  </span>
                </div>
              </a>
            );
          })
        ) : (
          <div class="border-line text-muted border border-dashed p-6 font-mono text-sm leading-7">
            {dictionary.noMatch}
            <a
              href={buildContributePath(locale)}
              class="text-accent mt-2 block text-sm transition"
            >
              {dictionary.cantFindRace} →
            </a>
          </div>
        )}
      </div>

      {visibleCount < filteredCards.length && (
        <div class="mt-6 flex flex-col items-center gap-2">
          <span class="text-muted font-mono text-xs">
            {visibleCards.length} / {filteredCards.length}
          </span>
          <button
            type="button"
            onClick={() =>
              setVisibleCount((prev) => prev + DISCOVERY_PAGE_SIZE)
            }
            class="border-line-solid text-accent border px-4 py-2 font-mono text-sm transition"
          >
            {dictionary.loadMore}
          </button>
        </div>
      )}

      <div class="mt-6 text-center">
        <a
          href={buildContributePath(locale)}
          class="text-muted hover:text-accent font-mono text-sm transition"
        >
          {dictionary.cantFindRace} →
        </a>
      </div>
    </div>
  );
}
