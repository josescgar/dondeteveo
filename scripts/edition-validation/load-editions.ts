import { readdir, readFile } from "node:fs/promises";
import path from "node:path";

import type { EditionRef } from "../lib/edition-path.ts";
import {
  OPTIONAL_EDITION_FILES,
  REQUIRED_EDITION_FILES,
  type CatalogListing,
  type RawEdition,
} from "./edition-validation.logic.ts";

const listDirectories = async (directory: string): Promise<string[]> => {
  const entries = await readdir(directory, { withFileTypes: true });
  return entries
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort();
};

/**
 * Everything the site's catalog loader would read: every top-level folder and
 * every `<top>/<slug>/<year>` folder under the data directory, whatever their
 * names. The `folder-names` check reports the ones that break conventions.
 */
export const discoverCatalog = async (
  dataDirectory: string,
): Promise<CatalogListing> => {
  const editions: EditionRef[] = [];
  const topLevelFolders = await listDirectories(dataDirectory);
  for (const countryCode of topLevelFolders) {
    const countryDirectory = path.join(dataDirectory, countryCode);
    for (const raceSlug of await listDirectories(countryDirectory)) {
      for (const year of await listDirectories(
        path.join(countryDirectory, raceSlug),
      )) {
        editions.push({ countryCode, raceSlug, year });
      }
    }
  }
  return { editions, topLevelFolders };
};

const readIfPresent = async (filePath: string): Promise<string | undefined> => {
  try {
    return await readFile(filePath, "utf8");
  } catch (error: unknown) {
    if (error instanceof Error && "code" in error && error.code === "ENOENT") {
      return undefined;
    }
    throw error;
  }
};

export const editionDirectory = (dataDirectory: string, ref: EditionRef) =>
  path.join(dataDirectory, ref.countryCode, ref.raceSlug, ref.year);

export const readEdition = async (
  dataDirectory: string,
  ref: EditionRef,
): Promise<RawEdition> => {
  const directory = editionDirectory(dataDirectory, ref);
  const files: RawEdition["files"] = {};
  for (const fileName of [
    ...REQUIRED_EDITION_FILES,
    ...OPTIONAL_EDITION_FILES,
  ]) {
    const content = await readIfPresent(path.join(directory, fileName));
    if (content !== undefined) {
      files[fileName] = content;
    }
  }
  return { ref, files };
};
