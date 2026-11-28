import { readdir, readFile } from "node:fs/promises";
import path from "node:path";

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
} from "./schemas";
import { getMostRelevantEditionOf, isUpcomingEdition } from "./editions";

export type RaceEdition = {
  countryCode: string;
  raceSlug: string;
  year: string;
  meta: RaceMeta;
  source: RaceSource;
  route: RaceRouteCollection;
  points: RacePointsCollection;
  localizations?: RaceLocalizations;
};

export type RaceSummary = {
  countryCode: string;
  raceSlug: string;
  year: string;
  meta: RaceMeta;
  upcoming: boolean;
  localizations?: RaceLocalizations;
};

const DATA_DIRECTORY = path.join(process.cwd(), "data");

// Test-only: an extra data root (same `<country>/<race>/<year>/` layout) merged
// into the catalog. Playwright sets it for its dev server so e2e tests can
// cover edition states, such as provisional editions, that the real catalog
// may not contain. Honoured only in dev mode (`astro dev`, Vitest): a
// production `astro build` ignores it even when the variable is set, and so
// does plain Node (e.g. the Playwright runner), where `import.meta.env` is
// undefined.
export const FIXTURE_DATA_DIRECTORY_ENV = "RACE_DATA_FIXTURES_DIR";

const getDataDirectories = (): string[] => {
  const fixtureDirectory = import.meta.env?.DEV
    ? process.env[FIXTURE_DATA_DIRECTORY_ENV]
    : undefined;
  return fixtureDirectory
    ? [DATA_DIRECTORY, path.resolve(fixtureDirectory)]
    : [DATA_DIRECTORY];
};

const readJson = async <T>(filePath: string): Promise<T> =>
  JSON.parse(await readFile(filePath, "utf8")) as T;

const readOptionalJson = async <T>(
  filePath: string,
): Promise<T | undefined> => {
  try {
    return JSON.parse(await readFile(filePath, "utf8")) as T;
  } catch (error: unknown) {
    if (error instanceof Error && "code" in error && error.code === "ENOENT") {
      return undefined;
    }
    throw error;
  }
};

const getDirectories = async (directory: string): Promise<string[]> => {
  const entries = await readdir(directory, { withFileTypes: true });
  return entries
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name);
};

const loadRaceEdition = async (
  dataDirectory: string,
  countryCode: string,
  raceSlug: string,
  year: string,
): Promise<RaceEdition> => {
  const editionDirectory = path.join(
    dataDirectory,
    countryCode,
    raceSlug,
    year,
  );
  const meta = metaSchema.parse(
    await readJson(path.join(editionDirectory, "meta.json")),
  );
  const source = sourceSchema.parse(
    await readJson(path.join(editionDirectory, "source.json")),
  );
  const route = routeFeatureCollectionSchema.parse(
    await readJson(path.join(editionDirectory, "route.geojson")),
  );
  const points = pointsFeatureCollectionSchema.parse(
    await readJson(path.join(editionDirectory, "points.geojson")),
  );

  const rawLocalizations = await readOptionalJson(
    path.join(editionDirectory, "localizations.json"),
  );
  const localizations = rawLocalizations
    ? localizationsSchema.parse(rawLocalizations)
    : undefined;

  return {
    countryCode,
    raceSlug,
    year,
    meta,
    source,
    route,
    points,
    localizations,
  };
};

export const getAllRaceEditions = async (): Promise<RaceEdition[]> => {
  const editions: RaceEdition[] = [];

  for (const dataDirectory of getDataDirectories()) {
    const countryCodes = await getDirectories(dataDirectory);
    for (const countryCode of countryCodes) {
      const races = await getDirectories(path.join(dataDirectory, countryCode));
      for (const raceSlug of races) {
        const years = await getDirectories(
          path.join(dataDirectory, countryCode, raceSlug),
        );
        for (const year of years) {
          editions.push(
            await loadRaceEdition(dataDirectory, countryCode, raceSlug, year),
          );
        }
      }
    }
  }

  return editions.sort((left, right) =>
    left.meta.date === right.meta.date
      ? left.raceSlug.localeCompare(right.raceSlug)
      : left.meta.date.localeCompare(right.meta.date),
  );
};

export const getRaceEdition = async (
  raceSlug: string,
  year: string,
): Promise<RaceEdition | undefined> => {
  const editions = await getAllRaceEditions();
  return editions.find(
    (edition) => edition.raceSlug === raceSlug && edition.year === year,
  );
};

export const getRaceSummaries = async (): Promise<RaceSummary[]> => {
  const editions = await getAllRaceEditions();
  return editions.map((edition) => ({
    countryCode: edition.countryCode,
    raceSlug: edition.raceSlug,
    year: edition.year,
    meta: edition.meta,
    upcoming: isUpcomingEdition(edition),
    localizations: edition.localizations,
  }));
};

export const getDistinctRaces = async (): Promise<string[]> => {
  const editions = await getAllRaceEditions();
  return [...new Set(editions.map((edition) => edition.raceSlug))].sort();
};

export const getMostRelevantEdition = async (
  raceSlug: string,
): Promise<RaceEdition | undefined> =>
  getMostRelevantEditionOf(await getAllRaceEditions(), raceSlug);
