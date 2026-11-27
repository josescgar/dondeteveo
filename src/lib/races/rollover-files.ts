// File I/O for the edition rollover. Reads the latest edition, never writes to
// it, and creates the next edition folder only if it does not exist yet.
import { constants } from "node:fs";
import {
  copyFile,
  mkdir,
  readdir,
  readFile,
  rm,
  stat,
  writeFile,
} from "node:fs/promises";
import path from "node:path";

import { z } from "zod";

import {
  buildRolloverEdition,
  isValidCalendarDate,
  isValidRaceSlug,
  RolloverError,
  selectLatestEditionYear,
  serializeJson,
} from "./rollover.ts";
import {
  localizationsSchema,
  metaSchema,
  pointsFeatureCollectionSchema,
  routeFeatureCollectionSchema,
  sourceSchema,
} from "./schemas.ts";

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
  dryRun?: boolean;
  now?: Date;
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

const listDirectories = async (directory: string): Promise<string[]> =>
  (await readdir(directory, { withFileTypes: true }))
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name);

const pathExists = async (target: string): Promise<boolean> => {
  try {
    await stat(target);
    return true;
  } catch (error: unknown) {
    if (error instanceof Error && "code" in error && error.code === "ENOENT") {
      return false;
    }
    throw error;
  }
};

const readJsonFile = async (filePath: string): Promise<unknown> => {
  try {
    return JSON.parse(await readFile(filePath, "utf8"));
  } catch (error: unknown) {
    const reason = error instanceof Error ? error.message : String(error);
    throw new RolloverError(`Could not read ${filePath}: ${reason}`);
  }
};

// Validates a file and returns its raw content: Zod output follows schema key
// order, while rolled-over files should keep the previous edition's order.
const parseFile = async <T>(
  filePath: string,
  schema: z.ZodType<T>,
): Promise<T> => {
  const raw = await readJsonFile(filePath);
  const result = schema.safeParse(raw);
  if (!result.success) {
    throw new RolloverError(
      `${filePath} is not a valid edition file:\n${z.prettifyError(result.error)}`,
    );
  }
  return raw as T;
};

const findRaceCountry = async (
  dataDirectory: string,
  raceSlug: string,
): Promise<string> => {
  const matches: string[] = [];
  for (const countryCode of await listDirectories(dataDirectory)) {
    if (await pathExists(path.join(dataDirectory, countryCode, raceSlug))) {
      matches.push(countryCode);
    }
  }

  if (matches.length === 0) {
    throw new RolloverError(
      `Race "${raceSlug}" was not found under ${dataDirectory}.`,
    );
  }
  if (matches.length > 1) {
    throw new RolloverError(
      `Race slug "${raceSlug}" exists in several countries (${matches.join(", ")}); slugs must be globally unique.`,
    );
  }
  return matches[0];
};

export const rolloverEdition = async (
  request: RolloverRequest,
): Promise<RolloverReport> => {
  const { dataDirectory, raceSlug, date, startTime, now } = request;
  const dryRun = request.dryRun ?? false;

  if (!isValidRaceSlug(raceSlug)) {
    throw new RolloverError(
      `Invalid race slug "${raceSlug}". Expected lowercase kebab-case.`,
    );
  }

  const countryCode = await findRaceCountry(dataDirectory, raceSlug);
  const raceDirectory = path.join(dataDirectory, countryCode, raceSlug);
  const previousYear = selectLatestEditionYear(
    await listDirectories(raceDirectory),
  );
  if (!previousYear) {
    throw new RolloverError(`No edition folders found in ${raceDirectory}.`);
  }

  const assertNotExisting = async (editionDirectory: string) => {
    if (await pathExists(editionDirectory)) {
      throw new RolloverError(
        `${editionDirectory} already exists; refusing to overwrite it.`,
      );
    }
  };
  if (isValidCalendarDate(date)) {
    await assertNotExisting(path.join(raceDirectory, date.slice(0, 4)));
  }

  const previousDirectory = path.join(raceDirectory, previousYear);
  const meta = await parseFile(
    path.join(previousDirectory, "meta.json"),
    metaSchema,
  );
  const source = await parseFile(
    path.join(previousDirectory, "source.json"),
    sourceSchema,
  );
  const route = await parseFile(
    path.join(previousDirectory, "route.geojson"),
    routeFeatureCollectionSchema,
  );
  await parseFile(
    path.join(previousDirectory, "points.geojson"),
    pointsFeatureCollectionSchema,
  );
  const localizationsPath = path.join(previousDirectory, LOCALIZATIONS_FILE);
  const localizations = (await pathExists(localizationsPath))
    ? await parseFile(localizationsPath, localizationsSchema)
    : undefined;

  const edition = buildRolloverEdition(
    { year: previousYear, meta, source, route, localizations },
    { date, startTime, now },
  );

  const editionDirectory = path.join(raceDirectory, edition.year);
  await assertNotExisting(editionDirectory);

  const files = [
    "meta.json",
    ...COPIED_EDITION_FILES,
    "source.json",
    ...(edition.localizations ? [LOCALIZATIONS_FILE] : []),
  ];
  const report: RolloverReport = {
    countryCode,
    raceSlug,
    previousYear,
    year: edition.year,
    previousDirectory,
    editionDirectory,
    files,
    warnings: edition.warnings,
    notes: edition.notes,
    dryRun,
  };

  if (dryRun) {
    return report;
  }

  // Non-recursive mkdir fails if the folder appeared since the check above,
  // so an existing edition is never written into.
  await mkdir(editionDirectory);
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
    throw error;
  }

  return report;
};
