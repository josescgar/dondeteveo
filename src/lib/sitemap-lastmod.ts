import { execFileSync } from "node:child_process";
import { readdirSync } from "node:fs";
import path from "node:path";

import { ROUTE_SEGMENTS } from "./routes";

// Maps `<race>/<year>` to the edition's data folder, relative to the repo root.
export type EditionDirectories = ReadonlyMap<string, string>;

const DATA_DIRECTORY = "data";
const STATIC_PAGE_SEGMENTS: readonly string[] = [
  ROUTE_SEGMENTS.about,
  ROUTE_SEGMENTS.privacy,
  ROUTE_SEGMENTS.contribute,
];

/**
 * Returns the repository paths whose last commit dates a sitemap URL, or
 * `null` when the URL has no known source (the caller then uses the fallback).
 * Edition pages map to their data folder; the homepages and race listings
 * change whenever the catalog does, so they map to the whole data folder.
 */
export const resolveLastmodSources = (
  pathname: string,
  editionDirectories: EditionDirectories,
): string[] | null => {
  const segments = pathname.split("/").filter(Boolean);
  const [locale, section, raceSlug, year] = segments;

  if (!locale) {
    return null;
  }

  if (segments.length === 1) {
    return [DATA_DIRECTORY];
  }

  if (section === ROUTE_SEGMENTS.races) {
    if (segments.length === 2) {
      return [DATA_DIRECTORY];
    }
    if (segments.length === 4) {
      const directory = editionDirectories.get(`${raceSlug}/${year}`);
      return directory ? [directory] : null;
    }
    return null;
  }

  if (segments.length === 2 && STATIC_PAGE_SEGMENTS.includes(section)) {
    return [`src/pages/[locale]/${section}.astro`];
  }

  return null;
};

export const listEditionDirectories = (
  repositoryRoot: string,
): EditionDirectories => {
  const directories = new Map<string, string>();
  const subdirectories = (directory: string): string[] =>
    readdirSync(path.join(repositoryRoot, directory), { withFileTypes: true })
      .filter((entry) => entry.isDirectory())
      .map((entry) => entry.name);

  for (const country of subdirectories(DATA_DIRECTORY)) {
    for (const race of subdirectories(path.join(DATA_DIRECTORY, country))) {
      for (const year of subdirectories(
        path.join(DATA_DIRECTORY, country, race),
      )) {
        directories.set(
          `${race}/${year}`,
          [DATA_DIRECTORY, country, race, year].join("/"),
        );
      }
    }
  }

  return directories;
};

const runGit = (repositoryRoot: string, args: string[]): string | null => {
  try {
    return execFileSync("git", args, {
      cwd: repositoryRoot,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();
  } catch {
    return null;
  }
};

/**
 * Builds a `lastmod` resolver for `@astrojs/sitemap`. Dates come from the last
 * git commit touching each URL's sources. Without full history (a shallow
 * clone would date every file to the checkout commit) or without git, every
 * URL gets `fallback`.
 */
export const createLastmodResolver = (
  repositoryRoot: string,
  fallback: Date,
): ((url: string) => string) => {
  const fallbackIso = fallback.toISOString();
  const hasFullHistory =
    runGit(repositoryRoot, ["rev-parse", "--is-shallow-repository"]) ===
    "false";
  const editionDirectories = listEditionDirectories(repositoryRoot);
  const cache = new Map<string, string>();

  return (url: string): string => {
    const sources = resolveLastmodSources(
      new URL(url).pathname,
      editionDirectories,
    );
    if (!hasFullHistory || !sources) {
      return fallbackIso;
    }

    const key = sources.join("\0");
    const cached = cache.get(key);
    if (cached) {
      return cached;
    }

    const committedAt = runGit(repositoryRoot, [
      "log",
      "-1",
      "--format=%cI",
      "--",
      ...sources,
    ]);
    const lastmod = committedAt
      ? new Date(committedAt).toISOString()
      : fallbackIso;
    cache.set(key, lastmod);
    return lastmod;
  };
};
