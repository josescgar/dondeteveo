import { useMemo, useState } from "preact/hooks";

import { getDictionary } from "../../lib/i18n";
import {
  formatDistance,
  formatRaceDate,
  getTodayInTimeZone,
} from "../../lib/format";
import type { Locale } from "../../lib/config";
import type { RaceSummary } from "../../lib/races/catalog";
import {
  filterDiscoveryCards,
  getDiscoveryCards,
} from "./race-discovery.logic";

type Props = {
  locale: Locale;
  races: RaceSummary[];
};

export default function DiscoveryListIsland({ locale, races }: Props) {
  const dictionary = getDictionary(locale);
  const [query, setQuery] = useState("");
  const [country, setCountry] = useState("");
  const [year, setYear] = useState("");

  const cards = useMemo(
    () => getDiscoveryCards(locale, races),
    [locale, races],
  );
  const filteredCards = useMemo(
    () => filterDiscoveryCards(cards, { query, country, year }),
    [cards, country, query, year],
  );

  const availableYears = [...new Set(races.map((race) => race.year))].sort();
  const availableCountries = [
    ...new Set(races.map((race) => race.countryCode)),
  ].sort();

  return (
    <div class="space-y-6">
      <div class="grid gap-4 rounded-[2rem] border border-[var(--line)] bg-white/85 p-4 shadow-[var(--shadow-card)] md:grid-cols-[2fr_1fr_1fr]">
        <label class="space-y-2">
          <span class="text-xs font-semibold tracking-[0.22em] text-[var(--muted)] uppercase">
            {dictionary.search}
          </span>
          <input
            type="search"
            value={query}
            onInput={(event) => setQuery(event.currentTarget.value)}
            placeholder={dictionary.raceSearchPlaceholder}
            class="w-full rounded-full border border-[var(--line)] bg-[var(--cream)] px-4 py-3 text-sm transition outline-none focus:border-[var(--ember)]"
          />
        </label>
        <label class="space-y-2">
          <span class="text-xs font-semibold tracking-[0.22em] text-[var(--muted)] uppercase">
            {dictionary.country}
          </span>
          <select
            value={country}
            onInput={(event) => setCountry(event.currentTarget.value)}
            class="w-full rounded-full border border-[var(--line)] bg-[var(--cream)] px-4 py-3 text-sm transition outline-none focus:border-[var(--ember)]"
          >
            <option value="">{dictionary.allFilter}</option>
            {availableCountries.map((countryCode) => (
              <option value={countryCode}>{countryCode.toUpperCase()}</option>
            ))}
          </select>
        </label>
        <label class="space-y-2">
          <span class="text-xs font-semibold tracking-[0.22em] text-[var(--muted)] uppercase">
            {dictionary.date}
          </span>
          <select
            value={year}
            onInput={(event) => setYear(event.currentTarget.value)}
            class="w-full rounded-full border border-[var(--line)] bg-[var(--cream)] px-4 py-3 text-sm transition outline-none focus:border-[var(--ember)]"
          >
            <option value="">{dictionary.allFilter}</option>
            {availableYears.map((yearOption) => (
              <option value={yearOption}>{yearOption}</option>
            ))}
          </select>
        </label>
      </div>

      <div class="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {filteredCards.length > 0 ? (
          filteredCards.map((card) => (
            <a
              href={card.href}
              class="group rounded-[1.8rem] border border-[var(--line)] bg-white/90 p-5 shadow-[var(--shadow-card)] transition hover:-translate-y-1 hover:border-[var(--ember)]"
            >
              <div class="flex items-start justify-between gap-3">
                <div>
                  <div class="text-xs font-semibold tracking-[0.22em] text-[var(--muted)] uppercase">
                    {card.meta.date >= getTodayInTimeZone(card.meta.timezone)
                      ? dictionary.upcomingEdition
                      : dictionary.pastEdition}
                  </div>
                  <h2 class="font-display mt-2 text-2xl leading-tight text-[var(--ink)]">
                    {card.meta.name}
                  </h2>
                </div>
                <span class="rounded-full bg-[var(--sun-soft)] px-3 py-1 text-xs font-semibold tracking-[0.18em] text-[var(--ink)] uppercase">
                  {card.year}
                </span>
              </div>
              <p class="mt-3 text-sm leading-6 text-[var(--muted)]">
                {card.meta.summary}
              </p>
              <div class="mt-5 grid gap-2 text-sm text-[var(--muted)]">
                <div>
                  <strong class="text-[var(--ink)]">{dictionary.city}:</strong>{" "}
                  {card.meta.city}
                </div>
                <div>
                  <strong class="text-[var(--ink)]">{dictionary.date}:</strong>{" "}
                  {formatRaceDate(card.meta.date, locale)}
                </div>
                <div>
                  <strong class="text-[var(--ink)]">
                    {dictionary.distance}:
                  </strong>{" "}
                  {formatDistance(card.meta.distanceKm, locale)}
                </div>
              </div>
            </a>
          ))
        ) : (
          <div class="rounded-[1.8rem] border border-dashed border-[var(--line)] bg-white/70 p-6 text-sm leading-7 text-[var(--muted)]">
            {dictionary.noMatch}
          </div>
        )}
      </div>
    </div>
  );
}
