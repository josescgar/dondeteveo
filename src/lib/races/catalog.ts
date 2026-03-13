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
import { getTodayInTimeZone } from "../format";

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
  countryCode: string,
  raceSlug: string,
  year: string,
): Promise<RaceEdition> => {
  const editionDirectory = path.join(
    DATA_DIRECTORY,
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
  const countryCodes = await getDirectories(DATA_DIRECTORY);
  const editions: RaceEdition[] = [];

  for (const countryCode of countryCodes) {
    const races = await getDirectories(path.join(DATA_DIRECTORY, countryCode));
    for (const raceSlug of races) {
      const years = await getDirectories(
        path.join(DATA_DIRECTORY, countryCode, raceSlug),
      );
      for (const year of years) {
        editions.push(await loadRaceEdition(countryCode, raceSlug, year));
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
    upcoming: edition.meta.date >= getTodayInTimeZone(edition.meta.timezone),
    localizations: edition.localizations,
  }));
};

export const getDistinctRaces = async (): Promise<string[]> => {
  const editions = await getAllRaceEditions();
  return [...new Set(editions.map((edition) => edition.raceSlug))].sort();
};

export const getMostRelevantEdition = async (
  raceSlug: string,
): Promise<RaceEdition | undefined> => {
  const editions = (await getAllRaceEditions()).filter(
    (edition) => edition.raceSlug === raceSlug,
  );
  const upcomingEdition = editions.find(
    (edition) => edition.meta.date >= getTodayInTimeZone(edition.meta.timezone),
  );

  if (upcomingEdition) {
    return upcomingEdition;
  }

  return editions.sort((left, right) =>
    right.meta.date.localeCompare(left.meta.date),
  )[0];
};
