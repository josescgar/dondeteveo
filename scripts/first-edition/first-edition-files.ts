// File I/O for writing a race's first edition metadata. Reads the facts file
// and the route and points written by `npm run data:import`, and creates
// meta.json, source.json and localizations.json without replacing any file.
import { readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";

import type { z } from "zod";

import {
  pointsFeatureCollectionSchema,
  routeFeatureCollectionSchema,
} from "../../src/lib/races/schemas.ts";
import { discoverCatalog } from "../edition-validation/load-editions.ts";
import {
  editionKey,
  resolveEditionDirectory,
  type EditionRef,
} from "../lib/edition-path.ts";
import {
  buildFirstEdition,
  FirstEditionError,
  firstEditionFactsSchema,
  serializeJson,
  type AuthoredText,
} from "./first-edition.logic.ts";

export const WRITTEN_FILES = [
  "meta.json",
  "source.json",
  "localizations.json",
] as const;

export type FirstEditionRequest = {
  /** JSON file with the verified facts (kept outside the repository). */
  factsFile: string;
  /** Edition folder written by `npm run data:import`, e.g. data/es/x/2026. */
  editionDirectory: string;
  /** Catalog root with `<country>/<race>/<year>/` folders. */
  dataDirectory: string;
};

export type FirstEditionReport = {
  edition: EditionRef;
  directory: string;
  files: readonly string[];
  measuredKm: number;
  differencePercent: number;
  provisional: { route: boolean; startTime: boolean };
  authoredTexts: AuthoredText[];
};

const errorCode = (error: unknown): string | undefined =>
  error instanceof Error && "code" in error && typeof error.code === "string"
    ? error.code
    : undefined;

const readJson = async (filePath: string, label: string): Promise<unknown> => {
  let content: string;
  try {
    content = await readFile(filePath, "utf8");
  } catch (error: unknown) {
    if (errorCode(error) === "ENOENT") {
      throw new FirstEditionError(`${label} ${filePath} does not exist.`);
    }
    throw error;
  }
  try {
    return JSON.parse(content);
  } catch (error: unknown) {
    throw new FirstEditionError(
      `${label} ${filePath} is not valid JSON: ${(error as Error).message}`,
    );
  }
};

const parseWith = <T>(
  schema: z.ZodType<T>,
  value: unknown,
  label: string,
): T => {
  const result = schema.safeParse(value);
  if (result.success) return result.data;
  const issues = result.error.issues
    .map(
      (issue) =>
        `- ${issue.path.length > 0 ? issue.path.join(".") : "(root)"}: ${issue.message}`,
    )
    .join("\n");
  throw new FirstEditionError(`${label} is not valid:\n${issues}`);
};

/** A first edition: no other edition of the slug exists, in any country. */
const assertFirstEdition = async (dataDirectory: string, ref: EditionRef) => {
  const { editions } = await discoverCatalog(dataDirectory);
  const others = editions.filter(
    (other) =>
      other.raceSlug === ref.raceSlug && editionKey(other) !== editionKey(ref),
  );
  if (others.length > 0) {
    throw new FirstEditionError(
      `${ref.raceSlug} already has ${others.map(editionKey).join(", ")}; this script only writes a race's first edition (use npm run data:rollover for later ones).`,
    );
  }
};

export const writeFirstEdition = async (
  request: FirstEditionRequest,
): Promise<FirstEditionReport> => {
  const facts = parseWith(
    firstEditionFactsSchema,
    await readJson(request.factsFile, "Facts file"),
    `Facts file ${request.factsFile}`,
  );
  const dataDirectory = path.resolve(request.dataDirectory);
  let resolved: ReturnType<typeof resolveEditionDirectory>;
  try {
    resolved = resolveEditionDirectory(dataDirectory, request.editionDirectory);
  } catch (error: unknown) {
    throw new FirstEditionError((error as Error).message);
  }
  const { ref, directory } = resolved;
  await assertFirstEdition(dataDirectory, ref);

  const route = parseWith(
    routeFeatureCollectionSchema,
    await readJson(path.join(directory, "route.geojson"), "route.geojson"),
    "route.geojson",
  );
  const points = parseWith(
    pointsFeatureCollectionSchema,
    await readJson(path.join(directory, "points.geojson"), "points.geojson"),
    "points.geojson",
  );

  const edition = buildFirstEdition({ facts, year: ref.year, route, points });
  const contents: Record<(typeof WRITTEN_FILES)[number], unknown> = {
    "meta.json": edition.meta,
    "source.json": edition.source,
    "localizations.json": edition.localizations,
  };

  const written: string[] = [];
  try {
    for (const name of WRITTEN_FILES) {
      // Exclusive flag: never replace a file someone already wrote.
      await writeFile(
        path.join(directory, name),
        serializeJson(contents[name]),
        {
          flag: "wx",
        },
      );
      written.push(name);
    }
  } catch (error: unknown) {
    await Promise.all(
      written.map((name) => rm(path.join(directory, name), { force: true })),
    );
    if (errorCode(error) === "EEXIST") {
      throw new FirstEditionError(
        `${directory} already has ${WRITTEN_FILES.join(", ")} or one of them; refusing to overwrite (removed the files this run had written).`,
      );
    }
    throw error;
  }

  return {
    edition: ref,
    directory,
    files: WRITTEN_FILES,
    measuredKm: edition.measuredKm,
    differencePercent: edition.differencePercent,
    provisional: {
      route: edition.meta.provisional?.route ?? false,
      startTime: edition.meta.provisional?.startTime ?? false,
    },
    authoredTexts: edition.authoredTexts,
  };
};
