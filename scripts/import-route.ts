/**
 * Imports a GPX or KML race route into an edition folder.
 *
 * Usage:
 *   npm run data:import -- <route.gpx|route.kml> <data/<country>/<slug>/<year>> --distance <km> [options]
 *
 * Writes route.geojson and a starter points.geojson (start, splits, finish).
 * Refuses to touch an existing edition folder unless --force is passed, to
 * write outside the data directory, or to write a route whose length is out
 * of the validator's tolerance unless --allow-length-mismatch is passed.
 */
import { existsSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { parseArgs } from "node:util";

import { DEFAULT_VALIDATION_OPTIONS } from "./edition-validation/edition-validation.logic.ts";
import { editionKey, resolveEditionDirectory } from "./lib/edition-path.ts";
import {
  DEFAULT_MAX_JOIN_GAP_KM,
  DEFAULT_SPLIT_INTERVAL_KM,
  ROUTE_SOURCE_TYPES,
  importRoute,
  serializeGeoJson,
} from "./route-import/route-import.logic.ts";

const DEFAULT_DATA_DIRECTORY = "data";

const USAGE = `Usage: npm run data:import -- <route-file> <edition-dir> --distance <km> [options]

Arguments:
  <route-file>             GPX (tracks, or routes when there are no tracks) or KML (LineString, gx:Track) file
  <edition-dir>            Target folder inside the data directory, e.g. data/es/sevilla-marathon/2027

Options:
  --distance <km>          Official race distance in km (required), e.g. 42.195
  --name <text>            Race name for the route feature (default: race slug)
  --split-interval <km>    Distance between regular splits (default ${DEFAULT_SPLIT_INTERVAL_KM})
  --line <n>               Use only the n-th line when the file has several
  --max-join-gap-km <km>   Largest gap allowed when joining segments (default ${DEFAULT_MAX_JOIN_GAP_KM})
  --allow-length-mismatch  Import even if the measured length is more than ${DEFAULT_VALIDATION_OPTIONS.lengthTolerancePercent}% off the official distance
  --data-dir <dir>         Data directory the edition must be inside (default ${DEFAULT_DATA_DIRECTORY})
  --force                  Overwrite route.geojson and points.geojson in an existing folder
  --help                   Show this help`;

const parsePositiveNumber = (
  value: string | undefined,
  option: string,
): number | undefined => {
  if (value === undefined) {
    return undefined;
  }
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw new Error(`${option} must be a positive number, got "${value}".`);
  }
  return parsed;
};

const run = async (): Promise<void> => {
  const { values, positionals } = parseArgs({
    allowPositionals: true,
    options: {
      distance: { type: "string" },
      name: { type: "string" },
      "split-interval": { type: "string" },
      line: { type: "string" },
      "max-join-gap-km": { type: "string" },
      "allow-length-mismatch": { type: "boolean", default: false },
      "data-dir": { type: "string", default: DEFAULT_DATA_DIRECTORY },
      force: { type: "boolean", default: false },
      help: { type: "boolean", default: false },
    },
  });

  if (values.help) {
    console.log(USAGE);
    return;
  }
  const [inputFile, editionArgument] = positionals;
  if (!inputFile || !editionArgument || positionals.length > 2) {
    throw new Error(`Expected a route file and an edition folder.\n\n${USAGE}`);
  }
  const distanceKm = parsePositiveNumber(values.distance, "--distance");
  if (distanceKm === undefined) {
    throw new Error(`--distance is required.\n\n${USAGE}`);
  }

  const { ref: edition, directory } = resolveEditionDirectory(
    values["data-dir"],
    editionArgument,
  );
  if (existsSync(directory) && !values.force) {
    throw new Error(
      `${editionArgument} already exists. Pass --force to overwrite its route.geojson and points.geojson (other files are left alone).`,
    );
  }

  const result = importRoute({
    fileName: path.basename(inputFile),
    content: await readFile(inputFile, "utf8"),
    distanceKm,
    raceSlug: edition.raceSlug,
    year: edition.year,
    raceName: values.name,
    splitIntervalKm: parsePositiveNumber(
      values["split-interval"],
      "--split-interval",
    ),
    lineIndex: parsePositiveNumber(values.line, "--line"),
    maxJoinGapKm: parsePositiveNumber(
      values["max-join-gap-km"],
      "--max-join-gap-km",
    ),
    allowLengthMismatch: values["allow-length-mismatch"],
  });

  await mkdir(directory, { recursive: true });
  await writeFile(
    path.join(directory, "route.geojson"),
    serializeGeoJson(result.route),
  );
  await writeFile(
    path.join(directory, "points.geojson"),
    serializeGeoJson(result.points),
  );

  const coordinateCount = result.route.features[0].geometry.coordinates.length;
  const sign = result.differencePercent >= 0 ? "+" : "";
  const dataDirectoryOption =
    values["data-dir"] === DEFAULT_DATA_DIRECTORY
      ? ""
      : ` --data-dir ${values["data-dir"]}`;
  console.log(
    [
      `Imported ${result.format.toUpperCase()} into ${editionKey(edition)}`,
      `  lines used:      ${result.usedLines.join(", ")}`,
      `  coordinates:     ${result.sourcePointCount} in source, ${coordinateCount} after rounding to 6 decimals`,
      `  measured length: ${result.measuredKm.toFixed(3)} km`,
      `  official length: ${distanceKm} km (${sign}${result.differencePercent.toFixed(2)}%)`,
      `  points:          ${result.points.features.map((feature) => feature.properties.id).join(", ")}`,
      ...result.notes.map((note) => `  note:            ${note}`),
      "",
      "Next steps:",
      `  - add meta.json and source.json (routeSourceType "${ROUTE_SOURCE_TYPES[result.format]}"; note the measured length in notes)`,
      "  - add location suffixes to split labels and any cheer points",
      `  - run npm run data:validate --${dataDirectoryOption} ${editionArgument}`,
    ].join("\n"),
  );
};

run().catch((error: unknown) => {
  console.error(
    `Import failed: ${error instanceof Error ? error.message : String(error)}`,
  );
  process.exitCode = 1;
});
