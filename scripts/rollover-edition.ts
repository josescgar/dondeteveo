// Creates the next edition of a race from its latest edition, with the route
// and (by default) the start time marked provisional.
//
//   npm run data:rollover -- <race-slug> <YYYY-MM-DD> [--start-time HH:MM] [--dry-run] [--data-dir data]
import path from "node:path";
import { parseArgs } from "node:util";

import { rolloverEdition } from "../src/lib/races/rollover-files.ts";
import { RolloverError } from "../src/lib/races/rollover.ts";

const USAGE = `Usage: npm run data:rollover -- <race-slug> <YYYY-MM-DD> [options]

Creates data/<country>/<race-slug>/<year>/ from the latest edition of the race.
Route and points are copied unchanged and marked provisional; waves are dropped.

Options:
  --start-time HH:MM  Confirmed start time. Omit to keep the previous start
                      time and mark it provisional.
  --dry-run           Show what would be created without writing anything.
  --data-dir PATH     Catalog root (default: data).
  -h, --help          Show this help.`;

const main = async (): Promise<number> => {
  const { values, positionals } = parseArgs({
    allowPositionals: true,
    options: {
      "start-time": { type: "string" },
      "dry-run": { type: "boolean", default: false },
      "data-dir": { type: "string", default: "data" },
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
    dataDirectory: path.resolve(values["data-dir"]),
    raceSlug,
    date,
    startTime: values["start-time"],
    dryRun: values["dry-run"],
    now: new Date(),
  });

  const relative = (target: string) => path.relative(process.cwd(), target);
  console.log(
    `${report.dryRun ? "[dry run] Would roll over" : "Rolled over"} ${report.raceSlug} ${report.previousYear} -> ${report.year}`,
  );
  console.log(
    `${report.dryRun ? "Would create" : "Created"} ${relative(report.editionDirectory)}/ from ${relative(report.previousDirectory)}/ (unchanged):`,
  );
  for (const file of report.files) console.log(`  ${file}`);
  for (const note of report.notes) console.log(`- ${note}`);

  if (report.warnings.length > 0) {
    console.log(`\nReview before committing (${report.warnings.length}):`);
    for (const warning of report.warnings) console.log(`  WARNING ${warning}`);
  } else {
    console.log("\nNo carried-over text mentions a year or the previous date.");
  }

  return 0;
};

try {
  process.exitCode = await main();
} catch (error: unknown) {
  const isArgumentError =
    error instanceof Error &&
    "code" in error &&
    String(error.code).startsWith("ERR_PARSE_ARGS");
  if (error instanceof RolloverError || isArgumentError) {
    console.error(`Error: ${(error as Error).message}`);
    if (isArgumentError) console.error(`\n${USAGE}`);
    process.exitCode = 1;
  } else {
    throw error;
  }
}
