import { z } from "zod";

import {
  localizationsSchema,
  metaSchema,
  pointsFeatureCollectionSchema,
  routeFeatureCollectionSchema,
  sourceSchema,
  type RaceLocalizations,
  type RaceMeta,
  type RacePointsCollection,
  type RaceRouteCollection,
  type RaceSource,
} from "../../src/lib/races/schemas.ts";
import {
  distanceToLineKm,
  lineLengthKm,
  projectOntoLine,
  segmentLengths,
  type Position,
} from "../lib/geo.ts";
import {
  COUNTRY_CODE_PATTERN,
  RACE_SLUG_PATTERN,
  YEAR_PATTERN,
  editionKey,
  type EditionRef,
} from "../lib/edition-path.ts";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export const SEVERITIES = ["error", "warning"] as const;
export type Severity = (typeof SEVERITIES)[number];

export type Issue = {
  severity: Severity;
  message: string;
};

export type Finding = Issue & {
  checkId: string;
  /** Absent for catalog-wide findings that belong to no single edition. */
  edition?: EditionRef;
};

export const REQUIRED_EDITION_FILES = [
  "meta.json",
  "source.json",
  "route.geojson",
  "points.geojson",
] as const;
export const OPTIONAL_EDITION_FILES = ["localizations.json"] as const;
export type EditionFileName =
  | (typeof REQUIRED_EDITION_FILES)[number]
  | (typeof OPTIONAL_EDITION_FILES)[number];

/** File contents as read from disk; a missing file is `undefined`. */
export type RawEdition = {
  ref: EditionRef;
  files: Partial<Record<EditionFileName, string>>;
};

export type ParsedEdition = {
  ref: EditionRef;
  meta: RaceMeta;
  source: RaceSource;
  route: RaceRouteCollection;
  points: RacePointsCollection;
  localizations?: RaceLocalizations;
};

export type ValidationOptions = {
  /** Allowed difference between measured route length and `distanceKm`. */
  lengthTolerancePercent: number;
  /** Largest allowed distance between consecutive route coordinates. */
  maxJumpKm: number;
  /** Largest allowed distance from a point to the route line. */
  maxPointOffsetKm: number;
  /**
   * A point's position along the route, scaled to the official distance, may
   * differ from its `distanceKm` by the larger of these two limits.
   */
  pointPositionToleranceKm: number;
  pointPositionTolerancePercent: number;
};

export const DEFAULT_VALIDATION_OPTIONS: ValidationOptions = {
  lengthTolerancePercent: 3,
  maxJumpKm: 2,
  maxPointOffsetKm: 0.05,
  pointPositionToleranceKm: 1,
  pointPositionTolerancePercent: 5,
};

/** A check that looks at one fully parsed edition. */
export type EditionCheck = {
  id: string;
  description: string;
  run: (edition: ParsedEdition, options: ValidationOptions) => Issue[];
};

/** What the data directory contains, for cross-edition checks. */
export type CatalogListing = {
  /** Every `<top>/<slug>/<year>` folder under the data directory. */
  editions: EditionRef[];
  /** Every top-level folder under the data directory. */
  topLevelFolders: string[];
};

/** A check that looks across the whole catalog. */
export type CatalogCheck = {
  id: string;
  description: string;
  run: (catalog: CatalogListing, options: ValidationOptions) => Finding[];
};

/**
 * A bounded, accepted exception for one edition and one edition check. The
 * check is re-run with `options` (looser limits): if the edition passes them,
 * the original errors are reported as warnings; anything beyond them is still
 * an error. The validator warns when the exception is no longer needed.
 */
export type KnownIssue = {
  /** Edition key, e.g. `es/media-maraton-malaga/2026`. */
  edition: string;
  checkId: string;
  /** The looser limits this edition is allowed; must not be empty. */
  options: Partial<ValidationOptions>;
  reason: string;
};

export type EditionReport = {
  ref: EditionRef;
  findings: Finding[];
};

export type ValidationReport = {
  editions: EditionReport[];
  /** Findings that belong to the catalog as a whole. */
  catalogFindings: Finding[];
  errorCount: number;
  warningCount: number;
};

export const CHECK_IDS = {
  requiredFiles: "required-files",
  schema: "schema",
  editionYear: "edition-year",
  timezone: "timezone",
  waves: "waves",
  routeSingleLine: "route-single-line",
  routeLength: "route-length",
  routeJumps: "route-jumps",
  pointsOnRoute: "points-on-route",
  pointDistanceRange: "point-distance-range",
  pointIdsUnique: "point-ids-unique",
  pointPosition: "point-position",
  startFinishPoints: "start-finish-points",
  localizationPointLabels: "localization-point-labels",
  folderNames: "folder-names",
  slugUnique: "slug-unique",
  knownIssues: "known-issues",
} as const;

const KM_TO_M = 1000;
const PERCENT = 100;
const MIN_WAVES = 2;
/** Floating-point slack when comparing official distances. */
const DISTANCE_EPSILON_KM = 1e-6;

const error = (message: string): Issue => ({ severity: "error", message });
const warning = (message: string): Issue => ({ severity: "warning", message });

const formatPosition = ([longitude, latitude]: Position): string =>
  `[${longitude}, ${latitude}]`;

// ---------------------------------------------------------------------------
// Parsing: required files, JSON and Zod schemas
// ---------------------------------------------------------------------------

const SCHEMAS: Record<EditionFileName, z.ZodType> = {
  "meta.json": metaSchema,
  "source.json": sourceSchema,
  "route.geojson": routeFeatureCollectionSchema,
  "points.geojson": pointsFeatureCollectionSchema,
  "localizations.json": localizationsSchema,
};

export type ParseResult = {
  edition?: ParsedEdition;
  issues: (Issue & { checkId: string })[];
};

export const parseEdition = (raw: RawEdition): ParseResult => {
  const issues: ParseResult["issues"] = [];
  const parsed: Partial<Record<EditionFileName, unknown>> = {};

  for (const fileName of [
    ...REQUIRED_EDITION_FILES,
    ...OPTIONAL_EDITION_FILES,
  ]) {
    const content = raw.files[fileName];
    if (content === undefined) {
      if ((REQUIRED_EDITION_FILES as readonly string[]).includes(fileName)) {
        issues.push({
          checkId: CHECK_IDS.requiredFiles,
          ...error(`${fileName} is missing.`),
        });
      }
      continue;
    }
    let json: unknown;
    try {
      json = JSON.parse(content);
    } catch (parseError) {
      issues.push({
        checkId: CHECK_IDS.schema,
        ...error(
          `${fileName} is not valid JSON: ${parseError instanceof Error ? parseError.message : String(parseError)}`,
        ),
      });
      continue;
    }
    const result = SCHEMAS[fileName].safeParse(json);
    if (!result.success) {
      issues.push({
        checkId: CHECK_IDS.schema,
        ...error(
          `${fileName} does not match its schema:\n${z.prettifyError(result.error)}`,
        ),
      });
      continue;
    }
    parsed[fileName] = result.data;
  }

  if (issues.length > 0) {
    return { issues };
  }
  return {
    issues,
    edition: {
      ref: raw.ref,
      meta: parsed["meta.json"] as RaceMeta,
      source: parsed["source.json"] as RaceSource,
      route: parsed["route.geojson"] as RaceRouteCollection,
      points: parsed["points.geojson"] as RacePointsCollection,
      localizations: parsed["localizations.json"] as
        RaceLocalizations | undefined,
    },
  };
};

// ---------------------------------------------------------------------------
// Edition checks
// ---------------------------------------------------------------------------

const SUPPORTED_TIME_ZONES = new Set(Intl.supportedValuesOf("timeZone"));
const UTC_OFFSET_PATTERN = /^(?:[+-]|(?:GMT|UTC)[+-])\d/i;

/**
 * True for IANA zone names, including legacy aliases the runtime still knows
 * (e.g. `UTC`). Rejects raw UTC offsets, which `Intl` would otherwise accept.
 */
export const isValidIanaTimeZone = (timeZone: string): boolean => {
  if (SUPPORTED_TIME_ZONES.has(timeZone)) {
    return true;
  }
  if (UTC_OFFSET_PATTERN.test(timeZone)) {
    return false;
  }
  try {
    new Intl.DateTimeFormat("en-US", { timeZone });
    return true;
  } catch {
    return false;
  }
};

const routeCoordinates = (edition: ParsedEdition): Position[] =>
  edition.route.features[0].geometry.coordinates;

export const EDITION_CHECKS: readonly EditionCheck[] = [
  {
    id: CHECK_IDS.editionYear,
    description: "meta.date falls in the edition folder's year",
    run: ({ meta, ref }) =>
      meta.date.startsWith(`${ref.year}-`)
        ? []
        : [
            error(
              `meta.date ${meta.date} is not in the folder year ${ref.year}.`,
            ),
          ],
  },
  {
    id: CHECK_IDS.timezone,
    description: "meta.timezone is a valid IANA time zone",
    run: ({ meta }) =>
      isValidIanaTimeZone(meta.timezone)
        ? []
        : [
            error(
              `meta.timezone "${meta.timezone}" is not a valid IANA time zone.`,
            ),
          ],
  },
  {
    id: CHECK_IDS.waves,
    description: "meta.waves, when present, has at least two entries",
    run: ({ meta }) =>
      meta.waves === undefined || meta.waves.length >= MIN_WAVES
        ? []
        : [
            error(
              `meta.waves has ${meta.waves.length} entries; omit it or list at least ${MIN_WAVES}.`,
            ),
          ],
  },
  {
    id: CHECK_IDS.routeSingleLine,
    description: "route.geojson holds exactly one LineString feature",
    run: ({ route }) =>
      route.features.length === 1
        ? []
        : [
            error(
              `route.geojson has ${route.features.length} features; expected one LineString.`,
            ),
          ],
  },
  {
    id: CHECK_IDS.routeLength,
    description: "measured route length is within tolerance of distanceKm",
    run: (edition, { lengthTolerancePercent }) => {
      const measuredKm = lineLengthKm(routeCoordinates(edition));
      const officialKm = edition.meta.distanceKm;
      const differencePercent =
        ((measuredKm - officialKm) / officialKm) * PERCENT;
      if (Math.abs(differencePercent) <= lengthTolerancePercent) {
        return [];
      }
      return [
        error(
          `Measured route length ${measuredKm.toFixed(3)} km differs from distanceKm ${officialKm} by ${differencePercent >= 0 ? "+" : ""}${differencePercent.toFixed(2)}% (tolerance ±${lengthTolerancePercent}%).`,
        ),
      ];
    },
  },
  {
    id: CHECK_IDS.routeJumps,
    description: "no jump between consecutive route coordinates over the limit",
    run: (edition, { maxJumpKm }) => {
      const coordinates = routeCoordinates(edition);
      return segmentLengths(coordinates)
        .filter((segment) => segment.lengthKm > maxJumpKm)
        .map((segment) =>
          error(
            `Route jumps ${segment.lengthKm.toFixed(3)} km between coordinates ${segment.index} ${formatPosition(coordinates[segment.index])} and ${segment.index + 1} ${formatPosition(coordinates[segment.index + 1])} (limit ${maxJumpKm} km).`,
          ),
        );
    },
  },
  {
    id: CHECK_IDS.pointsOnRoute,
    description: "every point lies on or very near the route",
    run: (edition, { maxPointOffsetKm }) => {
      const coordinates = routeCoordinates(edition);
      return edition.points.features.flatMap((feature) => {
        const offsetKm = distanceToLineKm(
          feature.geometry.coordinates,
          coordinates,
        );
        return offsetKm <= maxPointOffsetKm
          ? []
          : [
              error(
                `Point "${feature.properties.id}" is ${(offsetKm * KM_TO_M).toFixed(1)} m from the route (limit ${(maxPointOffsetKm * KM_TO_M).toFixed(0)} m).`,
              ),
            ];
      });
    },
  },
  {
    id: CHECK_IDS.pointDistanceRange,
    description:
      "every point distanceKm is between 0 and the race distance (points use official, normalised distances)",
    run: ({ meta, points }) =>
      points.features
        .filter(
          (feature) =>
            feature.properties.distanceKm >
            meta.distanceKm + DISTANCE_EPSILON_KM,
        )
        .map((feature) =>
          error(
            `Point "${feature.properties.id}" has distanceKm ${feature.properties.distanceKm}, beyond the race distance ${meta.distanceKm}.`,
          ),
        ),
  },
  {
    id: CHECK_IDS.pointIdsUnique,
    description: "point ids are unique",
    run: ({ points }) => {
      const counts = new Map<string, number>();
      for (const feature of points.features) {
        counts.set(
          feature.properties.id,
          (counts.get(feature.properties.id) ?? 0) + 1,
        );
      }
      return [...counts]
        .filter(([, count]) => count > 1)
        .map(([id, count]) =>
          error(`Point id "${id}" is used ${count} times.`),
        );
    },
  },
  {
    id: CHECK_IDS.pointPosition,
    description:
      "each point sits where its distanceKm says along the route (nearest matching pass for out-and-back legs and laps)",
    run: (edition, options) => {
      const coordinates = routeCoordinates(edition);
      const measuredKm = lineLengthKm(coordinates);
      const officialKm = edition.meta.distanceKm;
      const toleranceKm = Math.max(
        options.pointPositionToleranceKm,
        (officialKm * options.pointPositionTolerancePercent) / PERCENT,
      );
      return edition.points.features.flatMap((feature) => {
        const expectedKm = feature.properties.distanceKm;
        const alongKm = pointPositionKm(
          feature.geometry.coordinates,
          coordinates,
          measuredKm,
          officialKm,
          expectedKm,
          options.maxPointOffsetKm,
        );
        return Math.abs(alongKm - expectedKm) <= toleranceKm
          ? []
          : [
              error(
                `Point "${feature.properties.id}" has distanceKm ${expectedKm} but sits about ${alongKm.toFixed(3)} km along the route (scaled to the official distance; tolerance ${toleranceKm.toFixed(3)} km).`,
              ),
            ];
      });
    },
  },
  {
    id: CHECK_IDS.startFinishPoints,
    description:
      "points include one at distance 0 and one at the official distance",
    run: ({ meta, points }) => {
      const distances = points.features.map(
        (feature) => feature.properties.distanceKm,
      );
      const has = (target: number) =>
        distances.some(
          (distance) => Math.abs(distance - target) <= DISTANCE_EPSILON_KM,
        );
      return [
        ...(has(0) ? [] : [error("No point at distanceKm 0 (start).")]),
        ...(has(meta.distanceKm)
          ? []
          : [
              error(
                `No point at distanceKm ${meta.distanceKm} (finish, the official distance).`,
              ),
            ]),
      ];
    },
  },
  {
    id: CHECK_IDS.localizationPointLabels,
    description: "localizations.json pointLabels keys are existing point ids",
    run: ({ localizations, points }) => {
      const ids = new Set(
        points.features.map((feature) => feature.properties.id),
      );
      return Object.entries(localizations ?? {}).flatMap(([locale, entry]) =>
        Object.keys(entry.pointLabels ?? {})
          .filter((id) => !ids.has(id))
          .map((id) =>
            error(
              `localizations.json "${locale}" pointLabels has "${id}", which is not a point id.`,
            ),
          ),
      );
    },
  },
];

/**
 * Along-route position of a point, scaled to the official distance. Of the
 * passes that come within `maxOffsetKm` of the closest one, the one nearest to
 * `expectedKm` wins, so a point on an out-and-back road or a lap course is
 * matched to the pass its `distanceKm` refers to.
 */
export const pointPositionKm = (
  point: Position,
  coordinates: readonly Position[],
  measuredKm: number,
  officialKm: number,
  expectedKm: number,
  maxOffsetKm: number,
): number => {
  const projections = projectOntoLine(point, coordinates);
  const closestKm = Math.min(
    ...projections.map((projection) => projection.offsetKm),
  );
  const scale = measuredKm === 0 ? 0 : officialKm / measuredKm;
  return projections
    .filter((projection) => projection.offsetKm <= closestKm + maxOffsetKm)
    .map((projection) => projection.alongKm * scale)
    .reduce((best, candidate) =>
      Math.abs(candidate - expectedKm) < Math.abs(best - expectedKm)
        ? candidate
        : best,
    );
};

// ---------------------------------------------------------------------------
// Catalog checks
// ---------------------------------------------------------------------------

export const CATALOG_CHECKS: readonly CatalogCheck[] = [
  {
    id: CHECK_IDS.folderNames,
    description:
      "every folder under data/ is <iso-country>/<race-slug>/<year> (the site loads them all)",
    run: ({ editions, topLevelFolders }) => [
      ...topLevelFolders
        .filter((folder) => !COUNTRY_CODE_PATTERN.test(folder))
        .map((folder) => ({
          checkId: CHECK_IDS.folderNames,
          ...error(
            `data/${folder} is not a two-letter lowercase country code; the site loads every folder under data/ as a country. Move or rename it.`,
          ),
        })),
      ...editions
        .filter(
          (ref) =>
            COUNTRY_CODE_PATTERN.test(ref.countryCode) &&
            (!RACE_SLUG_PATTERN.test(ref.raceSlug) ||
              !YEAR_PATTERN.test(ref.year)),
        )
        .map((ref) => ({
          checkId: CHECK_IDS.folderNames,
          edition: ref,
          ...error(
            "Folder name must be a kebab-case race slug followed by a four-digit year.",
          ),
        })),
    ],
  },
  {
    id: CHECK_IDS.slugUnique,
    description: "race slugs are globally unique across countries",
    run: ({ editions }) => {
      const countriesBySlug = new Map<string, Set<string>>();
      for (const ref of editions) {
        const countries =
          countriesBySlug.get(ref.raceSlug) ?? new Set<string>();
        countries.add(ref.countryCode);
        countriesBySlug.set(ref.raceSlug, countries);
      }
      return editions
        .filter((ref) => (countriesBySlug.get(ref.raceSlug)?.size ?? 0) > 1)
        .map((ref) => ({
          checkId: CHECK_IDS.slugUnique,
          edition: ref,
          ...error(
            `Race slug "${ref.raceSlug}" is used in several countries: ${[...(countriesBySlug.get(ref.raceSlug) ?? [])].sort().join(", ")}.`,
          ),
        }));
    },
  },
];

// ---------------------------------------------------------------------------
// Runner
// ---------------------------------------------------------------------------

const describeLimits = (options: Partial<ValidationOptions>): string =>
  Object.entries(options)
    .map(([name, value]) => `${name} ${value}`)
    .join(", ");

/**
 * Runs one check, applying a bounded known issue when there is one: errors
 * within the exception's looser limits become warnings, errors beyond them
 * stay errors, and an exception that is no longer needed is reported.
 */
const runCheck = (
  check: EditionCheck,
  edition: ParsedEdition,
  options: ValidationOptions,
  known: KnownIssue | undefined,
): Finding[] => {
  const toFinding = (issue: Issue, checkId = check.id): Finding => ({
    ...issue,
    checkId,
    edition: edition.ref,
  });
  const issues = check.run(edition, options);
  if (!known) {
    return issues.map((issue) => toFinding(issue));
  }
  if (!issues.some((issue) => issue.severity === "error")) {
    return [
      ...issues.map((issue) => toFinding(issue)),
      toFinding(
        warning(
          `Accepted exception for check "${check.id}" is no longer needed; remove it from known-issues.ts.`,
        ),
        CHECK_IDS.knownIssues,
      ),
    ];
  }
  const limits = describeLimits(known.options);
  const looserIssues = check.run(edition, { ...options, ...known.options });
  if (looserIssues.some((issue) => issue.severity === "error")) {
    return looserIssues.map((issue) =>
      toFinding({
        ...issue,
        message: `${issue.message} [exceeds the accepted exception (${limits}): ${known.reason}]`,
      }),
    );
  }
  return issues.map((issue) =>
    toFinding({
      severity: "warning",
      message: `${issue.message} [accepted exception (${limits}): ${known.reason}]`,
    }),
  );
};

export const validateEdition = (
  raw: RawEdition,
  options: ValidationOptions = DEFAULT_VALIDATION_OPTIONS,
  checks: readonly EditionCheck[] = EDITION_CHECKS,
  knownIssues: readonly KnownIssue[] = [],
): Finding[] => {
  const { edition, issues } = parseEdition(raw);
  const findings: Finding[] = issues.map((issue) => ({
    ...issue,
    edition: raw.ref,
  }));
  if (!edition) {
    return findings;
  }
  const key = editionKey(raw.ref);
  for (const check of checks) {
    const known = knownIssues.find(
      (item) => item.edition === key && item.checkId === check.id,
    );
    findings.push(...runCheck(check, edition, options, known));
  }
  return findings;
};

/** Known issues must name an edition check and carry at least one limit. */
export const validateKnownIssues = (
  knownIssues: readonly KnownIssue[],
  checks: readonly EditionCheck[] = EDITION_CHECKS,
): Finding[] =>
  knownIssues.flatMap((known) => {
    const problems = [
      ...(checks.some((check) => check.id === known.checkId)
        ? []
        : [`check "${known.checkId}" is not an edition check`]),
      ...(Object.keys(known.options).length > 0
        ? []
        : ["it has no limits in options, so it would be unbounded"]),
    ];
    return problems.map((problem) => ({
      checkId: CHECK_IDS.knownIssues,
      ...error(`Known issue for ${known.edition} is invalid: ${problem}.`),
    }));
  });

export type ValidateCatalogInput = {
  /** Editions to validate in full. */
  editions: RawEdition[];
  /** Everything in the data directory, for catalog checks. */
  catalog: CatalogListing;
  options?: ValidationOptions;
  knownIssues?: readonly KnownIssue[];
  editionChecks?: readonly EditionCheck[];
  catalogChecks?: readonly CatalogCheck[];
};

export const validateCatalog = ({
  editions,
  catalog,
  options = DEFAULT_VALIDATION_OPTIONS,
  knownIssues = [],
  editionChecks = EDITION_CHECKS,
  catalogChecks = CATALOG_CHECKS,
}: ValidateCatalogInput): ValidationReport => {
  const catalogWide = catalogChecks.flatMap((check) =>
    check.run(catalog, options),
  );
  const reports = editions.map((raw) => {
    const key = editionKey(raw.ref);
    return {
      ref: raw.ref,
      findings: [
        ...validateEdition(raw, options, editionChecks, knownIssues),
        ...catalogWide.filter(
          (finding) => finding.edition && editionKey(finding.edition) === key,
        ),
      ],
    };
  });
  const catalogFindings = [
    ...validateKnownIssues(knownIssues, editionChecks),
    ...catalogWide.filter((finding) => !finding.edition),
  ];
  const all = [
    ...catalogFindings,
    ...reports.flatMap((report) => report.findings),
  ];
  return {
    editions: reports,
    catalogFindings,
    errorCount: all.filter((finding) => finding.severity === "error").length,
    warningCount: all.filter((finding) => finding.severity === "warning")
      .length,
  };
};
