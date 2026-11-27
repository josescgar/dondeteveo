import path from "node:path";

/** Identifies one edition folder: `data/<countryCode>/<raceSlug>/<year>/`. */
export type EditionRef = {
  countryCode: string;
  raceSlug: string;
  year: string;
};

export const COUNTRY_CODE_PATTERN = /^[a-z]{2}$/;
export const RACE_SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
export const YEAR_PATTERN = /^\d{4}$/;

export const editionKey = ({ countryCode, raceSlug, year }: EditionRef) =>
  `${countryCode}/${raceSlug}/${year}`;

const EDITION_PATH_DEPTH = 3;

/**
 * Resolves an edition folder and requires it to sit exactly three levels
 * inside the data directory (`<data>/<country>/<slug>/<year>`), so `..` or an
 * absolute path cannot point the import anywhere else.
 */
export const resolveEditionDirectory = (
  dataDirectory: string,
  editionDirectory: string,
): { ref: EditionRef; directory: string } => {
  const root = path.resolve(dataDirectory);
  const directory = path.resolve(editionDirectory);
  const relative = path.relative(root, directory);
  const segments = relative.split(path.sep);
  if (
    relative === "" ||
    path.isAbsolute(relative) ||
    segments[0] === ".." ||
    segments.length !== EDITION_PATH_DEPTH
  ) {
    throw new Error(
      `"${editionDirectory}" resolves to ${directory}, which is not an edition folder inside the data directory ${root} (expected ${root}${path.sep}<iso-country>${path.sep}<race-slug>${path.sep}<year>).`,
    );
  }
  return { ref: parseEditionPath(relative), directory };
};

/**
 * Reads the last three segments of an edition folder path, e.g.
 * `data/es/sevilla-marathon/2027`, and checks they follow the conventions.
 */
export const parseEditionPath = (editionDirectory: string): EditionRef => {
  const segments = path
    .normalize(editionDirectory)
    .split(path.sep)
    .filter((segment) => segment.length > 0);
  const [countryCode, raceSlug, year] = segments.slice(-3);
  if (
    segments.length < 3 ||
    !COUNTRY_CODE_PATTERN.test(countryCode) ||
    !RACE_SLUG_PATTERN.test(raceSlug) ||
    !YEAR_PATTERN.test(year)
  ) {
    throw new Error(
      `"${editionDirectory}" is not an edition folder. Expected data/<iso-country>/<race-slug>/<year>, e.g. data/es/sevilla-marathon/2027 (lowercase two-letter country, kebab-case slug, four-digit year).`,
    );
  }
  return { countryCode, raceSlug, year };
};
