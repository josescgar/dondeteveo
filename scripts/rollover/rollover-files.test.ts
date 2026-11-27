import {
  chmod,
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

import { metaSchema, sourceSchema } from "../../src/lib/races/schemas.ts";
import { validateCatalog } from "../edition-validation/edition-validation.logic.ts";
import { KNOWN_ISSUES } from "../edition-validation/known-issues.ts";
import {
  discoverCatalog,
  readEdition,
} from "../edition-validation/load-editions.ts";
import { rolloverEdition } from "./rollover-files.ts";
import { RolloverError } from "./rollover.logic.ts";

const RACE = "example-10k";
const DISTANCE_KM = 10;
const START: [number, number] = [-5.99, 37.38];
// Degrees of latitude per km on the validator's spherical Earth.
const KM_PER_DEGREE_LATITUDE = 111.19508;

/** A point `km` along a straight route due north from START. */
const at = (km: number): [number, number] => [
  START[0],
  Number((START[1] + km / KM_PER_DEGREE_LATITUDE).toFixed(6)),
];

const toJson = (value: unknown) => `${JSON.stringify(value, null, 2)}\n`;

const point = (
  id: string,
  label: string,
  kind: "split" | "cheer-point",
  distanceKm: number,
) => ({
  type: "Feature",
  properties: { id, label, kind, distanceKm },
  geometry: { type: "Point", coordinates: at(distanceKm) },
});

// A previous edition that passes `npm run data:validate` as is.
const files = {
  "meta.json": `{
  "name": "Example 10K",
  "date": "2026-03-15",
  "distanceKm": ${DISTANCE_KM},
  "city": "Seville",
  "startTime": "09:00",
  "timezone": "Europe/Madrid",
  "officialWebsiteUrl": "https://example.com/",
  "summary": "Urban 10K.",
  "heroNote": "Cheer by the river.",
  "waves": [
    { "label": "A", "startTime": "09:00" },
    { "label": "B", "startTime": "09:10" }
  ]
}
`,
  "source.json": `{
  "routeSourceType": "kml-import",
  "officialSourceName": "Example website",
  "officialSourceUrl": "https://example.com/",
  "notes": "Imported from the official KML."
}
`,
  "route.geojson": toJson({
    type: "FeatureCollection",
    features: [
      {
        type: "Feature",
        properties: { id: "example-10k-2026-route" },
        geometry: {
          type: "LineString",
          coordinates: Array.from({ length: DISTANCE_KM + 1 }, (_, km) =>
            at(km),
          ),
        },
      },
    ],
  }),
  "points.geojson": toJson({
    type: "FeatureCollection",
    features: [
      point("start", "Start", "split", 0),
      point("cheer-river", "Cheer point: River", "cheer-point", 2.5),
      point("km-5", "5K split", "split", 5),
      point("finish", "Finish", "split", DISTANCE_KM),
    ],
  }),
  "localizations.json": `{
  "es": {
    "meta": { "name": "10K de Ejemplo" },
    "pointLabels": { "start": "Salida", "finish": "Meta" },
    "waveLabels": ["A", "B"]
  }
}
`,
};

let dataDirectory: string;
let previousDirectory: string;

const readEditionFiles = async (directory: string) =>
  Object.fromEntries(
    await Promise.all(
      (await readdir(directory)).map(async (name) => [
        name,
        await readFile(path.join(directory, name), "utf8"),
      ]),
    ),
  );

/** Runs the same validation as `npm run data:validate` over the data dir. */
const validateDataDirectory = async (directory: string) => {
  const catalog = await discoverCatalog(directory);
  return validateCatalog({
    editions: await Promise.all(
      catalog.editions.map((ref) => readEdition(directory, ref)),
    ),
    catalog,
    knownIssues: KNOWN_ISSUES,
  });
};

const findingsOf = (
  report: Awaited<ReturnType<typeof validateDataDirectory>>,
) =>
  [
    ...report.catalogFindings,
    ...report.editions.flatMap((edition) => edition.findings),
  ].map(
    (finding) => `${finding.severity} [${finding.checkId}] ${finding.message}`,
  );

beforeEach(async () => {
  dataDirectory = await mkdtemp(path.join(tmpdir(), "rollover-"));
  previousDirectory = path.join(dataDirectory, "es", RACE, "2026");
  await mkdir(previousDirectory, { recursive: true });
  for (const [name, content] of Object.entries(files)) {
    await writeFile(path.join(previousDirectory, name), content);
  }
});

afterEach(async () => {
  await chmod(path.join(dataDirectory, "es", RACE), 0o755).catch(() => {});
  await rm(dataDirectory, { recursive: true, force: true });
});

describe("rolloverEdition", () => {
  it("starts from a previous edition that passes the edition validator", async () => {
    const report = await validateDataDirectory(dataDirectory);

    expect(findingsOf(report)).toEqual([]);
  });

  it("creates the next edition folder from the latest edition", async () => {
    const report = await rolloverEdition({
      dataDirectory,
      raceSlug: RACE,
      date: "2027-03-14",
    });

    const editionDirectory = path.join(dataDirectory, "es", RACE, "2027");
    expect(report).toMatchObject({
      countryCode: "es",
      previousYear: "2026",
      year: "2027",
      editionDirectory,
      dryRun: false,
    });

    const created = await readEditionFiles(editionDirectory);
    expect(Object.keys(created).sort()).toEqual([
      "localizations.json",
      "meta.json",
      "points.geojson",
      "route.geojson",
      "source.json",
    ]);
    expect(created["route.geojson"]).toBe(files["route.geojson"]);
    expect(created["points.geojson"]).toBe(files["points.geojson"]);

    const meta = metaSchema.parse(JSON.parse(created["meta.json"]));
    expect(meta.date).toBe("2027-03-14");
    expect(meta.startTime).toBe("09:00");
    expect(meta.waves).toBeUndefined();
    expect(meta.provisional).toEqual({ route: true, startTime: true });

    const source = sourceSchema.parse(JSON.parse(created["source.json"]));
    expect(source.notes).toMatch(
      /carried over unchanged from the 2026 edition/,
    );
    expect(Object.keys(JSON.parse(created["source.json"]))[0]).toBe(
      "routeSourceType",
    );

    expect(JSON.parse(created["localizations.json"])).toEqual({
      es: {
        meta: { name: "10K de Ejemplo" },
        pointLabels: { start: "Salida", finish: "Meta" },
      },
    });
  });

  it("produces an edition that passes the edition validator", async () => {
    await rolloverEdition({
      dataDirectory,
      raceSlug: RACE,
      date: "2027-03-14",
      startTime: "09:15",
      startTimeProvisional: true,
    });

    const report = await validateDataDirectory(dataDirectory);

    expect(report.editions.map((edition) => edition.ref.year)).toEqual([
      "2026",
      "2027",
    ]);
    expect(findingsOf(report)).toEqual([]);
    expect(report.errorCount).toBe(0);
  });

  it("never modifies the previous edition", async () => {
    const before = await readEditionFiles(previousDirectory);

    await rolloverEdition({
      dataDirectory,
      raceSlug: RACE,
      date: "2027-03-14",
    });

    expect(await readEditionFiles(previousDirectory)).toEqual(before);
  });

  it("refuses to overwrite an existing edition folder", async () => {
    await rolloverEdition({
      dataDirectory,
      raceSlug: RACE,
      date: "2027-03-14",
    });
    const existing = path.join(dataDirectory, "es", RACE, "2027");
    const before = await readEditionFiles(existing);

    await expect(
      rolloverEdition({ dataDirectory, raceSlug: RACE, date: "2027-04-01" }),
    ).rejects.toThrow(/already exists; refusing to overwrite/);
    expect(await readEditionFiles(existing)).toEqual(before);
  });

  it("rolls over from the latest edition when several exist", async () => {
    await rolloverEdition({
      dataDirectory,
      raceSlug: RACE,
      date: "2027-03-14",
    });

    const report = await rolloverEdition({
      dataDirectory,
      raceSlug: RACE,
      date: "2028-03-12",
    });

    expect(report.previousYear).toBe("2027");
    expect(report.year).toBe("2028");
  });

  it("writes nothing in dry-run mode", async () => {
    const report = await rolloverEdition({
      dataDirectory,
      raceSlug: RACE,
      date: "2027-03-14",
      dryRun: true,
    });

    expect(report.dryRun).toBe(true);
    expect(await readdir(path.join(dataDirectory, "es", RACE))).toEqual([
      "2026",
    ]);
  });

  it("skips localizations.json when the previous edition has none", async () => {
    await rm(path.join(previousDirectory, "localizations.json"));

    const report = await rolloverEdition({
      dataDirectory,
      raceSlug: RACE,
      date: "2027-03-14",
    });

    expect(report.files).not.toContain("localizations.json");
    expect(await readdir(report.editionDirectory)).not.toContain(
      "localizations.json",
    );
  });

  it("rejects unknown races, unsafe slugs, and invalid previous editions", async () => {
    await expect(
      rolloverEdition({
        dataDirectory,
        raceSlug: "missing",
        date: "2027-01-01",
      }),
    ).rejects.toThrow(RolloverError);
    await expect(
      rolloverEdition({ dataDirectory, raceSlug: "../es", date: "2027-01-01" }),
    ).rejects.toThrow(/Invalid race slug/);

    await writeFile(path.join(previousDirectory, "meta.json"), "{}");
    await expect(
      rolloverEdition({ dataDirectory, raceSlug: RACE, date: "2027-03-14" }),
    ).rejects.toThrow(/latest edition .* is not valid/);
    expect(await readdir(path.join(dataDirectory, "es", RACE))).toEqual([
      "2026",
    ]);
  });

  it("reports a missing data directory as a rollover error", async () => {
    await expect(
      rolloverEdition({
        dataDirectory: path.join(dataDirectory, "nope"),
        raceSlug: RACE,
        date: "2027-03-14",
      }),
    ).rejects.toThrow(
      new RolloverError(
        `Data directory ${path.join(dataDirectory, "nope")} does not exist or is not a directory.`,
      ),
    );
  });

  it("warns when the previous edition relies on an accepted validator exception", async () => {
    const report = await rolloverEdition({
      dataDirectory,
      raceSlug: RACE,
      date: "2027-03-14",
      dryRun: true,
      knownIssues: [
        {
          edition: `es/${RACE}/2026`,
          checkId: "route-length",
          options: { lengthTolerancePercent: 4 },
          reason: "test exception",
        },
      ],
    });

    expect(report.warnings).toEqual(
      expect.arrayContaining([
        expect.stringMatching(
          /^es\/example-10k\/2026 passes "route-length" only through an accepted exception/,
        ),
      ]),
    );
  });

  it("keeps the e2e fixture catalog, including its rolled-over edition, valid", async () => {
    const report = await validateDataDirectory(
      path.resolve("tests/fixtures/data"),
    );

    expect(report.editions.map((edition) => edition.ref.year)).toEqual([
      "2025",
      "2099",
    ]);
    expect(findingsOf(report)).toEqual([]);
  });

  it.skipIf(process.getuid?.() === 0)(
    "reports an unwritable race folder as a rollover error",
    async () => {
      await chmod(path.join(dataDirectory, "es", RACE), 0o555);

      const attempt = rolloverEdition({
        dataDirectory,
        raceSlug: RACE,
        date: "2027-03-14",
      });

      await expect(attempt).rejects.toThrow(RolloverError);
      await expect(attempt).rejects.toThrow(/Could not create .*2027/);
    },
  );
});
