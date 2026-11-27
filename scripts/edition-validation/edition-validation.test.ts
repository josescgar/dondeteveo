import { describe, expect, it } from "vitest";

import type { EditionRef } from "../lib/edition-path.ts";
import { parseEditionPath } from "../lib/edition-path.ts";
import {
  CHECK_IDS,
  DEFAULT_VALIDATION_OPTIONS,
  applyKnownIssues,
  isValidIanaTimeZone,
  validateCatalog,
  validateEdition,
  type RawEdition,
} from "./edition-validation.logic.ts";

const REF: EditionRef = {
  countryCode: "es",
  raceSlug: "fixture-10k",
  year: "2026",
};

// A straight 10.0 km route due north: 0.0899322 degrees of latitude.
const ROUTE_END_LATITUDE = 40 + 10 / 111.19508;

const validMeta = {
  name: "Fixture 10K",
  date: "2026-05-10",
  distanceKm: 10,
  city: "Madrid",
  startTime: "09:00",
  timezone: "Europe/Madrid",
  officialWebsiteUrl: "https://example.com/",
  summary: "A fixture race.",
  heroNote: "Cheer near the finish.",
};

const validSource = {
  officialSourceName: "Fixture",
  officialSourceUrl: "https://example.com/route",
  routeSourceType: "gpx-import",
  notes: "Fixture data.",
};

const routeOf = (coordinates: [number, number][]) => ({
  type: "FeatureCollection",
  features: [
    {
      type: "Feature",
      properties: { id: "fixture-10k-2026-route" },
      geometry: { type: "LineString", coordinates },
    },
  ],
});

const validRoute = routeOf([
  [-3.7, 40],
  [-3.7, 40.015],
  [-3.7, 40.03],
  [-3.7, 40.045],
  [-3.7, 40.06],
  [-3.7, 40.075],
  [-3.7, ROUTE_END_LATITUDE],
]);

const point = (
  id: string,
  distanceKm: number,
  coordinates: [number, number],
) => ({
  type: "Feature",
  properties: { id, label: id, kind: "split", distanceKm },
  geometry: { type: "Point", coordinates },
});

const validPoints = {
  type: "FeatureCollection",
  features: [
    point("start", 0, [-3.7, 40]),
    point("km-5", 5, [-3.7, 40.044966]),
    point("finish", 10, [-3.7, ROUTE_END_LATITUDE]),
  ],
};

type Overrides = {
  meta?: unknown;
  source?: unknown;
  route?: unknown;
  points?: unknown;
  ref?: EditionRef;
};

const makeEdition = (overrides: Overrides = {}): RawEdition => ({
  ref: overrides.ref ?? REF,
  files: {
    "meta.json": JSON.stringify(overrides.meta ?? validMeta),
    "source.json": JSON.stringify(overrides.source ?? validSource),
    "route.geojson": JSON.stringify(overrides.route ?? validRoute),
    "points.geojson": JSON.stringify(overrides.points ?? validPoints),
  },
});

const checkIds = (raw: RawEdition) =>
  validateEdition(raw).map((finding) => finding.checkId);

describe("validateEdition", () => {
  it("accepts a valid edition", () => {
    expect(validateEdition(makeEdition())).toEqual([]);
  });

  it("reports missing required files", () => {
    const raw = makeEdition();
    delete raw.files["source.json"];
    const findings = validateEdition(raw);
    expect(findings).toHaveLength(1);
    expect(findings[0]).toMatchObject({
      checkId: CHECK_IDS.requiredFiles,
      severity: "error",
      message: "source.json is missing.",
    });
  });

  it("reports invalid JSON and schema errors, including localizations", () => {
    const raw = makeEdition({ meta: { ...validMeta, distanceKm: -1 } });
    raw.files["points.geojson"] = "{ not json";
    raw.files["localizations.json"] = JSON.stringify({ es: { meta: 1 } });
    const findings = validateEdition(raw);
    expect(findings.map((finding) => finding.checkId)).toEqual([
      CHECK_IDS.schema,
      CHECK_IDS.schema,
      CHECK_IDS.schema,
    ]);
    expect(findings[0].message).toMatch(/meta.json[\s\S]*distanceKm/);
    expect(findings[1].message).toMatch(/points.geojson is not valid JSON/);
    expect(findings[2].message).toMatch(/localizations.json/);
  });

  it("rejects invalid time zones", () => {
    expect(
      checkIds(makeEdition({ meta: { ...validMeta, timezone: "Mars/Base" } })),
    ).toEqual([CHECK_IDS.timezone]);
  });

  it("rejects a date outside the folder year", () => {
    expect(
      checkIds(makeEdition({ meta: { ...validMeta, date: "2027-05-10" } })),
    ).toEqual([CHECK_IDS.editionYear]);
  });

  it("rejects a route whose length is outside the tolerance", () => {
    const meta = { ...validMeta, distanceKm: 10.4 };
    const findings = validateEdition(makeEdition({ meta }));
    expect(findings.map((finding) => finding.checkId)).toContain(
      CHECK_IDS.routeLength,
    );
    expect(
      findings.find((finding) => finding.checkId === CHECK_IDS.routeLength)
        ?.message,
    ).toMatch(/10\.000 km differs from distanceKm 10.4 by -3\.85%/);
    // A wider tolerance accepts it.
    expect(
      validateEdition(makeEdition({ meta }), {
        ...DEFAULT_VALIDATION_OPTIONS,
        lengthTolerancePercent: 5,
      }).map((finding) => finding.checkId),
    ).not.toContain(CHECK_IDS.routeLength);
  });

  it("rejects jumps between consecutive coordinates", () => {
    const route = routeOf([
      [-3.7, 40],
      [-3.7, 40.06],
      [-3.7, 40.075],
      [-3.7, ROUTE_END_LATITUDE],
    ]);
    const findings = validateEdition(makeEdition({ route }));
    expect(findings.map((finding) => finding.checkId)).toEqual([
      CHECK_IDS.routeJumps,
    ]);
    expect(findings[0].message).toMatch(
      /6\.672 km between coordinates 0 \[-3\.7, 40\] and 1/,
    );
  });

  it("rejects more than one route feature", () => {
    const route = {
      type: "FeatureCollection",
      features: [validRoute.features[0], validRoute.features[0]],
    };
    expect(checkIds(makeEdition({ route }))).toEqual([
      CHECK_IDS.routeSingleLine,
    ]);
  });

  it("rejects points away from the route", () => {
    const points = {
      ...validPoints,
      features: [...validPoints.features, point("cheer", 6, [-3.699, 40.05])],
    };
    const findings = validateEdition(makeEdition({ points }));
    expect(findings).toHaveLength(1);
    expect(findings[0]).toMatchObject({ checkId: CHECK_IDS.pointsOnRoute });
    expect(findings[0].message).toMatch(/"cheer" is 85\.\d m from the route/);
  });

  it("rejects point distances beyond the race distance", () => {
    const points = {
      ...validPoints,
      features: [
        ...validPoints.features,
        point("late", 10.2, [-3.7, ROUTE_END_LATITUDE]),
      ],
    };
    expect(checkIds(makeEdition({ points }))).toEqual([
      CHECK_IDS.pointDistanceRange,
    ]);
  });

  it("rejects duplicate point ids", () => {
    const points = {
      ...validPoints,
      features: [...validPoints.features, point("km-5", 5, [-3.7, 40.044966])],
    };
    const findings = validateEdition(makeEdition({ points }));
    expect(findings.map((finding) => finding.checkId)).toEqual([
      CHECK_IDS.pointIdsUnique,
    ]);
    expect(findings[0].message).toBe('Point id "km-5" is used 2 times.');
  });

  it("rejects a single wave (through the schema)", () => {
    const meta = {
      ...validMeta,
      waves: [{ label: "Only", startTime: "09:00" }],
    };
    expect(checkIds(makeEdition({ meta }))).toEqual([CHECK_IDS.schema]);
  });

  it("accepts two or more waves", () => {
    const meta = {
      ...validMeta,
      waves: [
        { label: "Elite", startTime: "09:00" },
        { label: "Wave 1", startTime: "09:10" },
      ],
    };
    expect(checkIds(makeEdition({ meta }))).toEqual([]);
  });
});

describe("isValidIanaTimeZone", () => {
  it("accepts IANA names and rejects offsets and junk", () => {
    expect(isValidIanaTimeZone("Europe/Madrid")).toBe(true);
    expect(isValidIanaTimeZone("Atlantic/Canary")).toBe(true);
    expect(isValidIanaTimeZone("UTC")).toBe(true);
    expect(isValidIanaTimeZone("+01:00")).toBe(false);
    expect(isValidIanaTimeZone("GMT+1")).toBe(false);
    expect(isValidIanaTimeZone("Europe/Atlantis")).toBe(false);
    expect(isValidIanaTimeZone("")).toBe(false);
  });
});

describe("validateCatalog", () => {
  const otherCountry: EditionRef = { ...REF, countryCode: "pt" };

  it("reports slugs reused across countries", () => {
    const report = validateCatalog({
      editions: [makeEdition()],
      catalog: [REF, otherCountry],
    });
    expect(report.errorCount).toBe(1);
    expect(report.editions[0].findings[0]).toMatchObject({
      checkId: CHECK_IDS.slugUnique,
      message: 'Race slug "fixture-10k" is used in several countries: es, pt.',
    });
  });

  it("allows several years of the same race in one country", () => {
    const nextYear = { ...REF, year: "2027" };
    const report = validateCatalog({
      editions: [makeEdition()],
      catalog: [REF, nextYear],
    });
    expect(report.errorCount).toBe(0);
  });

  it("only reports catalog findings for the editions being validated", () => {
    const report = validateCatalog({
      editions: [makeEdition()],
      catalog: [
        REF,
        { countryCode: "es", raceSlug: "dup", year: "2026" },
        { countryCode: "fr", raceSlug: "dup", year: "2026" },
      ],
    });
    expect(report.errorCount).toBe(0);
  });

  it("downgrades known issues to warnings and keeps exit-relevant counts", () => {
    const meta = { ...validMeta, distanceKm: 10.4 };
    const report = validateCatalog({
      editions: [makeEdition({ meta })],
      catalog: [REF],
      knownIssues: [
        {
          edition: "es/fixture-10k/2026",
          checkId: CHECK_IDS.routeLength,
          reason: "legacy trace",
        },
      ],
    });
    expect(report.errorCount).toBe(0);
    expect(report.warningCount).toBe(1);
    expect(report.editions[0].findings[0].message).toMatch(
      /\[known issue: legacy trace\]$/,
    );
  });
});

describe("applyKnownIssues", () => {
  it("warns when a known issue no longer reproduces", () => {
    const findings = applyKnownIssues(
      REF,
      [],
      [
        {
          edition: "es/fixture-10k/2026",
          checkId: "route-length",
          reason: "x",
        },
      ],
    );
    expect(findings).toEqual([
      expect.objectContaining({
        checkId: CHECK_IDS.knownIssues,
        severity: "warning",
      }),
    ]);
  });

  it("ignores known issues for other editions", () => {
    expect(
      applyKnownIssues(
        REF,
        [],
        [{ edition: "es/other/2026", checkId: "route-length", reason: "x" }],
      ),
    ).toEqual([]);
  });
});

describe("parseEditionPath", () => {
  it("reads the country, slug and year", () => {
    expect(parseEditionPath("data/es/sevilla-marathon/2027/")).toEqual({
      countryCode: "es",
      raceSlug: "sevilla-marathon",
      year: "2027",
    });
  });

  it("rejects paths that are not edition folders", () => {
    expect(() => parseEditionPath("data/es/sevilla-marathon")).toThrow(
      /not an edition folder/,
    );
    expect(() => parseEditionPath("data/ESP/race/2027")).toThrow();
    expect(() => parseEditionPath("data/es/Race_Name/2027")).toThrow();
  });
});
