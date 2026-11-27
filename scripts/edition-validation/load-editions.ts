import { readdir, readFile } from "node:fs/promises";
import path from "node:path";

import { COUNTRY_CODE_PATTERN, type EditionRef } from "../lib/edition-path.ts";
import {
  OPTIONAL_EDITION_FILES,
  REQUIRED_EDITION_FILES,
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
 * Every `<country>/<slug>/<year>` folder under the data directory. Only
 * two-letter lowercase country folders are editions; other top-level folders
 * under `data/` (registries and similar) are not part of the catalog.
 */
export const discoverEditions = async (
  dataDirectory: string,
): Promise<EditionRef[]> => {
  const refs: EditionRef[] = [];
  const countries = (await listDirectories(dataDirectory)).filter((name) =>
    COUNTRY_CODE_PATTERN.test(name),
  );
  for (const countryCode of countries) {
    const countryDirectory = path.join(dataDirectory, countryCode);
    for (const raceSlug of await listDirectories(countryDirectory)) {
      for (const year of await listDirectories(
        path.join(countryDirectory, raceSlug),
      )) {
        refs.push({ countryCode, raceSlug, year });
      }
    }
  }
  return refs;
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
