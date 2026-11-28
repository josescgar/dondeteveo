import { SITE_NAME, type Locale } from "../config";
import {
  fillTemplate,
  formatDistance,
  formatList,
  formatRaceDate,
} from "../format";
import type { EditionPageDictionary } from "../i18n";
import type { RaceMeta, RacePointFeature } from "./schemas";

export const EDITION_TITLE_MAX_LENGTH = 65;
export const EDITION_DESCRIPTION_MIN_LENGTH = 120;
export const EDITION_DESCRIPTION_MAX_LENGTH = 160;

const ELLIPSIS = "…";

/**
 * Shortens `text` to at most `maxLength` characters, cutting at a word
 * boundary and ending with an ellipsis. Text that already fits is unchanged.
 */
export const truncateAtWord = (text: string, maxLength: number): string => {
  if (text.length <= maxLength) {
    return text;
  }

  const budget = maxLength - ELLIPSIS.length;
  // One extra character tells us whether the cut already falls on a space.
  const slice = text.slice(0, budget + 1);
  const lastSpace = slice.lastIndexOf(" ");
  const cut =
    lastSpace > 0 ? slice.slice(0, lastSpace) : slice.slice(0, budget);
  return `${cut.replace(/[\s,.;:]+$/, "")}${ELLIPSIS}`;
};

type TitleStrings = Pick<
  EditionPageDictionary,
  "titleIntent" | "titleIntentShort"
>;

/**
 * Spectator-intent `<title>` for an edition page. Long names degrade in
 * order: drop the site name, then use the short intent, then the bare
 * `<name> <year>`, and finally truncate the name itself.
 */
export const buildEditionTitle = (
  { name, year }: { name: string; year: string },
  strings: TitleStrings,
  maxLength = EDITION_TITLE_MAX_LENGTH,
): string => {
  const candidates = [
    `${name} ${year}: ${strings.titleIntent} | ${SITE_NAME}`,
    `${name} ${year}: ${strings.titleIntent}`,
    `${name} ${year}: ${strings.titleIntentShort}`,
    `${name} ${year}`,
  ];
  const fitting = candidates.find((candidate) => candidate.length <= maxLength);
  return (
    fitting ?? `${truncateAtWord(name, maxLength - year.length - 1)} ${year}`
  );
};

type DescriptionStrings = Pick<
  EditionPageDictionary,
  | "descriptionLead"
  | "descriptionCheerPointsOne"
  | "descriptionCheerPointsMany"
  | "descriptionTail"
>;

/**
 * Meta description built from edition data plus the edition summary, aimed
 * at 120-160 characters and kept to whole sentences where possible.
 */
export const buildEditionDescription = (
  {
    meta,
    cheerPointCount,
    locale,
  }: {
    meta: Pick<
      RaceMeta,
      "name" | "date" | "city" | "distanceKm" | "startTime" | "summary"
    >;
    cheerPointCount: number;
    locale: Locale;
  },
  strings: DescriptionStrings,
): string => {
  const cheerPoints =
    cheerPointCount === 0
      ? ""
      : cheerPointCount === 1
        ? strings.descriptionCheerPointsOne
        : fillTemplate(strings.descriptionCheerPointsMany, {
            count: cheerPointCount,
          });
  const lead = fillTemplate(strings.descriptionLead, {
    name: meta.name,
    date: formatRaceDate(meta.date, locale),
    city: meta.city,
    distance: formatDistance(meta.distanceKm, locale),
    startTime: meta.startTime,
    cheerPoints,
  });

  const summary = meta.summary.trim();
  // Whole sentences first: data + summary, padded with the call to action
  // when short; then data + call to action, or data alone, when the summary
  // does not fit; a word-boundary cut only as a last resort.
  const candidates = [
    `${lead} ${summary}`,
    `${lead} ${summary} ${strings.descriptionTail}`,
    `${lead} ${strings.descriptionTail}`,
    lead,
  ];
  const fitting = candidates.find(
    (candidate) =>
      candidate.length >= EDITION_DESCRIPTION_MIN_LENGTH &&
      candidate.length <= EDITION_DESCRIPTION_MAX_LENGTH,
  );

  return (
    fitting ??
    truncateAtWord(`${lead} ${summary}`, EDITION_DESCRIPTION_MAX_LENGTH)
  );
};

export type StartTimeRow = { label: string; startTime: string };

/**
 * One row per wave when the edition has waves (labels already localized),
 * otherwise a single row with the gun start. Times are race local time.
 */
export const buildStartTimeRows = (
  meta: Pick<RaceMeta, "startTime" | "waves">,
  startLabel: string,
): StartTimeRow[] =>
  meta.waves && meta.waves.length > 0
    ? meta.waves.map(({ label, startTime }) => ({ label, startTime }))
    : [{ label: startLabel, startTime: meta.startTime }];

export type FaqItem = { question: string; answer: string };

type FaqStrings = Pick<
  EditionPageDictionary,
  | "faqWhenQuestion"
  | "faqWhenAnswerUpcoming"
  | "faqWhenAnswerPast"
  | "faqStartQuestion"
  | "faqStartAnswer"
  | "faqStartAnswerWaves"
  | "faqDistanceQuestion"
  | "faqDistanceAnswer"
  | "faqWhereQuestion"
  | "faqWhereAnswer"
  | "faqWhereAnswerFallback"
  | "faqShareQuestion"
  | "faqShareAnswer"
>;

/**
 * Short FAQ generated from edition data. Every time in it is race local time,
 * labelled with the race timezone.
 */
export const buildEditionFaq = (
  {
    meta,
    year,
    cheerPoints,
    upcoming,
    locale,
  }: {
    meta: Pick<
      RaceMeta,
      | "name"
      | "date"
      | "city"
      | "distanceKm"
      | "startTime"
      | "timezone"
      | "waves"
    >;
    year: string;
    cheerPoints: readonly RacePointFeature[];
    upcoming: boolean;
    locale: Locale;
  },
  strings: FaqStrings,
): FaqItem[] => {
  const date = formatRaceDate(meta.date, locale);
  const waveTimes = (meta.waves ?? []).map((wave) => wave.startTime).toSorted();

  const startAnswer =
    waveTimes.length > 1
      ? fillTemplate(strings.faqStartAnswerWaves, {
          count: waveTimes.length,
          first: waveTimes[0],
          last: waveTimes[waveTimes.length - 1],
          timezone: meta.timezone,
        })
      : fillTemplate(strings.faqStartAnswer, {
          startTime: meta.startTime,
          timezone: meta.timezone,
        });

  const whereAnswer =
    cheerPoints.length > 0
      ? fillTemplate(strings.faqWhereAnswer, {
          points: formatList(
            cheerPoints.map(
              (point) =>
                `${point.properties.label} (${formatDistance(point.properties.distanceKm, locale)})`,
            ),
            locale,
          ),
        })
      : strings.faqWhereAnswerFallback;

  return [
    {
      question: fillTemplate(strings.faqWhenQuestion, {
        name: meta.name,
        year,
      }),
      answer: fillTemplate(
        upcoming ? strings.faqWhenAnswerUpcoming : strings.faqWhenAnswerPast,
        { date, city: meta.city },
      ),
    },
    { question: strings.faqStartQuestion, answer: startAnswer },
    {
      question: strings.faqDistanceQuestion,
      answer: fillTemplate(strings.faqDistanceAnswer, {
        distance: formatDistance(meta.distanceKm, locale),
      }),
    },
    { question: strings.faqWhereQuestion, answer: whereAnswer },
    { question: strings.faqShareQuestion, answer: strings.faqShareAnswer },
  ];
};
