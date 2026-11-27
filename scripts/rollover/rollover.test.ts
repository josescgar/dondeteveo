import { describe, expect, it } from "vitest";

import {
  buildRolloverEdition,
  findDateMentions,
  isValidCalendarDate,
  isValidRaceSlug,
  isValidStartTime,
  RolloverError,
  selectLatestEditionYear,
  serializeJson,
  type RolloverPreviousEdition,
} from "./rollover.logic.ts";

const previousEdition = (): RolloverPreviousEdition => ({
  year: "2026",
  meta: {
    name: "Example Marathon",
    date: "2026-02-22",
    distanceKm: 42.195,
    city: "Seville",
    startTime: "08:30",
    timezone: "Europe/Madrid",
    officialWebsiteUrl: "https://example.com/",
    summary: "A flat marathon through the historic center.",
    heroNote: "Cheer at Plaza Nueva.",
    waves: [
      { label: "Wheelchair", startTime: "08:29" },
      { label: "General", startTime: "08:30" },
    ],
  },
  source: {
    officialSourceName: "Example Marathon website",
    officialSourceUrl: "https://example.com/",
    routeSourceType: "gpx-import",
    notes: "Imported from the official GPX.",
  },
  localizations: {
    es: {
      meta: { name: "Maratón de Ejemplo", summary: "Un maratón llano." },
      pointLabels: { start: "Salida" },
      waveLabels: ["Silla de ruedas", "General"],
    },
  },
});

describe("input validation helpers", () => {
  it("accepts only real calendar dates", () => {
    expect(isValidCalendarDate("2027-02-28")).toBe(true);
    expect(isValidCalendarDate("2028-02-29")).toBe(true);
    expect(isValidCalendarDate("2027-02-29")).toBe(false);
    expect(isValidCalendarDate("2027-13-01")).toBe(false);
    expect(isValidCalendarDate("27-02-01")).toBe(false);
  });

  it("accepts only HH:MM start times", () => {
    expect(isValidStartTime("08:30")).toBe(true);
    expect(isValidStartTime("23:59")).toBe(true);
    expect(isValidStartTime("24:00")).toBe(false);
    expect(isValidStartTime("8:30")).toBe(false);
  });

  it("accepts only kebab-case race slugs", () => {
    expect(isValidRaceSlug("sevilla-marathon")).toBe(true);
    expect(isValidRaceSlug("../es")).toBe(false);
    expect(isValidRaceSlug("Sevilla")).toBe(false);
  });
});

describe("selectLatestEditionYear", () => {
  it("returns the highest year folder and ignores other folders", () => {
    expect(selectLatestEditionYear(["2025", "2027", "2026", "drafts"])).toBe(
      "2027",
    );
    expect(selectLatestEditionYear(["notes"])).toBeUndefined();
  });
});

describe("buildRolloverEdition", () => {
  it("sets the new date, keeps the start time, and marks both facts provisional", () => {
    const edition = buildRolloverEdition(previousEdition(), {
      date: "2027-02-21",
    });

    expect(edition.year).toBe("2027");
    expect(edition.meta.date).toBe("2027-02-21");
    expect(edition.meta.startTime).toBe("08:30");
    expect(edition.meta.provisional).toEqual({
      route: true,
      startTime: true,
    });
  });

  it("drops waves and localized wave labels but keeps other localizations", () => {
    const edition = buildRolloverEdition(previousEdition(), {
      date: "2027-02-21",
    });

    expect(edition.meta.waves).toBeUndefined();
    expect(edition.localizations).toEqual({
      es: {
        meta: { name: "Maratón de Ejemplo", summary: "Un maratón llano." },
        pointLabels: { start: "Salida" },
      },
    });
    expect(edition.notes.join(" ")).toContain("Dropped 2 waves");
  });

  it("keeps meta key order so the provisional flags sit at the end", () => {
    const edition = buildRolloverEdition(previousEdition(), {
      date: "2027-02-21",
    });

    expect(Object.keys(edition.meta)).toEqual([
      "name",
      "date",
      "distanceKm",
      "city",
      "startTime",
      "timezone",
      "officialWebsiteUrl",
      "summary",
      "heroNote",
      "provisional",
    ]);
  });

  it("marks a start time given at rollover as confirmed", () => {
    const edition = buildRolloverEdition(previousEdition(), {
      date: "2027-02-21",
      startTime: "09:00",
    });

    expect(edition.meta.startTime).toBe("09:00");
    expect(edition.meta.provisional).toEqual({
      route: true,
      startTime: false,
    });
    expect(edition.source.notes).toContain(
      "Start time 09:00 set at rollover and marked confirmed.",
    );
  });

  it("keeps a given start time provisional when asked to", () => {
    const edition = buildRolloverEdition(previousEdition(), {
      date: "2027-02-21",
      startTime: "09:00",
      startTimeProvisional: true,
    });

    expect(edition.meta.startTime).toBe("09:00");
    expect(edition.meta.provisional).toEqual({
      route: true,
      startTime: true,
    });
    expect(edition.source.notes).toContain(
      "Start time 09:00 set at rollover and marked provisional.",
    );
    expect(edition.notes).toContain(
      "Start time 09:00 set at rollover and marked provisional.",
    );
  });

  it("rejects --start-time-provisional without a start time", () => {
    expect(() =>
      buildRolloverEdition(previousEdition(), {
        date: "2027-02-21",
        startTimeProvisional: true,
      }),
    ).toThrow(/needs --start-time/);
  });

  it("re-marks the route provisional when rolling over a confirmed or provisional edition", () => {
    const previous = previousEdition();
    previous.meta.provisional = { route: false, startTime: false };

    expect(
      buildRolloverEdition(previous, { date: "2027-02-21" }).meta.provisional,
    ).toEqual({ route: true, startTime: true });
  });

  it("writes source notes stating that the route was carried over", () => {
    const edition = buildRolloverEdition(previousEdition(), {
      date: "2027-02-21",
    });

    expect(edition.source.officialSourceUrl).toBe("https://example.com/");
    expect(edition.source.routeSourceType).toBe("gpx-import");
    expect(edition.source.notes).toContain(
      "Route and points carried over unchanged from the 2026 edition and not yet confirmed against the 2027 course",
    );
    expect(edition.source.notes).not.toMatch(/had not been published/);
    expect(edition.source.notes).toContain(
      "Start time 08:30 carried over from 2026 and marked provisional",
    );
    expect(edition.source.notes).toContain(
      "Previous edition notes: Imported from the official GPX.",
    );
  });

  it("does not mutate the previous edition", () => {
    const previous = previousEdition();
    const snapshot = structuredClone(previous);

    buildRolloverEdition(previous, { date: "2027-02-21" });

    expect(previous).toEqual(snapshot);
  });

  it("omits localizations when the previous edition has none", () => {
    const previous = previousEdition();
    delete previous.localizations;

    expect(
      buildRolloverEdition(previous, { date: "2027-02-21" }).localizations,
    ).toBeUndefined();
  });

  it("rejects invalid dates, start times, and non-later years", () => {
    expect(() =>
      buildRolloverEdition(previousEdition(), { date: "2027-02-30" }),
    ).toThrow(RolloverError);
    expect(() =>
      buildRolloverEdition(previousEdition(), {
        date: "2027-02-21",
        startTime: "8:30",
      }),
    ).toThrow(RolloverError);
    expect(() =>
      buildRolloverEdition(previousEdition(), { date: "2026-12-31" }),
    ).toThrow(/after the latest edition \(2026\)/);
  });

  it("warns about specialNote, skipped years, and past dates", () => {
    const previous = previousEdition();
    previous.meta.specialNote = "Bag drop closes early.";

    const edition = buildRolloverEdition(previous, {
      date: "2029-02-18",
      now: new Date("2030-01-01T12:00:00Z"),
    });

    expect(edition.warnings).toEqual(
      expect.arrayContaining([
        expect.stringContaining("specialNote was copied from 2026"),
        expect.stringContaining("skips at least one year"),
        expect.stringContaining("already in the past"),
      ]),
    );
  });

  it("returns no warnings when nothing needs review", () => {
    const edition = buildRolloverEdition(previousEdition(), {
      date: "2027-02-21",
      now: new Date("2026-11-27T12:00:00Z"),
    });

    expect(edition.warnings).toEqual([]);
  });

  it("warns when carried-over text mentions the previous year in any locale", () => {
    const previous = previousEdition();
    previous.meta.summary = "A record 40,000 runners for its 2026 edition.";
    previous.localizations!.es.meta!.heroNote = "Novedades de 2026.";
    previous.route = {
      type: "FeatureCollection",
      features: [
        {
          type: "Feature",
          properties: { id: "example-2026-route" },
          geometry: {
            type: "LineString",
            coordinates: [
              [0, 0],
              [1, 1],
            ],
          },
        },
      ],
    };

    const { warnings } = buildRolloverEdition(previous, {
      date: "2027-02-21",
    });

    expect(warnings).toEqual(
      expect.arrayContaining([
        expect.stringMatching(
          /^meta\.json summary mentions the previous edition year 2026/,
        ),
        expect.stringMatching(
          /^localizations\.json es\.heroNote mentions the previous edition year 2026/,
        ),
        expect.stringMatching(
          /^route\.geojson features\[0\]\.properties\.id \(not displayed\)/,
        ),
      ]),
    );
  });
});

describe("findDateMentions", () => {
  const previous = { year: "2026", date: "2026-02-22" };

  it("finds the previous date in English, Spanish, and numeric forms", () => {
    const warnings = findDateMentions(
      [
        { field: "a", text: "Race day is February 22nd." },
        { field: "b", text: "Held on 22 February." },
        { field: "c", text: "La carrera es el 22 de febrero." },
        { field: "d", text: "Fecha: 22/02." },
      ],
      previous,
    );

    for (const field of ["a", "b", "c", "d"]) {
      expect(warnings.some((warning) => warning.startsWith(`${field} `))).toBe(
        true,
      );
    }
  });

  it("flags other years without claiming they are the previous year", () => {
    expect(
      findDateMentions([{ field: "a", text: "Held since 1985." }], previous),
    ).toEqual([expect.stringContaining("mentions the year 1985")]);
  });

  it("ignores text without dates or years", () => {
    expect(
      findDateMentions(
        [{ field: "a", text: "Around 40,000 runners on 2 loops." }],
        previous,
      ),
    ).toEqual([]);
  });
});

describe("serializeJson", () => {
  it("uses two-space indentation and a trailing newline", () => {
    expect(serializeJson({ a: 1 })).toBe('{\n  "a": 1\n}\n');
  });
});
