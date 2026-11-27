// Pure logic for rolling a race over to its next edition. File I/O lives in
// `rollover-files.ts`; the CLI entry point is `scripts/rollover-edition.ts`.
// Relative imports use explicit `.ts` extensions so the CLI can run under
// Node's built-in TypeScript support without a build step.
import {
  metaSchema,
  sourceSchema,
  type RaceLocalizations,
  type RaceMeta,
  type RaceRouteCollection,
  type RaceSource,
} from "./schemas.ts";

export class RolloverError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "RolloverError";
  }
}

export type RolloverPreviousEdition = {
  year: string;
  meta: RaceMeta;
  source: RaceSource;
  route?: RaceRouteCollection;
  localizations?: RaceLocalizations;
};

export type RolloverOptions = {
  /** New race date, `YYYY-MM-DD`. Its year becomes the new edition folder. */
  date: string;
  /** Confirmed start time, `HH:MM`. Omit to carry over the previous one as provisional. */
  startTime?: string;
  /** Reference instant used to warn about dates in the past. */
  now?: Date;
};

export type RolloverEdition = {
  year: string;
  meta: RaceMeta;
  source: RaceSource;
  localizations?: RaceLocalizations;
  /** Things a human or agent must review before committing. */
  warnings: string[];
  /** Informational notes about what the rollover changed. */
  notes: string[];
};

const DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;
const START_TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;
const EDITION_YEAR_PATTERN = /^\d{4}$/;
const RACE_SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const YEAR_MENTION_PATTERN = /\b(?:19|20)\d{2}\b/g;
const SNIPPET_RADIUS = 40;

const MONTH_NAMES: Record<string, readonly string[]> = {
  en: [
    "january",
    "february",
    "march",
    "april",
    "may",
    "june",
    "july",
    "august",
    "september",
    "october",
    "november",
    "december",
  ],
  es: [
    "enero",
    "febrero",
    "marzo",
    "abril",
    "mayo",
    "junio",
    "julio",
    "agosto",
    "septiembre",
    "octubre",
    "noviembre",
    "diciembre",
  ],
};

const REVIEWED_META_FIELDS = [
  "name",
  "summary",
  "heroNote",
  "specialNote",
] as const;

export const isValidRaceSlug = (value: string): boolean =>
  RACE_SLUG_PATTERN.test(value);

export const isValidCalendarDate = (value: string): boolean => {
  const match = DATE_PATTERN.exec(value);
  if (!match) return false;

  const [year, month, day] = match.slice(1).map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
};

export const isValidStartTime = (value: string): boolean =>
  START_TIME_PATTERN.test(value);

/** Picks the latest edition year among folder names, ignoring non-year folders. */
export const selectLatestEditionYear = (
  folderNames: string[],
): string | undefined =>
  folderNames
    .filter((name) => EDITION_YEAR_PATTERN.test(name))
    .toSorted((left, right) => Number(right) - Number(left))[0];

const getTodayInTimeZone = (timeZone: string, now: Date): string =>
  new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);

const escapeRegExp = (value: string) =>
  value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const buildDatePatterns = (isoDate: string): RegExp[] => {
  const [, , monthText, dayText] = DATE_PATTERN.exec(isoDate) ?? [];
  const month = Number(monthText);
  const day = Number(dayText);
  const ordinal = "(?:st|nd|rd|th)?";
  const patterns = [escapeRegExp(isoDate), `\\b0?${day}/0?${month}\\b`];

  for (const months of Object.values(MONTH_NAMES)) {
    const monthName = months[month - 1];
    patterns.push(
      `\\b0?${day}${ordinal}\\s+(?:of\\s+|de\\s+)?${monthName}\\b`,
      `\\b${monthName}\\s+0?${day}${ordinal}\\b`,
    );
  }

  return patterns.map((pattern) => new RegExp(pattern, "giu"));
};

const getSnippet = (text: string, index: number, length: number): string => {
  const start = Math.max(0, index - SNIPPET_RADIUS);
  const end = Math.min(text.length, index + length + SNIPPET_RADIUS);
  return `${start > 0 ? "…" : ""}${text.slice(start, end)}${end < text.length ? "…" : ""}`;
};

type ReviewedText = { field: string; text: string };

/**
 * Finds year and previous-date mentions in carried-over text. Text is never
 * rewritten automatically: a year can be a historical fact ("since 1978") and
 * only a reviewer can tell.
 */
export const findDateMentions = (
  texts: ReviewedText[],
  previous: { year: string; date: string },
): string[] => {
  const datePatterns = buildDatePatterns(previous.date);
  const warnings: string[] = [];

  for (const { field, text } of texts) {
    for (const match of text.matchAll(YEAR_MENTION_PATTERN)) {
      const reason =
        match[0] === previous.year
          ? `the previous edition year ${previous.year}`
          : `the year ${match[0]}`;
      warnings.push(
        `${field} mentions ${reason}: "${getSnippet(text, match.index, match[0].length)}"`,
      );
    }

    for (const pattern of datePatterns) {
      for (const match of text.matchAll(pattern)) {
        warnings.push(
          `${field} mentions the previous race date (${previous.date}): "${getSnippet(text, match.index, match[0].length)}"`,
        );
      }
    }
  }

  return [...new Set(warnings)];
};

const collectReviewedTexts = (
  previous: RolloverPreviousEdition,
): ReviewedText[] => {
  const texts: ReviewedText[] = [];

  for (const field of REVIEWED_META_FIELDS) {
    const text = previous.meta[field];
    if (text) texts.push({ field: `meta.json ${field}`, text });
  }

  for (const [locale, entry] of Object.entries(previous.localizations ?? {})) {
    for (const field of REVIEWED_META_FIELDS) {
      const text = entry.meta?.[field];
      if (text) {
        texts.push({ field: `localizations.json ${locale}.${field}`, text });
      }
    }
  }

  texts.push({
    field: "source.json officialSourceName",
    text: previous.source.officialSourceName,
  });

  previous.route?.features.forEach((feature, index) => {
    for (const key of ["id", "name"] as const) {
      const text = feature.properties[key];
      if (text) {
        texts.push({
          field: `route.geojson features[${index}].properties.${key} (not displayed)`,
          text,
        });
      }
    }
  });

  return texts;
};

export const buildRolloverSourceNotes = ({
  previousYear,
  year,
  startTime,
  startTimeProvisional,
  previousNotes,
}: {
  previousYear: string;
  year: string;
  startTime: string;
  startTimeProvisional: boolean;
  previousNotes: string;
}): string =>
  [
    `Route and points carried over unchanged from the ${previousYear} edition; the ${year} course had not been published at rollover time, so the route is marked provisional in meta.json.`,
    startTimeProvisional
      ? `Start time ${startTime} carried over from ${previousYear} and marked provisional.`
      : `Start time ${startTime} set at rollover.`,
    `Previous edition notes: ${previousNotes}`,
  ].join(" ");

const dropWaveLabels = (localizations: RaceLocalizations): RaceLocalizations =>
  Object.fromEntries(
    Object.entries(localizations).map(([locale, entry]) => {
      const copy = { ...entry };
      delete copy.waveLabels;
      return [locale, copy];
    }),
  );

/**
 * Builds the next edition's metadata from the previous edition. Route and
 * points are copied verbatim by the caller; this function decides everything
 * else and lists what needs human review.
 */
export const buildRolloverEdition = (
  previous: RolloverPreviousEdition,
  options: RolloverOptions,
): RolloverEdition => {
  const { date, startTime, now } = options;

  if (!isValidCalendarDate(date)) {
    throw new RolloverError(
      `Invalid date "${date}". Expected a real calendar date as YYYY-MM-DD.`,
    );
  }
  if (startTime !== undefined && !isValidStartTime(startTime)) {
    throw new RolloverError(
      `Invalid start time "${startTime}". Expected HH:MM in race local time.`,
    );
  }

  const year = date.slice(0, 4);
  if (Number(year) <= Number(previous.year)) {
    throw new RolloverError(
      `New date ${date} must fall in a year after the latest edition (${previous.year}).`,
    );
  }

  const startTimeProvisional = startTime === undefined;
  const nextStartTime = startTime ?? previous.meta.startTime;

  const meta: RaceMeta = {
    ...previous.meta,
    date,
    startTime: nextStartTime,
  };
  delete meta.waves;
  delete meta.provisional;
  meta.provisional = { route: true, startTime: startTimeProvisional };

  const source: RaceSource = {
    ...previous.source,
    notes: buildRolloverSourceNotes({
      previousYear: previous.year,
      year,
      startTime: nextStartTime,
      startTimeProvisional,
      previousNotes: previous.source.notes,
    }),
  };

  const localizations = previous.localizations
    ? dropWaveLabels(previous.localizations)
    : undefined;

  const warnings = findDateMentions(collectReviewedTexts(previous), {
    year: previous.year,
    date: previous.meta.date,
  });
  const notes: string[] = [];

  if (previous.meta.specialNote) {
    warnings.push(
      `meta.json specialNote was copied from ${previous.year}; confirm it still applies to ${year} (and its localized versions).`,
    );
  }
  if (Number(year) > Number(previous.year) + 1) {
    warnings.push(
      `New edition year ${year} skips at least one year after ${previous.year}; check the date.`,
    );
  }
  if (now && date < getTodayInTimeZone(previous.meta.timezone, now)) {
    warnings.push(`New date ${date} is already in the past; check the date.`);
  }

  if (previous.meta.waves) {
    notes.push(
      `Dropped ${previous.meta.waves.length} waves from ${previous.year}; add them again once the ${year} wave times are published.`,
    );
  }
  if (
    previous.localizations &&
    Object.values(previous.localizations).some((entry) => entry.waveLabels)
  ) {
    notes.push("Dropped waveLabels from localizations.json with the waves.");
  }
  notes.push(
    startTimeProvisional
      ? `Start time ${nextStartTime} carried over from ${previous.year} and marked provisional.`
      : `Start time set to ${nextStartTime} and marked confirmed.`,
  );
  notes.push("Route and points copied unchanged and marked provisional.");

  // Validate, but return the objects as built: Zod output follows schema key
  // order, while the files should keep the previous edition's key order.
  metaSchema.parse(meta);
  sourceSchema.parse(source);

  return {
    year,
    meta,
    source,
    localizations,
    warnings,
    notes,
  };
};

export const serializeJson = (value: unknown): string =>
  `${JSON.stringify(value, null, 2)}\n`;
