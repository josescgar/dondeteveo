/**
 * Creates the next edition of a race from its latest edition, with the route
 * and (by default) the start time marked provisional.
 *
 * Usage:
 *   npm run data:rollover -- <race-slug> <YYYY-MM-DD> [options]
 *
 * Exits non-zero when the rollover is refused or fails.
 */
import path from "node:path";
import { parseArgs } from "node:util";

import { rolloverEdition } from "./rollover/rollover-files.ts";
import { RolloverError } from "./rollover/rollover.logic.ts";

const DEFAULT_DATA_DIRECTORY = "data";
const WATCHLIST_DIRECTORY = "watchlist/races";

const USAGE = `Usage: npm run data:rollover -- <race-slug> <YYYY-MM-DD> [options]

Creates data/<country>/<race-slug>/<year>/ from the latest edition of the race.
Route and points are copied unchanged and marked provisional; waves are dropped.

Options:
  --start-time HH:MM         Start time announced for the new edition; marked
                             confirmed. Omit to keep the previous start time,
                             marked provisional.
  --start-time-provisional   With --start-time: write that time but keep it
                             marked provisional (e.g. announced as tentative).
  --dry-run                  Show what would be created without writing.
  --data-dir <dir>           Catalog root (default ${DEFAULT_DATA_DIRECTORY}).
  -h, --help                 Show this help.`;

const main = async (): Promise<number> => {
  const { values, positionals } = parseArgs({
    allowPositionals: true,
    options: {
      "start-time": { type: "string" },
      "start-time-provisional": { type: "boolean", default: false },
      "dry-run": { type: "boolean", default: false },
      "data-dir": { type: "string", default: DEFAULT_DATA_DIRECTORY },
      help: { type: "boolean", short: "h", default: false },
    },
  });

  if (values.help) {
    console.log(USAGE);
    return 0;
  }

  const [raceSlug, date, ...extra] = positionals;
  if (!raceSlug || !date || extra.length > 0) {
    console.error(USAGE);
    return 1;
  }

  const report = await rolloverEdition({
    dataDirectory: values["data-dir"],
    raceSlug,
    date,
    startTime: values["start-time"],
    startTimeProvisional: values["start-time-provisional"],
    dryRun: values["dry-run"],
    now: new Date(),
  });

  const relative = (target: string) => path.relative(process.cwd(), target);
  const newDirectory = relative(report.editionDirectory);
  console.log(
    `${report.dryRun ? "[dry run] Would roll over" : "Rolled over"} ${report.raceSlug} ${report.previousYear} -> ${report.year}`,
  );
  console.log(
    `${report.dryRun ? "Would create" : "Created"} ${newDirectory}/ from ${relative(report.previousDirectory)}/ (unchanged):`,
  );
  for (const file of report.files) console.log(`  ${file}`);
  for (const note of report.notes) console.log(`- ${note}`);

  if (report.warnings.length > 0) {
    console.log(`\nReview before committing (${report.warnings.length}):`);
    for (const warning of report.warnings) console.log(`  WARNING ${warning}`);
  } else {
    console.log("\nNo carried-over text mentions a year or the previous date.");
  }

  console.log("\nNext steps:");
  console.log(`  - Validate it: npm run data:validate -- ${newDirectory}`);
  console.log(
    `  - Update the watchlist entry ${WATCHLIST_DIRECTORY}/${report.raceSlug}.json with the facts used for this edition.`,
  );

  return 0;
};

const isExpectedError = (error: unknown): error is Error => {
  if (error instanceof RolloverError) return true;
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
