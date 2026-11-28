import { SITE_NAME, type Locale } from "../config";
import {
  fillTemplate,
  formatDistance,
  formatList,
  formatRaceDate,
} from "../format";
import type { EditionPageDictionary } from "../i18n";
import type { ProvisionalFact } from "./provisional";
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

const isWithinDescriptionRange = (text: string): boolean =>
  text.length >= EDITION_DESCRIPTION_MIN_LENGTH &&
  text.length <= EDITION_DESCRIPTION_MAX_LENGTH;

type DescriptionStrings = Pick<
  EditionPageDictionary,
  | "descriptionLead"
  | "descriptionLeadShort"
  | "descriptionStart"
  | "descriptionCheerPointsOne"
  | "descriptionCheerPointsMany"
  | "descriptionTail"
  | "descriptionProvisional"
>;

/**
 * Meta description, aimed at 120-160 characters of whole sentences. It
 * prefers the hand-written summary after a short lead (name, date, city, or
 * only date and city when the name does not fit) and
 * only falls back to generated facts (distance, start time, cheer points)
 * when the summary does not fit. Provisional facts are never stated: a
 * provisional start time drops the start clause and a provisional route
 * drops the cheer-point count.
 */
export const buildEditionDescription = (
  {
    meta,
    cheerPointCount,
    provisionalFacts,
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
      | "summary"
    >;
    cheerPointCount: number;
    provisionalFacts: readonly ProvisionalFact[];
    locale: Locale;
  },
  strings: DescriptionStrings,
): string => {
  const lead = fillTemplate(strings.descriptionLead, {
    name: meta.name,
    date: formatRaceDate(meta.date, locale),
    city: meta.city,
  });
  const summary = meta.summary.trim();
  const shortLead = fillTemplate(strings.descriptionLeadShort, {
    date: formatRaceDate(meta.date, locale),
    city: meta.city,
  });

  const distance = formatDistance(meta.distanceKm, locale);
  const start = provisionalFacts.includes("startTime")
    ? undefined
    : fillTemplate(strings.descriptionStart, {
        startTime: meta.startTime,
        timezone: meta.timezone,
      });
  const cheerPoints =
    provisionalFacts.includes("route") || cheerPointCount === 0
      ? undefined
      : cheerPointCount === 1
        ? strings.descriptionCheerPointsOne
        : fillTemplate(strings.descriptionCheerPointsMany, {
            count: cheerPointCount,
          });
  const joinFacts = (parts: (string | undefined)[]) =>
    `${parts.filter(Boolean).join(", ")}.`;
  const facts = joinFacts([distance, start, cheerPoints]);
  const factsWithoutCheerPoints = joinFacts([distance, start]);

  const candidates = [
    `${lead} ${summary}`,
    `${shortLead} ${summary}`,
    `${lead} ${facts} ${summary}`,
    `${lead} ${summary} ${strings.descriptionTail}`,
    `${shortLead} ${summary} ${strings.descriptionTail}`,
    `${lead} ${facts} ${strings.descriptionTail}`,
    `${lead} ${facts}`,
    `${lead} ${factsWithoutCheerPoints} ${strings.descriptionTail}`,
    ...(provisionalFacts.length > 0
      ? [
          `${lead} ${facts} ${strings.descriptionProvisional} ${strings.descriptionTail}`,
          `${lead} ${facts} ${strings.descriptionProvisional}`,
        ]
      : []),
    `${lead} ${factsWithoutCheerPoints}`,
  ];

  return (
    candidates.find(isWithinDescriptionRange) ??
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

/**
 * Point labels carry their kind as a prefix ("Cheer point - Plaza de Cuba").
 * Lists that hold a single kind drop it so it is not repeated on every row.
 */
export const stripPointKindPrefix = (label: string, prefix: string): string => {
  const escaped = prefix.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const stripped = label.replace(
    new RegExp(`^${escaped}\\s*[-–:]\\s*`, "i"),
    "",
  );
  return stripped.length > 0 ? stripped : label;
};

export type FaqItem = { question: string; answer: string };

type FaqStrings = Pick<
  EditionPageDictionary,
  | "faqWhenQuestion"
  | "faqWhenQuestionPast"
  | "faqWhenAnswerUpcoming"
  | "faqWhenAnswerPast"
  | "faqStartQuestion"
  | "faqStartQuestionPast"
  | "faqStartAnswer"
  | "faqStartAnswerPast"
  | "faqStartAnswerWaves"
  | "faqStartAnswerWavesPast"
  | "faqStartAnswerProvisional"
  | "faqDistanceQuestion"
  | "faqDistanceAnswer"
  | "faqWhereQuestion"
  | "faqWhereAnswer"
  | "faqWhereAnswerProvisional"
  | "faqWhereAnswerFallback"
  | "faqShareQuestion"
  | "faqShareAnswer"
>;

/**
 * Short FAQ generated from edition data. Every time in it is race local time,
 * labelled with the race timezone. Past editions use the past tense in the
 * question and the answer, and provisional facts are always qualified.
 */
export const buildEditionFaq = (
  {
    meta,
    year,
    cheerPoints,
    cheerPointPrefix,
    provisionalFacts,
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
      | "specialNote"
    >;
    year: string;
    cheerPoints: readonly RacePointFeature[];
    /** Localized cheer-point kind label, stripped from point labels. */
    cheerPointPrefix: string;
    provisionalFacts: readonly ProvisionalFact[];
    upcoming: boolean;
    locale: Locale;
  },
  strings: FaqStrings,
): FaqItem[] => {
  const date = formatRaceDate(meta.date, locale);
  const hasWaves = (meta.waves?.length ?? 0) > 1;
  const firstStart = hasWaves
    ? (meta.waves ?? []).map((wave) => wave.startTime).toSorted()[0]
    : meta.startTime;

  const startTemplate = provisionalFacts.includes("startTime")
    ? strings.faqStartAnswerProvisional
    : hasWaves
      ? upcoming
        ? strings.faqStartAnswerWaves
        : strings.faqStartAnswerWavesPast
      : upcoming
        ? strings.faqStartAnswer
        : strings.faqStartAnswerPast;
  const startAnswer = [
    fillTemplate(startTemplate, {
      startTime: firstStart,
      timezone: meta.timezone,
    }),
    meta.specialNote?.trim(),
  ]
    .filter(Boolean)
    .join(" ");

  const whereAnswer =
    cheerPoints.length > 0
      ? [
          fillTemplate(strings.faqWhereAnswer, {
            points: formatList(
              cheerPoints.map(
                (point) =>
                  `${stripPointKindPrefix(point.properties.label, cheerPointPrefix)} (${formatDistance(point.properties.distanceKm, locale)})`,
              ),
              locale,
            ),
          }),
          provisionalFacts.includes("route")
            ? strings.faqWhereAnswerProvisional
            : undefined,
        ]
          .filter(Boolean)
          .join(" ")
      : strings.faqWhereAnswerFallback;

  return [
    {
      question: fillTemplate(
        upcoming ? strings.faqWhenQuestion : strings.faqWhenQuestionPast,
        { name: meta.name, year },
      ),
      answer: fillTemplate(
        upcoming ? strings.faqWhenAnswerUpcoming : strings.faqWhenAnswerPast,
        { date, city: meta.city },
      ),
    },
    {
      question: upcoming
        ? strings.faqStartQuestion
        : strings.faqStartQuestionPast,
      answer: startAnswer,
    },
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
