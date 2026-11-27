import {
  mkdir,
  mkdtemp,
  readdir,
  readFile,
  rm,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import {
  localizationsSchema,
  metaSchema,
  sourceSchema,
} from "../../src/lib/races/schemas.ts";
import { validateCatalog } from "../edition-validation/edition-validation.logic.ts";
import { KNOWN_ISSUES } from "../edition-validation/known-issues.ts";
import {
  discoverCatalog,
  readEdition,
} from "../edition-validation/load-editions.ts";
import {
  importRoute,
  serializeGeoJson,
} from "../route-import/route-import.logic.ts";
import { writeFirstEdition } from "./first-edition-files.ts";
import {
  buildFirstEdition,
  daysBetween,
  FirstEditionError,
  firstEditionFactsSchema,
  formatAuthoredTexts,
  NEUTRAL_HERO_NOTE,
  neutralSummary,
  spanishPointLabel,
  toCodeSpanText,
  type FirstEditionFacts,
} from "./first-edition.logic.ts";

const RACE = "example-10k";
const YEAR = "2026";
const DISTANCE_KM = 10;
const START: [number, number] = [-0.37, 39.47];
// Degrees of latitude per km on the validator's spherical Earth.
const KM_PER_DEGREE_LATITUDE = 111.19508;

/** A GPX track running `km` kilometres due north from START. */
const gpx = (km: number) =>
  `<?xml version="1.0"?><gpx version="1.1"><trk><name>Example 10K 2026</name><trkseg>${Array.from(
    { length: km * 4 + 1 },
    (_, index) =>
      `<trkpt lat="${(START[1] + index / 4 / KM_PER_DEGREE_LATITUDE).toFixed(6)}" lon="${START[0]}"></trkpt>`,
  ).join("")}</trkseg></trk></gpx>`;

const imported = importRoute({
  fileName: "example-10k-2026.gpx",
  content: gpx(DISTANCE_KM),
  distanceKm: DISTANCE_KM,
  raceSlug: RACE,
  year: YEAR,
  raceName: "Example 10K",
});

const rawFacts = (): Record<string, unknown> => ({
  runDate: "2026-11-27",
  name: { en: "Example 10K", es: "10K de Ejemplo" },
  city: { en: "Valencia", es: "València" },
  distanceKm: DISTANCE_KM,
  date: "2026-12-13",
  startTime: "09:00",
  timezone: "Europe/Madrid",
  officialWebsiteUrl: "https://example.com/",
  route: {
    sourceType: "gpx-import",
    fileUrl: "https://example.com/files/example-10k-2026.gpx",
    title: "Example 10K 2026",
    pageUrl: "https://example.com/course/",
    sourceName: "Example 10K official course page",
    edition: "this",
  },
  facts: [
    {
      fact: "date",
      value: "2026-12-13",
      url: "https://example.com/rules/",
      quotes: ["La carrera se celebrará el domingo 13 de diciembre de 2026."],
    },
    {
      fact: "startTime",
      value: "09:00",
      url: "https://example.com/rules/",
      quotes: ["La salida se dará a las 9:00 horas."],
    },
    {
      fact: "distanceKm",
      value: "10",
      url: "https://example.com/rules/",
      quotes: ["Recorrido homologado de 10 km."],
    },
  ],
});

const facts = (overrides: Record<string, unknown> = {}): FirstEditionFacts =>
  firstEditionFactsSchema.parse({ ...rawFacts(), ...overrides });

const build = (overrides: Record<string, unknown> = {}) =>
  buildFirstEdition({
    facts: facts(overrides),
    year: YEAR,
    route: imported.route,
    points: imported.points,
  });

const WAVES = [
  { label: { en: "Elite", es: "Élite" }, startTime: "08:55" },
  {
    label: { en: "Wave 1 (under 40 min)", es: "Oleada 1 (menos de 40 min)" },
    startTime: "09:00",
  },
];

describe("neutralSummary", () => {
  it("names the distance and the host city only", () => {
    const city = { en: "Seville", es: "Sevilla" };
    expect(neutralSummary(42.195, city)).toEqual({
      en: "A marathon through the streets of Seville.",
      es: "Un maratón por las calles de Sevilla.",
    });
    expect(neutralSummary(21.097, city)).toEqual({
      en: "A half marathon through the streets of Seville.",
      es: "Una media maratón por las calles de Sevilla.",
    });
    expect(neutralSummary(10, city)).toEqual({
      en: "A 10 km race through the streets of Seville.",
      es: "Una carrera de 10 km por las calles de Sevilla.",
    });
    expect(neutralSummary(7.5, city).es).toBe(
      "Una carrera de 7,5 km por las calles de Sevilla.",
    );
  });
});

describe("spanishPointLabel", () => {
  it("labels the points data:import generates", () => {
    expect(spanishPointLabel("start")).toBe("Salida");
    expect(spanishPointLabel("km-5")).toBe("Punto 5K");
    expect(spanishPointLabel("km-2-5")).toBe("Punto 2.5K");
    expect(spanishPointLabel("halfway")).toBe("Punto medio");
    expect(spanishPointLabel("finish")).toBe("Meta");
  });

  it("refuses points that data:import does not generate", () => {
    expect(() => spanishPointLabel("cheer-plaza")).toThrow(FirstEditionError);
  });
});

describe("buildFirstEdition", () => {
  it("writes meta, source and Spanish localizations from the facts", () => {
    const edition = build();

    expect(edition.meta).toEqual({
      name: "Example 10K",
      date: "2026-12-13",
      distanceKm: 10,
      city: "Valencia",
      startTime: "09:00",
      timezone: "Europe/Madrid",
      officialWebsiteUrl: "https://example.com/",
      summary: "A 10 km race through the streets of Valencia.",
      heroNote: NEUTRAL_HERO_NOTE.en,
    });
    expect(edition.source).toMatchObject({
      routeSourceType: "gpx-import",
      officialSourceName: "Example 10K official course page",
      officialSourceUrl: "https://example.com/course/",
    });
    expect(edition.source.notes).toBe(
      [
        'Route imported from https://example.com/files/example-10k-2026.gpx ("Example 10K 2026") linked on https://example.com/course/, measured 10.000 km against the official 10 km (+0.00%).',
        "Splits generated by data:import; no cheer points yet. Summary and hero note are neutral placeholders until cheer points are added.",
        'Checked 2026-11-27 by scout-races: date 2026-12-13 per https://example.com/rules/: "La carrera se celebrará el domingo 13 de diciembre de 2026.".',
        'Checked 2026-11-27 by scout-races: startTime 09:00 per https://example.com/rules/: "La salida se dará a las 9:00 horas.".',
        'Checked 2026-11-27 by scout-races: distanceKm 10 per https://example.com/rules/: "Recorrido homologado de 10 km.".',
      ].join(" "),
    );
    expect(edition.localizations).toEqual({
      es: {
        meta: {
          name: "10K de Ejemplo",
          city: "València",
          summary: "Una carrera de 10 km por las calles de València.",
          heroNote: NEUTRAL_HERO_NOTE.es,
        },
        pointLabels: {
          start: "Salida",
          "km-5": "Punto 5K",
          finish: "Meta",
        },
      },
    });
    expect(edition.measuredKm).toBeCloseTo(10, 3);
  });

  it("adds waves with Spanish wave labels", () => {
    const edition = build({
      startTime: "09:00",
      waves: WAVES,
      generalStartWave: 2,
      facts: [
        ...(rawFacts().facts as unknown[]),
        {
          fact: "waves",
          value: "08:55,09:00",
          url: "https://example.com/rules/",
          quotes: ["Élite: 8:55", "Oleada 1: 9:00"],
        },
      ],
    });

    expect(edition.meta.waves).toEqual([
      { label: "Elite", startTime: "08:55" },
      { label: "Wave 1 (under 40 min)", startTime: "09:00" },
    ]);
    expect(edition.localizations.es.waveLabels).toEqual([
      "Élite",
      "Oleada 1 (menos de 40 min)",
    ]);
    expect(edition.source.notes).toContain(
      'waves 08:55,09:00 per https://example.com/rules/: "Élite: 8:55", "Oleada 1: 9:00".',
    );
  });

  it("marks an earlier edition's track as a provisional route", () => {
    const edition = build({
      route: {
        ...(rawFacts().route as object),
        title: "Example 10K 2025",
        edition: "earlier",
        earlierYear: 2025,
        sameCourse: {
          url: "https://example.com/course/",
          quote: "El recorrido será el mismo que en 2025.",
        },
      },
    });

    expect(edition.meta.provisional).toEqual({
      route: true,
      startTime: false,
    });
    expect(edition.source.notes).toContain(
      "the 2025 track linked on https://example.com/course/",
    );
    expect(edition.source.notes).toContain(
      'The 2026 track was not published; the route is marked provisional because https://example.com/course/ says: "El recorrido será el mismo que en 2025.".',
    );
  });

  it("marks a tentative start time provisional", () => {
    expect(build({ startTimeProvisional: true }).meta.provisional).toEqual({
      route: false,
      startTime: true,
    });
  });

  it("lists every authored text for review", () => {
    const edition = build({
      waves: WAVES,
      generalStartWave: 2,
      facts: [
        ...(rawFacts().facts as unknown[]),
        {
          fact: "waves",
          value: "08:55,09:00",
          url: "https://example.com/rules/",
          quotes: ["Élite: 8:55", "Oleada 1: 9:00"],
        },
      ],
    });

    expect(edition.authoredTexts.map((entry) => entry.field)).toEqual([
      "meta.json name",
      "meta.json city",
      "meta.json summary",
      "meta.json heroNote",
      "meta.json waves[0].label",
      "meta.json waves[1].label",
      "localizations.json es.meta.name",
      "localizations.json es.meta.city",
      "localizations.json es.meta.summary",
      "localizations.json es.meta.heroNote",
      "localizations.json es.waveLabels[0]",
      "localizations.json es.waveLabels[1]",
      "localizations.json es.pointLabels.start",
      "localizations.json es.pointLabels.km-5",
      "localizations.json es.pointLabels.finish",
    ]);
    expect(
      formatAuthoredTexts([{ field: "meta.json name", text: "A `b` c" }]),
    ).toBe("- meta.json name: `A 'b' c`");
  });

  it.each([
    [
      "a required fact is missing",
      { facts: (rawFacts().facts as unknown[]).slice(0, 2) },
      /no "distanceKm" entry/,
    ],
    [
      "a fact disagrees with the edition",
      { startTime: "09:30" },
      /"startTime" fact says 09:00, but the edition would get 09:30/,
    ],
    [
      "waves have no quoted fact",
      { waves: WAVES, generalStartWave: 2 },
      /no "waves" entry/,
    ],
    [
      "the date is in another year",
      {
        date: "2027-01-10",
        facts: [
          {
            fact: "date",
            value: "2027-01-10",
            url: "https://example.com/",
            quotes: ["10 de enero de 2027"],
          },
          ...(rawFacts().facts as unknown[]).slice(1),
        ],
      },
      /not in the edition folder's year 2026/,
    ],
    [
      "the race day is before the run date",
      { runDate: "2026-12-14" },
      /-1 day\(s\) after runDate/,
    ],
    [
      "the points were imported for another distance",
      {
        distanceKm: 12,
        facts: [
          ...(rawFacts().facts as unknown[]).slice(0, 2),
          {
            fact: "distanceKm",
            value: "12",
            url: "https://example.com/",
            quotes: ["12 km"],
          },
        ],
      },
      /finish is at 10 km, but distanceKm is 12/,
    ],
  ])("refuses when %s", (_name, overrides, message) => {
    expect(() => build(overrides)).toThrow(message);
  });

  it("refuses waves out of start order", () => {
    expect(() =>
      build({
        waves: [...WAVES].reverse(),
        facts: [
          ...(rawFacts().facts as unknown[]),
          {
            fact: "waves",
            value: "09:00,08:55",
            url: "https://example.com/rules/",
            quotes: ["x"],
          },
        ],
      }),
    ).toThrow(/start order/);
  });

  it("refuses cheer points in points.geojson", () => {
    expect(() =>
      buildFirstEdition({
        facts: facts(),
        year: YEAR,
        route: imported.route,
        points: {
          ...imported.points,
          features: [
            ...imported.points.features,
            {
              type: "Feature",
              properties: {
                id: "cheer-plaza",
                label: "Cheer point: Plaza",
                kind: "cheer-point",
                distanceKm: 2,
              },
              geometry: { type: "Point", coordinates: [-0.37, 39.49] },
            },
          ],
        },
      }),
    ).toThrow(/cheer points/);
  });
});

const WAVES_FACT = {
  fact: "waves",
  value: "08:55,09:00",
  url: "https://example.com/rules/",
  quotes: ["Élite: 8:55", "Oleada 1: 9:00"],
};

const withWaves = (overrides: Record<string, unknown> = {}) => ({
  waves: WAVES,
  generalStartWave: 2,
  facts: [...(rawFacts().facts as unknown[]), WAVES_FACT],
  ...overrides,
});

describe("buildFirstEdition consistency checks", () => {
  it("refuses a race day fewer than minDays after the run date", () => {
    expect(() => build({ runDate: "2026-12-12" })).toThrow(
      /1 day\(s\) after runDate 2026-12-12; a first edition needs at least 2/,
    );
    expect(() => build({ runDate: "2026-12-11" })).not.toThrow();
    expect(() =>
      buildFirstEdition({
        facts: facts({ runDate: "2026-12-12" }),
        year: YEAR,
        route: imported.route,
        points: imported.points,
        minDays: 1,
      }),
    ).not.toThrow();
  });

  it("counts calendar days", () => {
    expect(daysBetween("2026-11-27", "2026-11-29")).toBe(2);
    expect(daysBetween("2026-12-31", "2027-01-01")).toBe(1);
    expect(daysBetween("2026-03-28", "2026-03-30")).toBe(2);
  });

  it.each([
    [
      "waves without generalStartWave",
      withWaves({ generalStartWave: undefined }),
      /set generalStartWave/,
    ],
    [
      "a startTime that is not the first general-field wave's time",
      withWaves({ generalStartWave: 1 }),
      /startTime 09:00 is not the time of the first general-field wave "Elite" \(08:55\)/,
    ],
    [
      "a generalStartWave out of range",
      withWaves({ generalStartWave: 3 }),
      /generalStartWave 3 is out of range/,
    ],
    [
      "generalStartWave without waves",
      { generalStartWave: 1 },
      /generalStartWave is only for facts with waves/,
    ],
    [
      "a waves fact without waves",
      { facts: [...(rawFacts().facts as unknown[]), WAVES_FACT] },
      /"waves" entry but the facts file has no waves/,
    ],
    [
      "repeated Spanish wave labels",
      withWaves({
        waves: [
          { label: { en: "Elite", es: "Salida" }, startTime: "08:55" },
          { label: { en: "Wave 1", es: "Salida" }, startTime: "09:00" },
        ],
      }),
      /distinct in every locale; "es" repeats one/,
    ],
    [
      "a name fact that differs from name.en",
      {
        facts: [
          ...(rawFacts().facts as unknown[]),
          {
            fact: "name",
            value: "Another 10K",
            url: "https://example.com/",
            quotes: ["Another 10K"],
          },
        ],
      },
      /"name" fact says Another 10K, but the edition would get Example 10K/,
    ],
    [
      "a name.es fact that differs from name.es",
      {
        facts: [
          ...(rawFacts().facts as unknown[]),
          {
            fact: "name.es",
            value: "Otra 10K",
            url: "https://example.com/es/",
            quotes: ["Otra 10K"],
          },
        ],
      },
      /"name.es" fact says Otra 10K/,
    ],
    [
      "an earlier track from the edition year or later",
      {
        route: {
          ...(rawFacts().route as object),
          edition: "earlier",
          earlierYear: 2031,
          sameCourse: {
            url: "https://example.com/",
            quote: "Mismo recorrido.",
          },
        },
      },
      /route.earlierYear 2031 must be before the edition year 2026/,
    ],
  ])("refuses %s", (_name, overrides, message) => {
    expect(() => build(overrides)).toThrow(message);
  });
});

describe("single-line fields", () => {
  const injected = "Prueba\n## Encabezado\n- [x] item";

  it.each([
    [
      "a line break in name.es (review reproduction)",
      { name: { en: "Example 10K", es: injected } },
    ],
    ["a tab in city", { city: { en: "Valencia\tCity", es: "València" } }],
    [
      "a line separator in a wave label",
      withWaves({
        waves: [
          { label: { en: "Elite ## x", es: "Élite" }, startTime: "08:55" },
          WAVES[1],
        ],
      }),
    ],
    [
      "a carriage return in the route title",
      {
        route: { ...(rawFacts().route as object), title: "Map\r## injected" },
      },
    ],
    [
      "a line break in a quote",
      {
        facts: [
          {
            fact: "date",
            value: "2026-12-13",
            url: "https://example.com/",
            quotes: ["13 de diciembre\n- [x] done"],
          },
        ],
      },
    ],
    ["a name over 120 characters", { name: { en: "x".repeat(121), es: "x" } }],
  ])("rejects %s", (_name, overrides) => {
    const result = firstEditionFactsSchema.safeParse({
      ...rawFacts(),
      ...overrides,
    });
    expect(result.success).toBe(false);
    expect(JSON.stringify(result.error?.issues)).toMatch(/single line|at most/);
  });

  it("keeps untrusted text inside one code span", () => {
    const list = formatAuthoredTexts([
      { field: "localizations.json es.meta.name", text: injected },
      { field: "meta.json name", text: "A `b`\u0007 c" },
      { field: "meta.json summary", text: "y".repeat(400) },
    ]);
    const lines = list.split("\n");
    expect(lines).toHaveLength(3);
    expect(lines[0]).toBe(
      "- localizations.json es.meta.name: `Prueba ## Encabezado - [x] item`",
    );
    expect(lines[1]).toBe("- meta.json name: `A 'b' c`");
    expect(lines[2]).toMatch(/^- meta\.json summary: `y{299}…`$/);
    for (const line of lines) {
      expect(line.match(/`/g)).toHaveLength(2);
    }
    expect(toCodeSpanText("  a \n\t b  ")).toBe("a b");
  });
});

describe("firstEditionFactsSchema", () => {
  it.each([
    [
      "an earlier track without a same-course quote",
      {
        route: {
          ...(rawFacts().route as object),
          edition: "earlier",
          earlierYear: 2025,
        },
      },
    ],
    ["a UTC offset as time zone", { timezone: "+01:00" }],
    ["an impossible date", { date: "2026-02-30" }],
    ["a plain http URL", { officialWebsiteUrl: "http://example.com/" }],
    ["unknown keys", { summary: "Written by hand." }],
    ["a single wave", { waves: WAVES.slice(0, 1) }],
  ])("rejects %s", (_name, overrides) => {
    expect(
      firstEditionFactsSchema.safeParse({ ...rawFacts(), ...overrides })
        .success,
    ).toBe(false);
  });
});

describe("writeFirstEdition", () => {
  let root: string;
  let dataDirectory: string;
  let editionDirectory: string;
  let factsFile: string;

  const validate = async () => {
    const catalog = await discoverCatalog(dataDirectory);
    const report = validateCatalog({
      editions: await Promise.all(
        catalog.editions.map((ref) => readEdition(dataDirectory, ref)),
      ),
      catalog,
      knownIssues: KNOWN_ISSUES,
    });
    return [
      ...report.catalogFindings,
      ...report.editions.flatMap((edition) => edition.findings),
    ].map((finding) => `${finding.checkId}: ${finding.message}`);
  };

  const writeFacts = (value: Record<string, unknown>) =>
    writeFile(factsFile, JSON.stringify(value));

  beforeEach(async () => {
    root = await mkdtemp(path.join(tmpdir(), "first-edition-"));
    dataDirectory = path.join(root, "data");
    editionDirectory = path.join(dataDirectory, "es", RACE, YEAR);
    await mkdir(editionDirectory, { recursive: true });
    await writeFile(
      path.join(editionDirectory, "route.geojson"),
      serializeGeoJson(imported.route),
    );
    await writeFile(
      path.join(editionDirectory, "points.geojson"),
      serializeGeoJson(imported.points),
    );
    factsFile = path.join(root, "facts.json");
    await writeFacts(rawFacts());
  });

  afterEach(async () => {
    await rm(root, { recursive: true, force: true });
  });

  it("writes an edition that passes the edition validator", async () => {
    const report = await writeFirstEdition({
      factsFile,
      editionDirectory,
      dataDirectory,
    });

    expect(report.files).toEqual([
      "meta.json",
      "source.json",
      "localizations.json",
    ]);
    expect(report.provisional).toEqual({ route: false, startTime: false });
    expect((await readdir(editionDirectory)).sort()).toEqual([
      "localizations.json",
      "meta.json",
      "points.geojson",
      "route.geojson",
      "source.json",
    ]);
    const read = async (name: string) =>
      JSON.parse(await readFile(path.join(editionDirectory, name), "utf8"));
    metaSchema.parse(await read("meta.json"));
    sourceSchema.parse(await read("source.json"));
    localizationsSchema.parse(await read("localizations.json"));
    expect(await validate()).toEqual([]);
  });

  it("refuses to overwrite an existing file and leaves no partial files", async () => {
    await writeFile(path.join(editionDirectory, "source.json"), "{}\n");

    await expect(
      writeFirstEdition({ factsFile, editionDirectory, dataDirectory }),
    ).rejects.toThrow(/refusing to overwrite/);
    expect((await readdir(editionDirectory)).sort()).toEqual([
      "points.geojson",
      "route.geojson",
      "source.json",
    ]);
    expect(
      await readFile(path.join(editionDirectory, "source.json"), "utf8"),
    ).toBe("{}\n");
  });

  it("refuses when the race already has an edition", async () => {
    await mkdir(path.join(dataDirectory, "es", RACE, "2025"));

    await expect(
      writeFirstEdition({ factsFile, editionDirectory, dataDirectory }),
    ).rejects.toThrow(/already has es\/example-10k\/2025/);
  });

  it("refuses before data:import has written the route", async () => {
    await rm(path.join(editionDirectory, "route.geojson"));

    await expect(
      writeFirstEdition({ factsFile, editionDirectory, dataDirectory }),
    ).rejects.toThrow(/route.geojson .* does not exist/);
  });

  it("refuses an edition folder outside the data directory", async () => {
    await expect(
      writeFirstEdition({
        factsFile,
        editionDirectory: path.join(root, "elsewhere", "es", RACE, YEAR),
        dataDirectory,
      }),
    ).rejects.toBeInstanceOf(FirstEditionError);
  });

  it("passes minDays through to the race-day check", async () => {
    await writeFacts({ ...rawFacts(), runDate: "2026-12-12" });

    await expect(
      writeFirstEdition({ factsFile, editionDirectory, dataDirectory }),
    ).rejects.toThrow(/at least 2 \(--min-days\)/);
    await expect(
      writeFirstEdition({
        factsFile,
        editionDirectory,
        dataDirectory,
        minDays: 1,
      }),
    ).resolves.toMatchObject({
      files: ["meta.json", "source.json", "localizations.json"],
    });
  });

  it("reports every invalid field of the facts file", async () => {
    await writeFacts({ ...rawFacts(), startTime: "9:00", timezone: "+01:00" });

    await expect(
      writeFirstEdition({ factsFile, editionDirectory, dataDirectory }),
    ).rejects.toThrow(/startTime[\s\S]*timezone/);
  });
});
