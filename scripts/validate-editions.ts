/**
 * Validates race edition folders.
 *
 * Usage:
 *   npm run data:validate                                  # whole catalog
 *   npm run data:validate -- data/es/sevilla-marathon/2027  # one or more editions
 *
 * Exits non-zero when any check reports an error.
 */
import path from "node:path";
import { parseArgs } from "node:util";

import { editionKey, parseEditionPath } from "./lib/edition-path.ts";
import {
  CATALOG_CHECKS,
  DEFAULT_VALIDATION_OPTIONS,
  EDITION_CHECKS,
  validateCatalog,
  type ValidationOptions,
} from "./edition-validation/edition-validation.logic.ts";
import { KNOWN_ISSUES } from "./edition-validation/known-issues.ts";
import {
  discoverEditions,
  readEdition,
} from "./edition-validation/load-editions.ts";

const DEFAULT_DATA_DIRECTORY = "data";
const METRES_PER_KM = 1000;
/** Edition folders sit three levels below the data directory. */
const EDITION_DEPTH = ["..", "..", ".."] as const;

const USAGE = `Usage: npm run data:validate -- [edition-dir ...] [options]

Without edition folders, validates every edition under the data directory.

Options:
  --data-dir <dir>            Catalog root (default ${DEFAULT_DATA_DIRECTORY})
  --length-tolerance <pct>    Allowed route length difference from distanceKm (default ${DEFAULT_VALIDATION_OPTIONS.lengthTolerancePercent})
  --max-jump-km <km>          Largest gap between consecutive route coordinates (default ${DEFAULT_VALIDATION_OPTIONS.maxJumpKm})
  --max-point-offset-m <m>    Largest distance from a point to the route (default ${DEFAULT_VALIDATION_OPTIONS.maxPointOffsetKm * METRES_PER_KM})
  --list-checks               Print the checks and exit
  --help                      Show this help`;

const parsePositiveNumber = (
  value: string | undefined,
  option: string,
  fallback: number,
): number => {
  if (value === undefined) {
    return fallback;
  }
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw new Error(`${option} must be a positive number, got "${value}".`);
  }
  return parsed;
};

const run = async (): Promise<number> => {
  const { values, positionals } = parseArgs({
    allowPositionals: true,
    options: {
      "data-dir": { type: "string", default: DEFAULT_DATA_DIRECTORY },
      "length-tolerance": { type: "string" },
      "max-jump-km": { type: "string" },
      "max-point-offset-m": { type: "string" },
      "list-checks": { type: "boolean", default: false },
      help: { type: "boolean", default: false },
    },
  });

  if (values.help) {
    console.log(USAGE);
    return 0;
  }
  if (values["list-checks"]) {
    for (const check of [...EDITION_CHECKS, ...CATALOG_CHECKS]) {
      console.log(`${check.id.padEnd(22)} ${check.description}`);
    }
    return 0;
  }

  const options: ValidationOptions = {
    lengthTolerancePercent: parsePositiveNumber(
      values["length-tolerance"],
      "--length-tolerance",
      DEFAULT_VALIDATION_OPTIONS.lengthTolerancePercent,
    ),
    maxJumpKm: parsePositiveNumber(
      values["max-jump-km"],
      "--max-jump-km",
      DEFAULT_VALIDATION_OPTIONS.maxJumpKm,
    ),
    maxPointOffsetKm:
      parsePositiveNumber(
        values["max-point-offset-m"],
        "--max-point-offset-m",
        DEFAULT_VALIDATION_OPTIONS.maxPointOffsetKm * METRES_PER_KM,
      ) / METRES_PER_KM,
  };

  const dataDirectory = values["data-dir"];
  const catalog = await discoverEditions(dataDirectory);
  const targets =
    positionals.length > 0
      ? positionals.map((directory) => ({
          ref: parseEditionPath(directory),
          dataDirectory: path.resolve(directory, ...EDITION_DEPTH),
        }))
      : catalog.map((ref) => ({ ref, dataDirectory }));

  const catalogKeys = new Set(catalog.map(editionKey));
  const fullCatalog = [
    ...catalog,
    ...targets
      .map((target) => target.ref)
      .filter((ref) => !catalogKeys.has(editionKey(ref))),
  ];

  const report = validateCatalog({
    editions: await Promise.all(
      targets.map((target) => readEdition(target.dataDirectory, target.ref)),
    ),
    catalog: fullCatalog,
    options,
    knownIssues: KNOWN_ISSUES,
  });

  for (const edition of report.editions) {
    const hasError = edition.findings.some(
      (finding) => finding.severity === "error",
    );
    console.log(`${hasError ? "FAIL" : "ok  "} ${editionKey(edition.ref)}`);
    for (const finding of edition.findings) {
      console.log(
        `     ${finding.severity} [${finding.checkId}] ${finding.message.replaceAll("\n", "\n       ")}`,
      );
    }
  }
  console.log(
    `\nValidated ${report.editions.length} edition(s): ${report.errorCount} error(s), ${report.warningCount} warning(s).`,
  );
  return report.errorCount > 0 ? 1 : 0;
};

run()
  .then((exitCode) => {
    process.exitCode = exitCode;
  })
  .catch((error: unknown) => {
    console.error(
      `Validation failed to run: ${error instanceof Error ? error.message : String(error)}`,
    );
    process.exitCode = 1;
  });
