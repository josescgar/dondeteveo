import { readdir, readFile } from "node:fs/promises";
import path from "node:path";

import {
  discoverySourcesFileSchema,
  watchedRaceSchema,
  type DiscoverySource,
  type WatchedRace,
} from "./schemas";

export const WATCHLIST_DIRECTORY = path.join(process.cwd(), "watchlist");
export const WATCHED_RACES_DIRECTORY = path.join(WATCHLIST_DIRECTORY, "races");
export const DISCOVERY_SOURCES_FILE = path.join(
  WATCHLIST_DIRECTORY,
  "discovery-sources.json",
);

const readJson = async (filePath: string): Promise<unknown> =>
  JSON.parse(await readFile(filePath, "utf8"));

/**
 * Loads and validates every watched race. Each race lives in
 * `watchlist/races/<slug>.json`, and the file name must match the slug.
 */
export const loadWatchedRaces = async (
  directory: string = WATCHED_RACES_DIRECTORY,
): Promise<WatchedRace[]> => {
  const fileNames = (await readdir(directory))
    .filter((fileName) => fileName.endsWith(".json"))
    .sort();

  const races: WatchedRace[] = [];
  for (const fileName of fileNames) {
    const filePath = path.join(directory, fileName);
    const result = watchedRaceSchema.safeParse(await readJson(filePath));
    if (!result.success) {
      throw new Error(
        `Invalid watched race ${fileName}: ${result.error.message}`,
      );
    }
    if (`${result.data.slug}.json` !== fileName) {
      throw new Error(
        `Watched race file ${fileName} must be named after its slug "${result.data.slug}"`,
      );
    }
    races.push(result.data);
  }
  return races;
};

export const loadDiscoverySources = async (
  filePath: string = DISCOVERY_SOURCES_FILE,
): Promise<DiscoverySource[]> => {
  const result = discoverySourcesFileSchema.safeParse(await readJson(filePath));
  if (!result.success) {
    throw new Error(`Invalid discovery sources: ${result.error.message}`);
  }
  return result.data.sources;
};
