import { getTodayInTimeZone } from "../format";

/**
 * The minimum shape needed to place an edition in time and space. Both
 * `RaceEdition` and `RaceSummary` satisfy it.
 */
export type EditionRef = {
  raceSlug: string;
  year: string;
  meta: {
    date: string;
    timezone: string;
    city: string;
  };
};

export const RELATED_EDITIONS_LIMIT = 6;

const DAY_IN_MS = 24 * 60 * 60 * 1000;

/**
 * An edition is upcoming until the end of its race day, in the race's own
 * timezone. Pages are static, so callers pass the build time as
 * `referenceDate`; the result is fixed for the whole build.
 */
export const isUpcomingEdition = (
  edition: Pick<EditionRef, "meta">,
  referenceDate = new Date(),
): boolean =>
  edition.meta.date >= getTodayInTimeZone(edition.meta.timezone, referenceDate);

const compareByDate = (left: EditionRef, right: EditionRef): number =>
  left.meta.date === right.meta.date
    ? left.raceSlug.localeCompare(right.raceSlug)
    : left.meta.date.localeCompare(right.meta.date);

const isSameEdition = (left: EditionRef, right: EditionRef): boolean =>
  left.raceSlug === right.raceSlug && left.year === right.year;

const daysBetween = (left: string, right: string): number =>
  Math.abs(Date.parse(`${left}T00:00:00Z`) - Date.parse(`${right}T00:00:00Z`)) /
  DAY_IN_MS;

/**
 * The earliest upcoming edition of a race, if any.
 */
export const getNextUpcomingEdition = <T extends EditionRef>(
  editions: readonly T[],
  raceSlug: string,
  referenceDate = new Date(),
): T | undefined =>
  editions
    .filter(
      (edition) =>
        edition.raceSlug === raceSlug &&
        isUpcomingEdition(edition, referenceDate),
    )
    .toSorted(compareByDate)[0];

/**
 * The edition a convenience race URL should open: the next upcoming edition,
 * otherwise the most recent past one.
 */
export const getMostRelevantEditionOf = <T extends EditionRef>(
  editions: readonly T[],
  raceSlug: string,
  referenceDate = new Date(),
): T | undefined =>
  getNextUpcomingEdition(editions, raceSlug, referenceDate) ??
  editions
    .filter((edition) => edition.raceSlug === raceSlug)
    .toSorted(compareByDate)
    .at(-1);

export type SiblingEdition<T extends EditionRef> = {
  edition: T;
  upcoming: boolean;
};

export type SiblingEditions<T extends EditionRef> = {
  /** Every other edition of the same race, newest first. */
  siblings: SiblingEdition<T>[];
  /**
   * The edition a past edition should point to: the next upcoming edition of
   * the same race. Undefined when the current edition is itself upcoming or
   * the race has no upcoming edition.
   */
  upcomingPointer?: T;
};

export const getSiblingEditions = <T extends EditionRef>(
  editions: readonly T[],
  current: EditionRef,
  referenceDate = new Date(),
): SiblingEditions<T> => {
  const siblings = editions
    .filter(
      (edition) =>
        edition.raceSlug === current.raceSlug &&
        !isSameEdition(edition, current),
    )
    .toSorted((left, right) => compareByDate(right, left))
    .map((edition) => ({
      edition,
      upcoming: isUpcomingEdition(edition, referenceDate),
    }));

  const upcomingPointer = isUpcomingEdition(current, referenceDate)
    ? undefined
    : getNextUpcomingEdition(editions, current.raceSlug, referenceDate);

  return upcomingPointer ? { siblings, upcomingPointer } : { siblings };
};

/**
 * Upcoming editions of other races to link from an edition page: one per
 * race (its next upcoming edition), same city first, then nearest by date to
 * the current edition, with the race slug as a final tie-breaker so the order
 * is stable across builds.
 */
export const getRelatedEditions = <T extends EditionRef>(
  editions: readonly T[],
  current: EditionRef,
  referenceDate = new Date(),
  limit = RELATED_EDITIONS_LIMIT,
): T[] => {
  const nextByRace = new Map<string, T>();
  for (const edition of editions.toSorted(compareByDate)) {
    if (
      edition.raceSlug === current.raceSlug ||
      nextByRace.has(edition.raceSlug) ||
      !isUpcomingEdition(edition, referenceDate)
    ) {
      continue;
    }
    nextByRace.set(edition.raceSlug, edition);
  }

  const rank = (edition: T) => ({
    sameCity: edition.meta.city === current.meta.city ? 0 : 1,
    distance: daysBetween(edition.meta.date, current.meta.date),
  });

  return [...nextByRace.values()]
    .toSorted((left, right) => {
      const leftRank = rank(left);
      const rightRank = rank(right);
      return (
        leftRank.sameCity - rightRank.sameCity ||
        leftRank.distance - rightRank.distance ||
        compareByDate(left, right)
      );
    })
    .slice(0, limit);
};
