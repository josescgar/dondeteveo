import path from "node:path";

import { describe, expect, it } from "vitest";

import {
  parseEditionPath,
  resolveEditionDirectory,
  type EditionRef,
} from "../lib/edition-path.ts";
import {
  CHECK_IDS,
  DEFAULT_VALIDATION_OPTIONS,
  isValidIanaTimeZone,
  validateCatalog,
  validateEdition,
  validateKnownIssues,
  type CatalogListing,
  type KnownIssue,
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

describe("point checks", () => {
  // Two kilometres north of the start.
  const TWO_KM_LATITUDE = 40 + 2 / 111.19508;
  const FIVE_KM_LATITUDE = 40 + 5 / 111.19508;

  it("rejects a point whose position does not match its distanceKm", () => {
    const points = {
      ...validPoints,
      features: [
        point("start", 0, [-3.7, 40]),
        // Placed at about km 8 but labelled km 5.
        point("km-5", 5, [-3.7, 40 + 8 / 111.19508]),
        point("finish", 10, [-3.7, ROUTE_END_LATITUDE]),
      ],
    };
    const findings = validateEdition(makeEdition({ points }));
    expect(findings.map((finding) => finding.checkId)).toEqual([
      CHECK_IDS.pointPosition,
    ]);
    expect(findings[0].message).toMatch(
      /"km-5" has distanceKm 5 but sits about 8\.000 km along the route .*tolerance 1\.000 km/,
    );
  });

  it("uses the larger of 1 km and 5% of the race distance", () => {
    const points = {
      ...validPoints,
      features: [
        point("start", 0, [-3.7, 40]),
        point("km-5", 5, [-3.7, 40 + 5.9 / 111.19508]),
        point("finish", 10, [-3.7, ROUTE_END_LATITUDE]),
      ],
    };
    expect(checkIds(makeEdition({ points }))).toEqual([]);
    expect(
      validateEdition(makeEdition({ points }), {
        ...DEFAULT_VALIDATION_OPTIONS,
        pointPositionToleranceKm: 0.5,
      }).map((finding) => finding.checkId),
    ).toEqual([CHECK_IDS.pointPosition]);
  });

  it("matches the right pass on an out-and-back course", () => {
    const route = routeOf([
      [-3.7, 40],
      [-3.7, 40.015],
      [-3.7, 40.03],
      [-3.7, FIVE_KM_LATITUDE],
      [-3.7, 40.03],
      [-3.7, 40.015],
      [-3.7, 40],
    ]);
    const pointsWith = (...extra: ReturnType<typeof point>[]) => ({
      type: "FeatureCollection",
      features: [
        point("start", 0, [-3.7, 40]),
        ...extra,
        // The finish is back at the start: matched to the end, not km 0.
        point("finish", 10, [-3.7, 40]),
      ],
    });
    const outbound = point("km-2", 2, [-3.7, TWO_KM_LATITUDE]);
    const inbound = point("km-8", 8, [-3.7, TWO_KM_LATITUDE]);
    expect(
      checkIds(makeEdition({ route, points: pointsWith(outbound, inbound) })),
    ).toEqual([]);
    const wrong = point("km-5", 5, [-3.7, TWO_KM_LATITUDE]);
    expect(checkIds(makeEdition({ route, points: pointsWith(wrong) }))).toEqual(
      [CHECK_IDS.pointPosition],
    );
  });

  it("requires start and finish points", () => {
    const points = {
      ...validPoints,
      features: [point("km-5", 5, [-3.7, 40.044966])],
    };
    const findings = validateEdition(makeEdition({ points }));
    expect(findings.map((finding) => finding.message)).toEqual([
      "No point at distanceKm 0 (start).",
      "No point at distanceKm 10 (finish, the official distance).",
    ]);
    expect(
      findings.every((f) => f.checkId === CHECK_IDS.startFinishPoints),
    ).toBe(true);
  });

  it("rejects pointLabels keys that are not point ids", () => {
    const raw = makeEdition();
    raw.files["localizations.json"] = JSON.stringify({
      es: { pointLabels: { start: "Salida", ghost: "Fantasma" } },
    });
    const findings = validateEdition(raw);
    expect(findings).toEqual([
      expect.objectContaining({
        checkId: CHECK_IDS.localizationPointLabels,
        severity: "error",
        message:
          'localizations.json "es" pointLabels has "ghost", which is not a point id.',
      }),
    ]);
  });
});

describe("known issues", () => {
  const pointsFinishingAt = (distanceKm: number) => ({
    type: "FeatureCollection",
    features: [
      point("start", 0, [-3.7, 40]),
      point("finish", distanceKm, [-3.7, ROUTE_END_LATITUDE]),
    ],
  });
  const editionWithDistance = (distanceKm: number) =>
    makeEdition({
      meta: { ...validMeta, distanceKm },
      points: pointsFinishingAt(distanceKm),
    });
  const exception: KnownIssue = {
    edition: "es/fixture-10k/2026",
    checkId: CHECK_IDS.routeLength,
    options: { lengthTolerancePercent: 4 },
    reason: "legacy trace",
  };

  it("downgrades errors within the exception's limits to warnings", () => {
    // 10.000 km measured against 10.4 km official: -3.85%.
    const report = validateCatalog({
      editions: [editionWithDistance(10.4)],
      catalog: { editions: [REF], topLevelFolders: ["es"] },
      knownIssues: [exception],
    });
    expect(report.errorCount).toBe(0);
    expect(report.warningCount).toBe(1);
    expect(report.editions[0].findings[0].message).toMatch(
      /-3\.85% \(tolerance ±3%\)\. \[accepted exception \(lengthTolerancePercent 4\): legacy trace\]$/,
    );
  });

  it("keeps errors beyond the exception's limits", () => {
    // 10.000 km measured against 12 km official: -16.67%.
    const report = validateCatalog({
      editions: [editionWithDistance(12)],
      catalog: { editions: [REF], topLevelFolders: ["es"] },
      knownIssues: [exception],
    });
    expect(report.errorCount).toBe(1);
    expect(report.editions[0].findings[0]).toMatchObject({
      checkId: CHECK_IDS.routeLength,
      severity: "error",
    });
    expect(report.editions[0].findings[0].message).toMatch(
      /-16\.67% \(tolerance ±4%\)\. \[exceeds the accepted exception/,
    );
  });

  it("warns when an exception is no longer needed", () => {
    const findings = validateEdition(
      makeEdition(),
      DEFAULT_VALIDATION_OPTIONS,
      undefined,
      [exception],
    );
    expect(findings).toEqual([
      expect.objectContaining({
        checkId: CHECK_IDS.knownIssues,
        severity: "warning",
      }),
    ]);
  });

  it("ignores exceptions for other editions", () => {
    expect(
      validateEdition(makeEdition(), DEFAULT_VALIDATION_OPTIONS, undefined, [
        { ...exception, edition: "es/other/2026" },
      ]),
    ).toEqual([]);
  });

  it("rejects unbounded or unknown exceptions", () => {
    expect(
      validateKnownIssues([
        { ...exception, options: {} },
        { ...exception, checkId: CHECK_IDS.slugUnique },
      ]).map((finding) => finding.message),
    ).toEqual([
      "Known issue for es/fixture-10k/2026 is invalid: it has no limits in options, so it would be unbounded.",
      'Known issue for es/fixture-10k/2026 is invalid: check "slug-unique" is not an edition check.',
    ]);
  });
});

describe("validateCatalog", () => {
  const otherCountry: EditionRef = { ...REF, countryCode: "pt" };
  const listing = (...editions: EditionRef[]): CatalogListing => ({
    editions,
    topLevelFolders: [...new Set(editions.map((ref) => ref.countryCode))],
  });

  it("reports slugs reused across countries", () => {
    const report = validateCatalog({
      editions: [makeEdition()],
      catalog: listing(REF, otherCountry),
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
      catalog: listing(REF, nextYear),
    });
    expect(report.errorCount).toBe(0);
  });

  it("only reports edition findings for the editions being validated", () => {
    const report = validateCatalog({
      editions: [makeEdition()],
      catalog: listing(
        REF,
        { countryCode: "es", raceSlug: "dup", year: "2026" },
        { countryCode: "fr", raceSlug: "dup", year: "2026" },
      ),
    });
    expect(report.errorCount).toBe(0);
  });

  it("rejects top-level folders that are not country codes", () => {
    const report = validateCatalog({
      editions: [makeEdition()],
      catalog: { editions: [REF], topLevelFolders: ["ES", "es", "watchlist"] },
    });
    expect(report.errorCount).toBe(2);
    expect(report.catalogFindings.map((finding) => finding.message)).toEqual([
      "data/ES is not a two-letter lowercase country code; the site loads every folder under data/ as a country. Move or rename it.",
      "data/watchlist is not a two-letter lowercase country code; the site loads every folder under data/ as a country. Move or rename it.",
    ]);
  });

  it("rejects badly named race and year folders", () => {
    const ref = { countryCode: "es", raceSlug: "Bad_Slug", year: "26" };
    const report = validateCatalog({
      editions: [makeEdition({ ref })],
      catalog: listing(ref),
    });
    expect(
      report.editions[0].findings.map((finding) => finding.checkId),
    ).toContain(CHECK_IDS.folderNames);
  });
});

describe("edition paths", () => {
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

  it("resolves editions inside the data directory", () => {
    const { ref, directory } = resolveEditionDirectory(
      "/repo/data",
      "/repo/data/es/./sevilla-marathon/2027/",
    );
    expect(ref).toEqual({
      countryCode: "es",
      raceSlug: "sevilla-marathon",
      year: "2027",
    });
    expect(directory).toBe(path.resolve("/repo/data/es/sevilla-marathon/2027"));
  });

  it("refuses targets outside the data directory", () => {
    expect(() =>
      resolveEditionDirectory(
        "/repo/data",
        "/repo/data/../escape/es/evil/2027",
      ),
    ).toThrow(/not an edition folder inside the data directory/);
    expect(() =>
      resolveEditionDirectory("data", "../escape/es/evil-race/2027"),
    ).toThrow(/not an edition folder inside the data directory/);
    expect(() =>
      resolveEditionDirectory("/repo/data", "/repo/data/es/race/2027/extra"),
    ).toThrow(/not an edition folder inside the data directory/);
    expect(() =>
      resolveEditionDirectory("/repo/data", "/repo/data/es/race"),
    ).toThrow(/not an edition folder inside the data directory/);
  });
});
