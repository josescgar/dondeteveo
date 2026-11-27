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

import { rolloverEdition } from "./rollover-files";
import { RolloverError } from "./rollover";
import { metaSchema, sourceSchema } from "./schemas";

const RACE = "example-10k";

const files = {
  "meta.json": `{
  "name": "Example 10K",
  "date": "2026-03-15",
  "distanceKm": 10,
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
  "route.geojson": `{
  "type": "FeatureCollection",
  "features": [
    {
      "type": "Feature",
      "properties": {},
      "geometry": {
        "type": "LineString",
        "coordinates": [
          [-5.99, 37.38],
          [-5.98, 37.39]
        ]
      }
    }
  ]
}
`,
  "points.geojson": `{
  "type": "FeatureCollection",
  "features": [
    {
      "type": "Feature",
      "properties": { "id": "start", "label": "Start", "kind": "split", "distanceKm": 0 },
      "geometry": { "type": "Point", "coordinates": [-5.99, 37.38] }
    }
  ]
}
`,
  "localizations.json": `{
  "es": { "meta": { "name": "10K de Ejemplo" }, "waveLabels": ["A", "B"] }
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

beforeEach(async () => {
  dataDirectory = await mkdtemp(path.join(tmpdir(), "rollover-"));
  previousDirectory = path.join(dataDirectory, "es", RACE, "2026");
  await mkdir(previousDirectory, { recursive: true });
  await mkdir(path.join(dataDirectory, "pt"));
  for (const [name, content] of Object.entries(files)) {
    await writeFile(path.join(previousDirectory, name), content);
  }
});

afterEach(async () => {
  await rm(dataDirectory, { recursive: true, force: true });
});

describe("rolloverEdition", () => {
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
      es: { meta: { name: "10K de Ejemplo" } },
    });
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
    ).rejects.toThrow(/is not a valid edition file/);
    expect(await readdir(path.join(dataDirectory, "es", RACE))).toEqual([
      "2026",
    ]);
  });
});
