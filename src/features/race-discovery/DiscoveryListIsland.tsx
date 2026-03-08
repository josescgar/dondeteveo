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

const inputClass =
  "w-full border-b bg-transparent px-0 py-2 font-mono text-sm outline-none transition";
const baseInputStyle =
  "border-color: var(--color-line-solid); color: var(--color-text);";

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
      <div class="grid gap-6 md:grid-cols-[2fr_1fr_1fr]">
        <label class="flex flex-col gap-1.5">
          <span
            class="font-mono text-[10px] tracking-[0.26em] uppercase"
            style="color: var(--color-muted);"
          >
            {dictionary.search}
          </span>
          <input
            type="search"
            value={query}
            onInput={(event) => setQuery(event.currentTarget.value)}
            placeholder={dictionary.raceSearchPlaceholder}
            class={inputClass}
            style={baseInputStyle}
            onFocus={(e) =>
              (e.currentTarget.style.borderColor = "var(--color-accent)")
            }
            onBlur={(e) =>
              (e.currentTarget.style.borderColor = "var(--color-line-solid)")
            }
          />
        </label>
        <label class="flex flex-col gap-1.5">
          <span
            class="font-mono text-[10px] tracking-[0.26em] uppercase"
            style="color: var(--color-muted);"
          >
            {dictionary.country}
          </span>
          <select
            value={country}
            onInput={(event) => setCountry(event.currentTarget.value)}
            class={inputClass}
            style={baseInputStyle}
            onFocus={(e) =>
              (e.currentTarget.style.borderColor = "var(--color-accent)")
            }
            onBlur={(e) =>
              (e.currentTarget.style.borderColor = "var(--color-line-solid)")
            }
          >
            <option value="">{dictionary.allFilter}</option>
            {availableCountries.map((countryCode) => (
              <option value={countryCode}>{countryCode.toUpperCase()}</option>
            ))}
          </select>
        </label>
        <label class="flex flex-col gap-1.5">
          <span
            class="font-mono text-[10px] tracking-[0.26em] uppercase"
            style="color: var(--color-muted);"
          >
            {dictionary.date}
          </span>
          <select
            value={year}
            onInput={(event) => setYear(event.currentTarget.value)}
            class={inputClass}
            style={baseInputStyle}
            onFocus={(e) =>
              (e.currentTarget.style.borderColor = "var(--color-accent)")
            }
            onBlur={(e) =>
              (e.currentTarget.style.borderColor = "var(--color-line-solid)")
            }
          >
            <option value="">{dictionary.allFilter}</option>
            {availableYears.map((yearOption) => (
              <option value={yearOption}>{yearOption}</option>
            ))}
          </select>
        </label>
      </div>

      <div>
        {filteredCards.length > 0 ? (
          filteredCards.map((card) => {
            const isUpcoming =
              card.meta.date >= getTodayInTimeZone(card.meta.timezone);
            return (
              <a
                href={card.href}
                class="race-row group flex items-center justify-between gap-4 px-0 py-4 transition-colors"
                style="border-bottom: 1px solid var(--color-line);"
                onMouseOver={(e) => {
                  (e.currentTarget as HTMLAnchorElement).style.backgroundColor =
                    "var(--color-surface)";
                }}
                onMouseOut={(e) => {
                  (e.currentTarget as HTMLAnchorElement).style.backgroundColor =
                    "";
                }}
              >
                <div class="flex min-w-0 items-center gap-4">
                  <div
                    class="w-0.5 shrink-0 self-stretch"
                    style={`background-color: ${isUpcoming ? "var(--color-accent)" : "var(--color-line-solid)"};`}
                  ></div>
                  <div class="min-w-0">
                    <h2
                      class="font-display text-xl leading-tight font-bold uppercase"
                      style="color: var(--color-text);"
                    >
                      {card.meta.name}
                    </h2>
                    <div
                      class="mt-0.5 font-mono text-xs"
                      style="color: var(--color-muted);"
                    >
                      {card.meta.city}
                    </div>
                  </div>
                </div>
                <div class="flex shrink-0 items-center gap-4 font-mono text-xs">
                  <span
                    class="px-2 py-0.5 text-[10px] tracking-wider"
                    style={`background-color: var(--color-surface-raised); color: ${isUpcoming ? "var(--color-accent)" : "var(--color-muted)"};`}
                  >
                    {isUpcoming
                      ? dictionary.upcomingEdition
                      : dictionary.pastEdition}
                  </span>
                  <span
                    class="hidden md:inline"
                    style="color: var(--color-muted);"
                  >
                    {formatRaceDate(card.meta.date, locale)}
                  </span>
                  <span
                    class="hidden lg:inline"
                    style="color: var(--color-muted);"
                  >
                    {formatDistance(card.meta.distanceKm, locale)}
                  </span>
                  <span style="color: var(--color-muted);">{card.year}</span>
                  <span
                    class="transition-transform group-hover:translate-x-0.5"
                    style="color: var(--color-accent);"
                  >
                    →
                  </span>
                </div>
              </a>
            );
          })
        ) : (
          <div
            class="border border-dashed p-6 font-mono text-sm leading-7"
            style="border-color: var(--color-line); color: var(--color-muted);"
          >
            {dictionary.noMatch}
          </div>
        )}
      </div>
    </div>
  );
}
