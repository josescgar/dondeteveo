// File I/O for the edition rollover. Reads the latest edition, never writes to
// it, and creates the next edition folder only if it does not exist yet.
import { constants } from "node:fs";
import { copyFile, mkdir, rm, stat, writeFile } from "node:fs/promises";
import path from "node:path";

import {
  parseEdition,
  type KnownIssue,
} from "../edition-validation/edition-validation.logic.ts";
import { KNOWN_ISSUES } from "../edition-validation/known-issues.ts";
import {
  discoverCatalog,
  editionDirectory as resolveEditionDirectory,
  readEdition,
} from "../edition-validation/load-editions.ts";
import { editionKey, type EditionRef } from "../lib/edition-path.ts";
import {
  buildRolloverEdition,
  isValidCalendarDate,
  isValidRaceSlug,
  RolloverError,
  selectLatestEditionYear,
  serializeJson,
  type RolloverPreviousEdition,
} from "./rollover.logic.ts";

export const COPIED_EDITION_FILES = [
  "route.geojson",
  "points.geojson",
] as const;
const LOCALIZATIONS_FILE = "localizations.json";

export type RolloverRequest = {
  /** Catalog root with `<country>/<race>/<year>/` folders. */
  dataDirectory: string;
  raceSlug: string;
  date: string;
  startTime?: string;
  startTimeProvisional?: boolean;
  dryRun?: boolean;
  now?: Date;
  /** Accepted validator exceptions; defaults to `known-issues.ts`. */
  knownIssues?: readonly KnownIssue[];
};

export type RolloverReport = {
  countryCode: string;
  raceSlug: string;
  previousYear: string;
  year: string;
  previousDirectory: string;
  editionDirectory: string;
  files: string[];
  warnings: string[];
  notes: string[];
  dryRun: boolean;
};

const errorCode = (error: unknown): string | undefined =>
  error instanceof Error && "code" in error && typeof error.code === "string"
    ? error.code
    : undefined;

const pathExists = async (target: string): Promise<boolean> => {
  try {
    await stat(target);
    return true;
  } catch (error: unknown) {
    if (errorCode(error) === "ENOENT") {
      return false;
    }
    throw error;
  }
};

const assertDataDirectory = async (dataDirectory: string) => {
  let isDirectory = false;
  try {
    isDirectory = (await stat(dataDirectory)).isDirectory();
  } catch (error: unknown) {
    if (errorCode(error) !== "ENOENT") throw error;
  }
  if (!isDirectory) {
    throw new RolloverError(
      `Data directory ${dataDirectory} does not exist or is not a directory.`,
    );
  }
};

const assertNotExisting = async (directory: string) => {
  if (await pathExists(directory)) {
    throw new RolloverError(
      `${directory} already exists; refusing to overwrite it.`,
    );
  }
};

/** Finds the race's editions and requires them to sit in a single country. */
const findRaceEditions = async (
  dataDirectory: string,
  raceSlug: string,
): Promise<EditionRef[]> => {
  const { editions } = await discoverCatalog(dataDirectory);
  const raceEditions = editions.filter((ref) => ref.raceSlug === raceSlug);
  const countries = [...new Set(raceEditions.map((ref) => ref.countryCode))];

  if (countries.length === 0) {
    throw new RolloverError(
      `No editions of race "${raceSlug}" were found under ${dataDirectory}.`,
    );
  }
  if (countries.length > 1) {
    throw new RolloverError(
      `Race slug "${raceSlug}" exists in several countries (${countries.join(", ")}); slugs must be globally unique.`,
    );
  }
  return raceEditions;
};

/**
 * Reads the previous edition with the validator's loader, rejects it if any
 * file is missing or fails its schema, and returns the raw JSON: Zod output
 * follows schema key order, while rolled-over files should keep the previous
 * edition's order.
 */
const loadPreviousEdition = async (
  dataDirectory: string,
  ref: EditionRef,
): Promise<RolloverPreviousEdition> => {
  const raw = await readEdition(dataDirectory, ref);
  const { edition, issues } = parseEdition(raw);
  if (!edition) {
    throw new RolloverError(
      `The latest edition ${resolveEditionDirectory(dataDirectory, ref)} is not valid:\n${issues
        .map((issue) => `- ${issue.message}`)
        .join("\n")}`,
    );
  }

  const json = (name: keyof typeof raw.files) => {
    const content = raw.files[name];
    return content === undefined ? undefined : JSON.parse(content);
  };
  return {
    year: ref.year,
    meta: json("meta.json"),
    source: json("source.json"),
    route: edition.route,
    localizations: json(LOCALIZATIONS_FILE),
  };
};

const writeEditionFiles = async (
  editionDirectory: string,
  previousDirectory: string,
  edition: ReturnType<typeof buildRolloverEdition>,
) => {
  // Non-recursive mkdir fails if the folder appeared since the earlier check,
  // so an existing edition is never written into.
  try {
    await mkdir(editionDirectory);
  } catch (error: unknown) {
    if (errorCode(error) === "EEXIST") {
      throw new RolloverError(
        `${editionDirectory} already exists; refusing to overwrite it.`,
      );
    }
    throw new RolloverError(
      `Could not create ${editionDirectory}: ${(error as Error).message}`,
    );
  }

  try {
    // Exclusive flags: never replace a file, even inside the new folder.
    const writeNew = (name: string, value: unknown) =>
      writeFile(path.join(editionDirectory, name), serializeJson(value), {
        flag: "wx",
      });

    await writeNew("meta.json", edition.meta);
    for (const name of COPIED_EDITION_FILES) {
      await copyFile(
        path.join(previousDirectory, name),
        path.join(editionDirectory, name),
        constants.COPYFILE_EXCL,
      );
    }
    await writeNew("source.json", edition.source);
    if (edition.localizations) {
      await writeNew(LOCALIZATIONS_FILE, edition.localizations);
    }
  } catch (error: unknown) {
    await rm(editionDirectory, { recursive: true, force: true });
    throw new RolloverError(
      `Could not write the new edition to ${editionDirectory} (removed the partial folder): ${(error as Error).message}`,
    );
  }
};

export const rolloverEdition = async (
  request: RolloverRequest,
): Promise<RolloverReport> => {
  const { raceSlug, date, startTime, startTimeProvisional, now } = request;
  const dataDirectory = path.resolve(request.dataDirectory);
  const dryRun = request.dryRun ?? false;

  if (!isValidRaceSlug(raceSlug)) {
    throw new RolloverError(
      `Invalid race slug "${raceSlug}". Expected lowercase kebab-case.`,
    );
  }
  await assertDataDirectory(dataDirectory);

  const raceEditions = await findRaceEditions(dataDirectory, raceSlug);
  const { countryCode } = raceEditions[0];
  const raceDirectory = path.join(dataDirectory, countryCode, raceSlug);
  const previousYear = selectLatestEditionYear(
    raceEditions.map((ref) => ref.year),
  );
  if (!previousYear) {
    throw new RolloverError(
      `No four-digit edition folders found in ${raceDirectory}.`,
    );
  }
  if (isValidCalendarDate(date)) {
    await assertNotExisting(path.join(raceDirectory, date.slice(0, 4)));
  }

  const previousRef = { countryCode, raceSlug, year: previousYear };
  const previousDirectory = resolveEditionDirectory(dataDirectory, previousRef);
  const edition = buildRolloverEdition(
    await loadPreviousEdition(dataDirectory, previousRef),
    { date, startTime, startTimeProvisional, now },
  );

  const editionDirectory = path.join(raceDirectory, edition.year);
  await assertNotExisting(editionDirectory);

  // Exceptions are keyed by edition, so the copied route will fail the same
  // check in the new edition. Flag it; never add exceptions automatically.
  const previousKey = editionKey(previousRef);
  for (const known of request.knownIssues ?? KNOWN_ISSUES) {
    if (known.edition === previousKey) {
      edition.warnings.push(
        `${previousKey} passes "${known.checkId}" only through an accepted exception in scripts/edition-validation/known-issues.ts (${known.reason}); the copied route will fail that check for ${edition.year} until the data is fixed or an exception is approved.`,
      );
    }
  }

  const report: RolloverReport = {
    countryCode,
    raceSlug,
    previousYear,
    year: edition.year,
    previousDirectory,
    editionDirectory,
    files: [
      "meta.json",
      ...COPIED_EDITION_FILES,
      "source.json",
      ...(edition.localizations ? [LOCALIZATIONS_FILE] : []),
    ],
    warnings: edition.warnings,
    notes: edition.notes,
    dryRun,
  };

  if (!dryRun) {
    await writeEditionFiles(editionDirectory, previousDirectory, edition);
  }
  return report;
};
