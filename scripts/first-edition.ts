/**
 * Writes meta.json, source.json and localizations.json for a race's first
 * edition from a file of verified facts, next to the route.geojson and
 * points.geojson that `npm run data:import` created.
 *
 * Usage:
 *   npm run data:first-edition -- <facts.json> <data/<country>/<slug>/<year>> [--data-dir <dir>]
 *
 * Exits non-zero when the facts are incomplete or inconsistent, or when any
 * of the three files already exists.
 */
import path from "node:path";
import { parseArgs } from "node:util";

import { editionKey } from "./lib/edition-path.ts";
import { writeFirstEdition } from "./first-edition/first-edition-files.ts";
import {
  FirstEditionError,
  formatAuthoredTexts,
  formatPercent,
} from "./first-edition/first-edition.logic.ts";

const DEFAULT_DATA_DIRECTORY = "data";

const USAGE = `Usage: npm run data:first-edition -- <facts.json> <edition-dir> [options]

Writes meta.json, source.json and localizations.json (Spanish) for a race's
first edition. Import the route first with npm run data:import; the edition
folder must hold its route.geojson and points.geojson and nothing else.
Summary and hero note get neutral wording that names no places.

The facts file (keep it outside the repository) is JSON with: runDate,
name {en, es}, city {en, es}, distanceKm, date, startTime, startTimeProvisional,
timezone, officialWebsiteUrl, waves [{label {en, es}, startTime}] (optional),
route {sourceType, fileUrl, title, pageUrl, sourceName, edition "this" |
"earlier", earlierYear, sameCourse {url, quote}}, and facts [{fact, value, url,
quotes}] with at least date, startTime and distanceKm (and waves when given).

Arguments:
  <facts.json>       Verified facts, with the quotes they were read from
  <edition-dir>      Folder written by npm run data:import, e.g. data/es/valencia-marathon/2026

Options:
  --data-dir <dir>   Catalog root (default ${DEFAULT_DATA_DIRECTORY}).
  -h, --help         Show this help.`;

const main = async (): Promise<number> => {
  const { values, positionals } = parseArgs({
    allowPositionals: true,
    options: {
      "data-dir": { type: "string", default: DEFAULT_DATA_DIRECTORY },
      help: { type: "boolean", short: "h", default: false },
    },
  });

  if (values.help) {
    console.log(USAGE);
    return 0;
  }
  const [factsFile, editionDirectory, ...extra] = positionals;
  if (!factsFile || !editionDirectory || extra.length > 0) {
    console.error(USAGE);
    return 1;
  }

  const report = await writeFirstEdition({
    factsFile,
    editionDirectory,
    dataDirectory: values["data-dir"],
  });
  const relative = path.relative(process.cwd(), report.directory);
  console.log(`Wrote the first edition ${editionKey(report.edition)}:`);
  for (const file of report.files) console.log(`  ${relative}/${file}`);
  console.log(
    `Measured route length ${report.measuredKm.toFixed(3)} km (${formatPercent(report.differencePercent)}).`,
  );
  console.log(
    `Provisional: route ${report.provisional.route}, startTime ${report.provisional.startTime}.`,
  );
  console.log("\nAuthored texts (list them in the PR body for review):");
  console.log(formatAuthoredTexts(report.authoredTexts));
  console.log("\nNext steps:");
  console.log(`  - Validate it: npm run data:validate -- ${relative}`);
  console.log(
    `  - Switch watchlist/races/${report.edition.raceSlug}.json to in-catalog and fill trackSource and nextEdition.`,
  );
  return 0;
};

const isExpectedError = (error: unknown): error is Error => {
  if (error instanceof FirstEditionError) return true;
  if (!(error instanceof Error) || !("code" in error)) return false;
  const code = String(error.code);
  // Bad arguments, or file system errors such as EACCES and ENOENT.
  return code.startsWith("ERR_PARSE_ARGS") || /^E[A-Z]+$/.test(code);
};

try {
  process.exitCode = await main();
} catch (error: unknown) {
  if (!isExpectedError(error)) throw error;
  console.error(`Error: ${error.message}`);
  if (String((error as { code?: unknown }).code).startsWith("ERR_PARSE_ARGS")) {
    console.error(`\n${USAGE}`);
  }
  process.exitCode = 1;
}
