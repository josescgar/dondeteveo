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
  segmentLengths,
  type Position,
} from "../lib/geo.ts";
import { editionKey, type EditionRef } from "../lib/edition-path.ts";

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
  edition: EditionRef;
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
};

export const DEFAULT_VALIDATION_OPTIONS: ValidationOptions = {
  lengthTolerancePercent: 3,
  maxJumpKm: 2,
  maxPointOffsetKm: 0.05,
};

/** A check that looks at one fully parsed edition. */
export type EditionCheck = {
  id: string;
  description: string;
  run: (edition: ParsedEdition, options: ValidationOptions) => Issue[];
};

/** A check that looks across every edition in the catalog. */
export type CatalogCheck = {
  id: string;
  description: string;
  run: (catalog: EditionRef[], options: ValidationOptions) => Finding[];
};

/**
 * A finding that is known and accepted for now. Matching errors are reported
 * as warnings instead of failing validation, so the problem stays visible.
 */
export type KnownIssue = {
  /** Edition key, e.g. `es/media-maraton-malaga/2026`. */
  edition: string;
  checkId: string;
  reason: string;
};

export type EditionReport = {
  ref: EditionRef;
  findings: Finding[];
};

export type ValidationReport = {
  editions: EditionReport[];
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
];

// ---------------------------------------------------------------------------
// Catalog checks
// ---------------------------------------------------------------------------

export const CATALOG_CHECKS: readonly CatalogCheck[] = [
  {
    id: CHECK_IDS.slugUnique,
    description: "race slugs are globally unique across countries",
    run: (catalog) => {
      const countriesBySlug = new Map<string, Set<string>>();
      for (const ref of catalog) {
        const countries =
          countriesBySlug.get(ref.raceSlug) ?? new Set<string>();
        countries.add(ref.countryCode);
        countriesBySlug.set(ref.raceSlug, countries);
      }
      return catalog
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

export const validateEdition = (
  raw: RawEdition,
  options: ValidationOptions = DEFAULT_VALIDATION_OPTIONS,
  checks: readonly EditionCheck[] = EDITION_CHECKS,
): Finding[] => {
  const { edition, issues } = parseEdition(raw);
  const findings: Finding[] = issues.map((issue) => ({
    ...issue,
    edition: raw.ref,
  }));
  if (!edition) {
    return findings;
  }
  for (const check of checks) {
    for (const issue of check.run(edition, options)) {
      findings.push({ ...issue, checkId: check.id, edition: raw.ref });
    }
  }
  return findings;
};

/**
 * Downgrades errors covered by a known issue to warnings, and warns about
 * known issues that no longer reproduce so the list does not go stale.
 */
export const applyKnownIssues = (
  ref: EditionRef,
  findings: Finding[],
  knownIssues: readonly KnownIssue[],
): Finding[] => {
  const key = editionKey(ref);
  const relevant = knownIssues.filter((known) => known.edition === key);
  const adjusted = findings.map((finding) => {
    const known = relevant.find((item) => item.checkId === finding.checkId);
    return known && finding.severity === "error"
      ? {
          ...finding,
          severity: "warning" as const,
          message: `${finding.message} [known issue: ${known.reason}]`,
        }
      : finding;
  });
  const stale = relevant
    .filter(
      (known) => !findings.some((finding) => finding.checkId === known.checkId),
    )
    .map((known) => ({
      checkId: CHECK_IDS.knownIssues,
      edition: ref,
      ...warning(
        `Known issue for check "${known.checkId}" no longer reproduces; remove it from the known-issues list.`,
      ),
    }));
  return [...adjusted, ...stale];
};

export type ValidateCatalogInput = {
  /** Editions to validate in full. */
  editions: RawEdition[];
  /** Every edition in the catalog, for cross-edition checks. */
  catalog: EditionRef[];
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
  const catalogFindings = catalogChecks.flatMap((check) =>
    check.run(catalog, options),
  );
  const reports = editions.map((raw) => {
    const key = editionKey(raw.ref);
    const findings = [
      ...validateEdition(raw, options, editionChecks),
      ...catalogFindings.filter(
        (finding) => editionKey(finding.edition) === key,
      ),
    ];
    return {
      ref: raw.ref,
      findings: applyKnownIssues(raw.ref, findings, knownIssues),
    };
  });
  const all = reports.flatMap((report) => report.findings);
  return {
    editions: reports,
    errorCount: all.filter((finding) => finding.severity === "error").length,
    warningCount: all.filter((finding) => finding.severity === "warning")
      .length,
  };
};
