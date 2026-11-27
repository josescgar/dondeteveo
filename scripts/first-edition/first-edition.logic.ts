// Pure logic for writing a race's first edition metadata from verified facts.
// File I/O lives in `first-edition-files.ts`; the CLI entry point is
// `scripts/first-edition.ts`. `npm run data:import` writes route.geojson and
// points.geojson first; this builds meta.json, source.json and
// localizations.json around them, with neutral wording that names no places.
import { z } from "zod";

import {
  localizationsSchema,
  metaSchema,
  sourceSchema,
  type RaceLocalizations,
  type RaceMeta,
  type RacePointsCollection,
  type RaceRouteCollection,
  type RaceSource,
} from "../../src/lib/races/schemas.ts";
import { lineLengthKm, roundTo } from "../lib/geo.ts";
import {
  isMarathonDistance,
  SPLIT_IDS,
} from "../route-import/route-import.logic.ts";

export class FirstEditionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "FirstEditionError";
  }
}

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const START_TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;
const HALF_MARATHON_DISTANCE_KM = 21.0975;
const HALF_MARATHON_TOLERANCE_KM = 0.05;
const PERCENT = 100;
/** Longest quote kept in source.json notes, as in the scout-races skill. */
const MAX_QUOTE_LENGTH = 300;
/** Longest race name, city or wave label written to meta.json. */
const MAX_NAME_LENGTH = 120;
const MAX_CITY_LENGTH = 60;
const MAX_LABEL_LENGTH = 60;
/** Fewest days between the run date and race day, as `--min-days` in the skill. */
export const DEFAULT_MIN_DAYS = 2;
const MS_PER_DAY = 86_400_000;
/**
 * Control characters, including line breaks and tabs, and the Unicode line
 * and paragraph separators. Single-line fields must not contain any: they
 * end up in meta.json and in markdown code spans in PR bodies.
 */
// eslint-disable-next-line no-control-regex
const CONTROL_CHARACTERS = /[\u0000-\u001f\u007f-\u009f\u2028\u2029]/;
/** Facts every first edition must have quoted, with the value they set. */
export const REQUIRED_FACTS = ["date", "startTime", "distanceKm"] as const;

const isCalendarDate = (value: string): boolean => {
  if (!DATE_PATTERN.test(value)) return false;
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
};

const isTimeZone = (value: string): boolean => {
  // UTC offsets such as "+01:00" are accepted by Intl but not by the validator.
  if (!/^[A-Za-z_]+(?:\/[A-Za-z0-9_+-]+)+$/.test(value)) return false;
  try {
    new Intl.DateTimeFormat("en", { timeZone: value });
    return true;
  } catch {
    return false;
  }
};

/** A one-line text: no line breaks or other control characters. */
const singleLine = (maxLength: number) =>
  z
    .string()
    .trim()
    .min(1)
    .max(maxLength, `at most ${maxLength} characters`)
    .refine(
      (value) => !CONTROL_CHARACTERS.test(value),
      "must be a single line without line breaks, tabs or other control characters",
    );
const text = singleLine(MAX_QUOTE_LENGTH);
const calendarDate = z
  .string()
  .refine(isCalendarDate, "expected a real calendar date as YYYY-MM-DD");
const startTime = z
  .string()
  .regex(START_TIME_PATTERN, "expected HH:MM, 24-hour, race local time");
const httpsUrl = z
  .url()
  .refine((value) => value.startsWith("https://"), "expected an https:// URL");
const localized = (maxLength: number) =>
  z.strictObject({ en: singleLine(maxLength), es: singleLine(maxLength) });
const quote = singleLine(MAX_QUOTE_LENGTH);

const factSchema = z.strictObject({
  /** Fact name, e.g. `date`, `startTime`, `distanceKm`, `waves`, `name`. */
  fact: text,
  /** The value as written in meta.json (`waves`: start times joined by commas). */
  value: text,
  url: httpsUrl,
  /** Exact lines from the page, one per line of the original. */
  quotes: z.array(quote).min(1),
});

const routeSchema = z
  .strictObject({
    sourceType: z.enum(["gpx-import", "kml-import"]),
    /** The GPX, KML or My Maps export that was imported. */
    fileUrl: httpsUrl,
    /** File, map or document title, as read with the skill's name check. */
    title: text,
    /** Official page that links or embeds the file. */
    pageUrl: httpsUrl,
    /** `officialSourceName`, e.g. "Valencia Marathon official course page". */
    sourceName: singleLine(MAX_NAME_LENGTH + 40),
    /** Whose track it is: this edition's, or an earlier edition's. */
    edition: z.enum(["this", "earlier"]),
    /** With `edition: "earlier"`: the year the track is labelled with. */
    earlierYear: z.number().int().min(1900).max(2999).optional(),
    /**
     * With `edition: "earlier"`: the official page for this edition that says
     * the course is unchanged or presents this track as the course.
     */
    sameCourse: z.strictObject({ url: httpsUrl, quote }).optional(),
  })
  .superRefine((route, context) => {
    if (route.edition === "earlier") {
      if (route.earlierYear === undefined || route.sameCourse === undefined) {
        context.addIssue({
          code: "custom",
          message:
            'route.edition "earlier" needs earlierYear and sameCourse (the official page for this edition that says the course is unchanged).',
        });
      }
    } else if (
      route.earlierYear !== undefined ||
      route.sameCourse !== undefined
    ) {
      context.addIssue({
        code: "custom",
        message:
          'route.earlierYear and route.sameCourse are only for route.edition "earlier".',
      });
    }
  });

export const firstEditionFactsSchema = z.strictObject({
  /** Day the facts were read (the scout run date), YYYY-MM-DD. */
  runDate: calendarDate,
  name: localized(MAX_NAME_LENGTH),
  city: localized(MAX_CITY_LENGTH),
  distanceKm: z.number().positive(),
  date: calendarDate,
  startTime,
  /** The published start time is tentative ("aproximadamente", "previsto"). */
  startTimeProvisional: z.boolean().default(false),
  timezone: text.refine(isTimeZone, "expected an IANA time zone name"),
  officialWebsiteUrl: httpsUrl,
  waves: z
    .array(
      z.strictObject({
        label: localized(MAX_LABEL_LENGTH),
        startTime,
      }),
    )
    .min(2)
    .optional(),
  /**
   * With `waves`: the 1-based position of the first wave open to the general
   * field (after any special-category starts). Its time must equal `startTime`.
   */
  generalStartWave: z.number().int().min(1).optional(),
  route: routeSchema,
  facts: z.array(factSchema).min(1),
});

export type FirstEditionFacts = z.infer<typeof firstEditionFactsSchema>;

export type FirstEditionInput = {
  facts: FirstEditionFacts;
  /** Fewest calendar days from `runDate` to race day (default 2). */
  minDays?: number;
  /** Year folder the edition lives in. */
  year: string;
  route: RaceRouteCollection;
  points: RacePointsCollection;
};

export type AuthoredText = { field: string; text: string };

export type FirstEdition = {
  meta: RaceMeta;
  source: RaceSource;
  localizations: RaceLocalizations;
  measuredKm: number;
  differencePercent: number;
  /** Every text this script wrote that a person should review. */
  authoredTexts: AuthoredText[];
};

/** `10` -> `10`, `21.097` -> `21.097`. */
const formatKm = (distanceKm: number): string => String(roundTo(distanceKm, 4));

const isHalfMarathonDistance = (distanceKm: number): boolean =>
  Math.abs(distanceKm - HALF_MARATHON_DISTANCE_KM) <=
  HALF_MARATHON_TOLERANCE_KM;

/** Neutral summaries: they name the host city and nothing else. */
export const neutralSummary = (
  distanceKm: number,
  city: FirstEditionFacts["city"],
): { en: string; es: string } => {
  if (isMarathonDistance(distanceKm)) {
    return {
      en: `A marathon through the streets of ${city.en}.`,
      es: `Un maratón por las calles de ${city.es}.`,
    };
  }
  if (isHalfMarathonDistance(distanceKm)) {
    return {
      en: `A half marathon through the streets of ${city.en}.`,
      es: `Una media maratón por las calles de ${city.es}.`,
    };
  }
  const km = formatKm(distanceKm);
  return {
    en: `A ${km} km race through the streets of ${city.en}.`,
    es: `Una carrera de ${km.replace(".", ",")} km por las calles de ${city.es}.`,
  };
};

export const NEUTRAL_HERO_NOTE = {
  en: "Cheer points for this course have not been added yet. Use the course map and the predicted split times to choose where to watch.",
  es: "Todavía no hay puntos para animar en este recorrido. Usa el mapa y los tiempos de paso previstos para elegir dónde verlo.",
} as const;

const SPLIT_ID_PATTERN = /^km-(\d+(?:-\d+)?)$/;

/** Spanish label for a point generated by `npm run data:import`. */
export const spanishPointLabel = (id: string): string => {
  if (id === SPLIT_IDS.start) return "Salida";
  if (id === SPLIT_IDS.finish) return "Meta";
  if (id === SPLIT_IDS.halfway) return "Punto medio";
  const match = SPLIT_ID_PATTERN.exec(id);
  if (match) return `Punto ${match[1].replace("-", ".")}K`;
  throw new FirstEditionError(
    `points.geojson has a point "${id}" that npm run data:import does not generate; a first edition starts with generated splits only.`,
  );
};

/** `+0.12%`, `-1.50%`; a difference that rounds to zero is `+0.00%`. */
export const formatPercent = (value: number): string => {
  const rounded = roundTo(value, 2);
  return `${rounded >= 0 ? "+" : ""}${rounded.toFixed(2)}%`;
};

/** Quotes go into notes as written; only line breaks are flattened. */
const flatten = (value: string): string => value.replace(/\s+/g, " ").trim();

const factSentence = (
  runDate: string,
  fact: FirstEditionFacts["facts"][number],
): string =>
  `Checked ${runDate} by scout-races: ${fact.fact} ${fact.value} per ${fact.url}: ${fact.quotes
    .map((line) => `"${flatten(line)}"`)
    .join(", ")}.`;

const routeSentences = (
  facts: FirstEditionFacts,
  year: string,
  measuredKm: number,
  differencePercent: number,
): string[] => {
  const { route } = facts;
  const measured = `measured ${measuredKm.toFixed(3)} km against the official ${formatKm(facts.distanceKm)} km (${formatPercent(differencePercent)})`;
  const sentences =
    route.edition === "this"
      ? [
          `Route imported from ${route.fileUrl} ("${flatten(route.title)}") linked on ${route.pageUrl}, ${measured}.`,
        ]
      : [
          `Route imported from ${route.fileUrl} ("${flatten(route.title)}"), the ${route.earlierYear} track linked on ${route.pageUrl}, ${measured}.`,
          `The ${year} track was not published; the route is marked provisional because ${route.sameCourse?.url} says: "${flatten(route.sameCourse?.quote ?? "")}".`,
        ];
  sentences.push(
    "Splits generated by data:import; no cheer points yet. Summary and hero note are neutral placeholders until cheer points are added.",
  );
  return sentences;
};

const requireFactValues = (facts: FirstEditionFacts) => {
  const expected: Record<string, string> = {
    date: facts.date,
    startTime: facts.startTime,
    distanceKm: formatKm(facts.distanceKm),
  };
  if (facts.waves) {
    expected.waves = facts.waves.map((wave) => wave.startTime).join(",");
  } else if (facts.facts.some((fact) => fact.fact === "waves")) {
    throw new FirstEditionError(
      'facts has a "waves" entry but the facts file has no waves; add the waves or remove the fact.',
    );
  }
  for (const [name, value] of [
    ["name", facts.name.en],
    ["name.es", facts.name.es],
  ] as const) {
    for (const entry of facts.facts.filter((fact) => fact.fact === name)) {
      if (entry.value !== value) {
        throw new FirstEditionError(
          `The "${name}" fact says ${entry.value}, but the edition would get ${value}.`,
        );
      }
    }
  }
  for (const [name, value] of Object.entries(expected)) {
    const entries = facts.facts.filter((fact) => fact.fact === name);
    if (entries.length === 0) {
      throw new FirstEditionError(
        `facts has no "${name}" entry; every first edition needs ${[...REQUIRED_FACTS, ...(facts.waves ? ["waves"] : [])].join(", ")} quoted from an official page.`,
      );
    }
    for (const entry of entries) {
      const actual =
        name === "distanceKm" ? formatKm(Number(entry.value)) : entry.value;
      if (actual !== value) {
        throw new FirstEditionError(
          `The "${name}" fact says ${entry.value}, but the edition would get ${value}.`,
        );
      }
    }
  }
};

const requireOrderedWaves = (facts: FirstEditionFacts) => {
  const waves = facts.waves;
  if (!waves) return;
  for (let index = 1; index < waves.length; index += 1) {
    if (waves[index].startTime < waves[index - 1].startTime) {
      throw new FirstEditionError(
        `waves must be in start order; "${waves[index].label.en}" (${waves[index].startTime}) starts before "${waves[index - 1].label.en}" (${waves[index - 1].startTime}).`,
      );
    }
  }
  for (const locale of ["en", "es"] as const) {
    const labels = new Set(waves.map((wave) => wave.label[locale]));
    if (labels.size !== waves.length) {
      throw new FirstEditionError(
        `Wave labels must be distinct in every locale; "${locale}" repeats one.`,
      );
    }
  }
  if (facts.generalStartWave === undefined) {
    throw new FirstEditionError(
      "With waves, set generalStartWave to the position (from 1) of the first wave open to the general field; its time must equal startTime.",
    );
  }
  const general = waves[facts.generalStartWave - 1];
  if (!general) {
    throw new FirstEditionError(
      `generalStartWave ${facts.generalStartWave} is out of range; there are ${waves.length} waves.`,
    );
  }
  if (general.startTime !== facts.startTime) {
    throw new FirstEditionError(
      `startTime ${facts.startTime} is not the time of the first general-field wave "${general.label.en}" (${general.startTime}).`,
    );
  }
};

const requireNoWaveOptions = (facts: FirstEditionFacts) => {
  if (!facts.waves && facts.generalStartWave !== undefined) {
    throw new FirstEditionError(
      "generalStartWave is only for facts with waves.",
    );
  }
};

/** Calendar days from `from` to `to`, both `YYYY-MM-DD`. */
export const daysBetween = (from: string, to: string): number =>
  Math.round(
    (Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) /
      MS_PER_DAY,
  );

const requireMatchingPoints = (
  points: RacePointsCollection,
  distanceKm: number,
) => {
  const cheerPoints = points.features.filter(
    (feature) => feature.properties.kind !== "split",
  );
  if (cheerPoints.length > 0) {
    throw new FirstEditionError(
      `points.geojson has cheer points (${cheerPoints.map((feature) => feature.properties.id).join(", ")}); a first edition starts with the splits generated by npm run data:import only.`,
    );
  }
  const finish = points.features.find(
    (feature) => feature.properties.id === SPLIT_IDS.finish,
  );
  if (!finish || finish.properties.distanceKm !== distanceKm) {
    throw new FirstEditionError(
      `points.geojson finish is at ${finish?.properties.distanceKm ?? "no distance"} km, but distanceKm is ${distanceKm}; import with --distance ${distanceKm}.`,
    );
  }
};

/**
 * Builds the first edition's metadata from verified facts. Throws
 * `FirstEditionError` when the facts are incomplete or inconsistent with each
 * other or with the imported route and points.
 */
export const buildFirstEdition = ({
  facts,
  year,
  route,
  points,
  minDays = DEFAULT_MIN_DAYS,
}: FirstEditionInput): FirstEdition => {
  if (facts.date.slice(0, 4) !== year) {
    throw new FirstEditionError(
      `date ${facts.date} is not in the edition folder's year ${year}.`,
    );
  }
  const daysAway = daysBetween(facts.runDate, facts.date);
  if (daysAway < minDays) {
    throw new FirstEditionError(
      `date ${facts.date} is ${daysAway} day(s) after runDate ${facts.runDate}; a first edition needs at least ${minDays} (--min-days), so target the following edition.`,
    );
  }
  if (
    facts.route.earlierYear !== undefined &&
    facts.route.earlierYear >= Number(year)
  ) {
    throw new FirstEditionError(
      `route.earlierYear ${facts.route.earlierYear} must be before the edition year ${year}.`,
    );
  }
  requireFactValues(facts);
  requireNoWaveOptions(facts);
  requireOrderedWaves(facts);
  requireMatchingPoints(points, facts.distanceKm);
  if (route.features.length !== 1) {
    throw new FirstEditionError(
      `route.geojson has ${route.features.length} features; expected the single line written by npm run data:import.`,
    );
  }

  const measuredKm = lineLengthKm(route.features[0].geometry.coordinates);
  const differencePercent =
    ((measuredKm - facts.distanceKm) / facts.distanceKm) * PERCENT;
  const summary = neutralSummary(facts.distanceKm, facts.city);
  const provisionalRoute = facts.route.edition === "earlier";

  const meta: RaceMeta = {
    name: facts.name.en,
    date: facts.date,
    distanceKm: facts.distanceKm,
    city: facts.city.en,
    startTime: facts.startTime,
    timezone: facts.timezone,
    officialWebsiteUrl: facts.officialWebsiteUrl,
    summary: summary.en,
    heroNote: NEUTRAL_HERO_NOTE.en,
  };
  if (facts.waves) {
    meta.waves = facts.waves.map((wave) => ({
      label: wave.label.en,
      startTime: wave.startTime,
    }));
  }
  if (provisionalRoute || facts.startTimeProvisional) {
    meta.provisional = {
      route: provisionalRoute,
      startTime: facts.startTimeProvisional,
    };
  }

  const source: RaceSource = {
    routeSourceType: facts.route.sourceType,
    officialSourceName: facts.route.sourceName,
    officialSourceUrl: facts.route.pageUrl,
    notes: [
      ...routeSentences(facts, year, measuredKm, differencePercent),
      ...facts.facts.map((fact) => factSentence(facts.runDate, fact)),
    ].join(" "),
  };

  const pointLabels = Object.fromEntries(
    points.features.map((feature) => [
      feature.properties.id,
      spanishPointLabel(feature.properties.id),
    ]),
  );
  const localizations: RaceLocalizations = {
    es: {
      meta: {
        name: facts.name.es,
        city: facts.city.es,
        summary: summary.es,
        heroNote: NEUTRAL_HERO_NOTE.es,
      },
      ...(facts.waves
        ? { waveLabels: facts.waves.map((wave) => wave.label.es) }
        : {}),
      pointLabels,
    },
  };

  const authoredTexts: AuthoredText[] = [
    { field: "meta.json name", text: meta.name },
    { field: "meta.json city", text: meta.city },
    { field: "meta.json summary", text: meta.summary },
    { field: "meta.json heroNote", text: meta.heroNote },
    ...(meta.waves ?? []).map((wave, index) => ({
      field: `meta.json waves[${index}].label`,
      text: wave.label,
    })),
    { field: "localizations.json es.meta.name", text: facts.name.es },
    { field: "localizations.json es.meta.city", text: facts.city.es },
    { field: "localizations.json es.meta.summary", text: summary.es },
    {
      field: "localizations.json es.meta.heroNote",
      text: NEUTRAL_HERO_NOTE.es,
    },
    ...(facts.waves ?? []).map((wave, index) => ({
      field: `localizations.json es.waveLabels[${index}]`,
      text: wave.label.es,
    })),
    ...Object.entries(pointLabels).map(([id, label]) => ({
      field: `localizations.json es.pointLabels.${id}`,
      text: label,
    })),
  ];

  // Validate, but return the objects as built so the files keep this order.
  metaSchema.parse(meta);
  sourceSchema.parse(source);
  localizationsSchema.parse(localizations);

  return {
    meta,
    source,
    localizations,
    measuredKm,
    differencePercent,
    authoredTexts,
  };
};

/**
 * Makes untrusted text safe inside a markdown code span: whitespace and
 * control characters become single spaces, backticks become quotes, and long
 * text is cut at the quote limit.
 */
export const toCodeSpanText = (value: string): string => {
  const flat = value
    .replace(new RegExp(CONTROL_CHARACTERS.source, "g"), " ")
    .replace(/\s+/g, " ")
    .replaceAll("`", "'")
    .trim();
  return flat.length > MAX_QUOTE_LENGTH
    ? `${flat.slice(0, MAX_QUOTE_LENGTH - 1)}…`
    : flat;
};

/** Markdown list for the PR body; texts go in code spans (they may come from web pages). */
export const formatAuthoredTexts = (texts: AuthoredText[]): string =>
  texts
    .map(({ field, text: value }) => `- ${field}: \`${toCodeSpanText(value)}\``)
    .join("\n");

export const serializeJson = (value: unknown): string =>
  `${JSON.stringify(value, null, 2)}\n`;
