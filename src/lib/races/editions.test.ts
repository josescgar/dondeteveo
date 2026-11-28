import { describe, expect, it } from "vitest";

import {
  getMostRelevantEditionOf,
  getNextUpcomingEdition,
  getRelatedEditions,
  getSiblingEditions,
  isUpcomingEdition,
  type EditionRef,
} from "./editions";

const edition = (
  raceSlug: string,
  year: string,
  date: string,
  city = "Madrid",
): EditionRef => ({
  raceSlug,
  year,
  meta: { date, city, timezone: "Europe/Madrid" },
});

// 2026-11-28 12:00 in Madrid.
const NOW = new Date("2026-11-28T11:00:00Z");

describe("isUpcomingEdition", () => {
  it("treats race day itself as upcoming, in the race timezone", () => {
    expect(isUpcomingEdition(edition("a", "2026", "2026-11-28"), NOW)).toBe(
      true,
    );
    expect(isUpcomingEdition(edition("a", "2026", "2026-11-27"), NOW)).toBe(
      false,
    );
  });

  it("uses the race timezone rather than UTC", () => {
    // 23:30 UTC on 27 Nov is already 28 Nov in Madrid.
    const lateUtc = new Date("2026-11-27T23:30:00Z");
    expect(isUpcomingEdition(edition("a", "2026", "2026-11-27"), lateUtc)).toBe(
      false,
    );
  });
});

describe("getNextUpcomingEdition and getMostRelevantEditionOf", () => {
  const editions = [
    edition("behobia", "2025", "2025-11-09"),
    edition("behobia", "2026", "2026-11-08"),
    edition("behobia", "2027", "2027-11-14"),
    edition("behobia", "2028", "2028-11-12"),
    edition("other", "2027", "2027-01-01"),
  ];

  it("picks the earliest upcoming edition of the race", () => {
    expect(getNextUpcomingEdition(editions, "behobia", NOW)?.year).toBe("2027");
  });

  it("falls back to the most recent past edition", () => {
    const past = editions.slice(0, 2);
    expect(getNextUpcomingEdition(past, "behobia", NOW)).toBeUndefined();
    expect(getMostRelevantEditionOf(past, "behobia", NOW)?.year).toBe("2026");
  });

  it("returns undefined for an unknown race", () => {
    expect(getMostRelevantEditionOf(editions, "nope", NOW)).toBeUndefined();
  });
});

describe("getSiblingEditions", () => {
  const editions = [
    edition("behobia", "2026", "2026-11-08"),
    edition("behobia", "2027", "2027-11-14"),
    edition("behobia", "2025", "2025-11-09"),
    edition("other", "2027", "2027-01-01"),
  ];

  it("lists every other edition of the same race, newest first", () => {
    const { siblings } = getSiblingEditions(editions, editions[0], NOW);
    expect(siblings.map((sibling) => sibling.edition.year)).toEqual([
      "2027",
      "2025",
    ]);
    expect(siblings.map((sibling) => sibling.upcoming)).toEqual([true, false]);
  });

  it("points a past edition to the upcoming one", () => {
    expect(
      getSiblingEditions(editions, editions[0], NOW).upcomingPointer?.year,
    ).toBe("2027");
    expect(
      getSiblingEditions(editions, editions[2], NOW).upcomingPointer?.year,
    ).toBe("2027");
  });

  it("does not add a pointer on an upcoming edition", () => {
    expect(
      getSiblingEditions(editions, editions[1], NOW).upcomingPointer,
    ).toBeUndefined();
  });

  it("returns no siblings and no pointer for a single-edition race", () => {
    expect(getSiblingEditions(editions, editions[3], NOW)).toEqual({
      siblings: [],
    });
  });
});

describe("getRelatedEditions", () => {
  const current = edition("madrid-half", "2027", "2027-04-04", "Madrid");
  const editions = [
    current,
    edition("madrid-half", "2026", "2026-03-22", "Madrid"),
    edition("madrid-past", "2026", "2026-04-26", "Madrid"),
    edition("madrid-silvestre", "2026", "2026-12-31", "Madrid"),
    edition("sevilla", "2027", "2027-02-21", "Seville"),
    edition("merida", "2027", "2027-04-10", "Mérida"),
    edition("ibiza", "2027", "2027-04-10", "Ibiza"),
    edition("behobia", "2027", "2027-11-14", "San Sebastian"),
    edition("behobia", "2028", "2028-11-12", "San Sebastian"),
    edition("valencia", "2026", "2026-12-06", "Valencia"),
    edition("barcelona", "2027", "2027-03-14", "Barcelona"),
  ];

  const slugs = (list: EditionRef[]) =>
    list.map((item) => `${item.raceSlug}/${item.year}`);

  it("puts the same city first, then nearest by date, max 6", () => {
    expect(slugs(getRelatedEditions(editions, current, NOW))).toEqual([
      "madrid-silvestre/2026",
      "ibiza/2027",
      "merida/2027",
      "barcelona/2027",
      "sevilla/2027",
      "valencia/2026",
    ]);
  });

  it("never links the current race or past editions", () => {
    const related = slugs(getRelatedEditions(editions, current, NOW, 100));
    expect(related.some((slug) => slug.startsWith("madrid-half/"))).toBe(false);
    expect(related).not.toContain("madrid-past/2026");
  });

  it("links only the next upcoming edition of each race", () => {
    const related = slugs(getRelatedEditions(editions, current, NOW, 100));
    expect(related).toContain("behobia/2027");
    expect(related).not.toContain("behobia/2028");
  });

  it("is deterministic regardless of input order", () => {
    expect(getRelatedEditions(editions.toReversed(), current, NOW)).toEqual(
      getRelatedEditions(editions, current, NOW),
    );
  });
});
