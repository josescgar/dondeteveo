import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import {
  pointsFeatureCollectionSchema,
  routeFeatureCollectionSchema,
} from "../../src/lib/races/schemas.ts";
import { lineLengthKm } from "../lib/geo.ts";
import {
  RouteImportError,
  cleanCoordinates,
  detectRouteFormat,
  extractLines,
  importRoute,
  parseKmlCoordinates,
  planSplits,
  selectRouteLine,
  serializeGeoJson,
  splitId,
  splitLabel,
  type SourceLine,
} from "./route-import.logic.ts";

const FIXTURES = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  "fixtures",
);
const fixture = (name: string) => ({
  fileName: name,
  content: readFileSync(path.join(FIXTURES, name), "utf8"),
});

const baseOptions = { raceSlug: "fixture-race", year: "2027" };

describe("detectRouteFormat", () => {
  it("uses the file extension, then the root element", () => {
    expect(detectRouteFormat("a.GPX", "")).toBe("gpx");
    expect(detectRouteFormat("a.kml", "")).toBe("kml");
    expect(detectRouteFormat("download", "<gpx version='1.1'>")).toBe("gpx");
    expect(detectRouteFormat("download", "<kml>")).toBe("kml");
  });

  it("explains KMZ and unknown files", () => {
    expect(() => detectRouteFormat("a.kmz", "")).toThrow(/Extract the KML/);
    expect(() => detectRouteFormat("a.json", "{}")).toThrow(RouteImportError);
  });
});

describe("extractLines", () => {
  it("reads GPX track segments, ignoring waypoints and elevation", () => {
    const { content } = fixture("track-two-segments.gpx");
    const lines = extractLines("gpx", content);
    expect(lines.map((line) => line.label)).toEqual([
      'track 1 "Fixture track" segment 1',
      'track 1 "Fixture track" segment 2',
    ]);
    expect(lines[0].coordinates[0]).toEqual([-3.7000004, 40.4]);
    expect(lines.every((line) => line.coordinates.length === 3)).toBe(true);
  });

  it("reads GPX routes", () => {
    const lines = extractLines("gpx", fixture("route.gpx").content);
    expect(lines).toHaveLength(1);
    expect(lines[0].label).toBe('route 1 "Fixture route"');
    expect(lines[0].coordinates).toEqual([
      [-5.99, 37.38],
      [-5.99, 37.385],
      [-5.99, 37.39],
    ]);
  });

  it("reads KML LineStrings in document order, including MultiGeometry", () => {
    const lines = extractLines("kml", fixture("multi-segment.kml").content);
    expect(lines.map((line) => line.label)).toEqual([
      'LineString 1 "First half"',
      'LineString 2 "Second half"',
      'LineString 3 "Second half"',
    ]);
    expect(lines[0].coordinates).toHaveLength(3);
  });

  it("reads gx:Track coordinates", () => {
    const lines = extractLines(
      "kml",
      `<kml xmlns:gx="x"><Placemark><gx:Track>
        <when>2025-01-01T00:00:00Z</when><gx:coord>1.5 39.0 10</gx:coord>
        <when>2025-01-01T00:01:00Z</when><gx:coord>1.6 39.1 12</gx:coord>
      </gx:Track></Placemark></kml>`,
    );
    expect(lines[0].coordinates).toEqual([
      [1.5, 39],
      [1.6, 39.1],
    ]);
  });

  it("rejects invalid coordinates with their location", () => {
    expect(() => parseKmlCoordinates("1,2 x,4", "LineString 1")).toThrow(
      "Invalid coordinate in LineString 1, coordinate 2.",
    );
    expect(() =>
      extractLines(
        "gpx",
        "<gpx><trk><trkseg><trkpt lat='95' lon='1'/></trkseg></trk></gpx>",
      ),
    ).toThrow(/track 1 segment 1, point 1/);
  });

  it("rejects a document with the wrong root", () => {
    expect(() => extractLines("gpx", "<kml/>")).toThrow(/<gpx>/);
  });
});

describe("selectRouteLine", () => {
  const line = (label: string, ...coordinates: [number, number][]) =>
    ({ label, coordinates }) satisfies SourceLine;

  it("joins segments that continue one another", () => {
    const selection = selectRouteLine([
      line("a", [0, 0], [0, 0.001]),
      line("b", [0, 0.001], [0, 0.002]),
    ]);
    expect(selection.usedLines).toEqual(["a", "b"]);
    expect(selection.coordinates).toHaveLength(4);
  });

  it("rejects unrelated lines and lets the caller pick one", () => {
    const lines = [
      line("marathon", [0, 0], [0, 0.01]),
      line("10k", [1, 1], [1, 1.01]),
    ];
    expect(() => selectRouteLine(lines)).toThrow(
      /2 lines that do not join[\s\S]*--line <n>/,
    );
    expect(selectRouteLine(lines, { lineIndex: 2 }).usedLines).toEqual(["10k"]);
    expect(() => selectRouteLine(lines, { lineIndex: 3 })).toThrow(
      /out of range/,
    );
  });

  it("ignores lines with fewer than two points and fails when none remain", () => {
    expect(
      selectRouteLine([line("dot", [0, 0]), line("real", [0, 0], [0, 1])])
        .usedLines,
    ).toEqual(["real"]);
    expect(() => selectRouteLine([line("dot", [0, 0])])).toThrow(
      /No usable line/,
    );
  });
});

describe("cleanCoordinates", () => {
  it("rounds to six decimals and drops consecutive duplicates", () => {
    expect(
      cleanCoordinates([
        [1.00000001, 2],
        [1, 2.0000004],
        [1.1234567, 2],
      ]),
    ).toEqual([
      [1, 2],
      [1.123457, 2],
    ]);
  });
});

describe("planSplits", () => {
  const ids = (distanceKm: number, interval?: number) =>
    planSplits(distanceKm, interval).map((point) => point.id);

  it("adds the halfway split for marathons", () => {
    const plan = planSplits(42.195);
    expect(plan.map((point) => point.id)).toEqual([
      "start",
      "km-5",
      "km-10",
      "km-15",
      "km-20",
      "halfway",
      "km-25",
      "km-30",
      "km-35",
      "km-40",
      "finish",
    ]);
    expect(plan.find((point) => point.id === "halfway")).toEqual({
      id: "halfway",
      label: "Halfway split",
      distanceKm: 21.0975,
    });
    expect(plan.at(-1)).toEqual({
      id: "finish",
      label: "Finish",
      distanceKm: 42.195,
    });
  });

  it("uses regular splits only for other distances", () => {
    expect(ids(21.097)).toEqual([
      "start",
      "km-5",
      "km-10",
      "km-15",
      "km-20",
      "finish",
    ]);
    expect(ids(20)).toEqual(["start", "km-5", "km-10", "km-15", "finish"]);
    expect(ids(10)).toEqual(["start", "km-5", "finish"]);
    expect(ids(5)).toEqual(["start", "finish"]);
  });

  it("supports fractional intervals with the existing id and label style", () => {
    expect(ids(10, 2.5)).toEqual([
      "start",
      "km-2-5",
      "km-5",
      "km-7-5",
      "finish",
    ]);
    expect(splitId(7.5)).toBe("km-7-5");
    expect(splitLabel(7.5)).toBe("7.5K split");
    expect(splitLabel(10)).toBe("10K split");
  });

  it("rejects non-positive inputs", () => {
    expect(() => planSplits(0)).toThrow(RouteImportError);
    expect(() => planSplits(10, 0)).toThrow(RouteImportError);
  });
});

describe("importRoute", () => {
  it("imports a multi-segment GPX track into schema-valid GeoJSON", () => {
    const result = importRoute({
      ...fixture("track-two-segments.gpx"),
      ...baseOptions,
      distanceKm: 0.5,
      splitIntervalKm: 0.25,
      raceName: "Fixture Race",
    });

    expect(result.format).toBe("gpx");
    expect(result.sourcePointCount).toBe(6);
    expect(() =>
      routeFeatureCollectionSchema.parse(result.route),
    ).not.toThrow();
    expect(() =>
      pointsFeatureCollectionSchema.parse(result.points),
    ).not.toThrow();

    const [feature] = result.route.features;
    expect(feature.properties).toEqual({
      id: "fixture-race-2027-route",
      name: "Fixture Race 2027 route",
    });
    // Elevation stripped, rounded to six decimals, shared vertex deduplicated.
    expect(feature.geometry.coordinates).toEqual([
      [-3.7, 40.4],
      [-3.7, 40.401],
      [-3.7, 40.402],
      [-3.7, 40.403],
      [-3.7, 40.404512],
    ]);

    expect(result.measuredKm).toBeCloseTo(0.50171, 4);
    expect(result.differencePercent).toBeCloseTo(0.342, 2);

    const points = result.points.features.map((point) => ({
      ...point.properties,
      coordinates: point.geometry.coordinates,
    }));
    expect(points).toEqual([
      {
        id: "start",
        label: "Start",
        kind: "split",
        distanceKm: 0,
        coordinates: [-3.7, 40.4],
      },
      {
        id: "km-0-25",
        label: "0.25K split",
        kind: "split",
        distanceKm: 0.25,
        // Official 0.25 km maps to half of the measured 0.50171 km.
        coordinates: [-3.7, 40.402256],
      },
      {
        id: "finish",
        label: "Finish",
        kind: "split",
        distanceKm: 0.5,
        coordinates: [-3.7, 40.404512],
      },
    ]);
  });

  it("joins multi-segment KML in order", () => {
    const result = importRoute({
      ...fixture("multi-segment.kml"),
      ...baseOptions,
      distanceKm: 0.35,
    });
    expect(result.format).toBe("kml");
    expect(result.usedLines).toHaveLength(3);
    expect(result.route.features[0].geometry.coordinates).toEqual([
      [1.43, 38.999],
      [1.431, 38.999],
      [1.432, 38.999],
      [1.433, 38.999],
      [1.434, 38.999],
    ]);
    expect(result.route.features[0].properties.name).toBe(
      "fixture-race 2027 route",
    );
    expect(
      lineLengthKm(result.route.features[0].geometry.coordinates),
    ).toBeCloseTo(result.measuredKm, 9);
  });

  it("fails clearly for unusable or ambiguous files", () => {
    expect(() =>
      importRoute({
        ...fixture("waypoints-only.gpx"),
        ...baseOptions,
        distanceKm: 1,
      }),
    ).toThrow(/No usable line/);
    expect(() =>
      importRoute({
        ...fixture("unrelated-lines.kml"),
        ...baseOptions,
        distanceKm: 1,
      }),
    ).toThrow(/do not join[\s\S]*"Marathon"[\s\S]*"10K"/);
  });

  it("is deterministic", () => {
    const run = () =>
      serializeGeoJson(
        importRoute({
          ...fixture("route.gpx"),
          ...baseOptions,
          distanceKm: 1.1,
        }).points,
      );
    expect(run()).toBe(run());
  });
});

describe("serializeGeoJson", () => {
  it("keeps coordinate pairs on one line", () => {
    expect(
      serializeGeoJson({
        type: "Point",
        coordinates: [-5.99006, 37.37839],
        list: [
          [1, 2],
          [3.5, -4e-7],
        ],
      }),
    ).toBe(
      `{
  "type": "Point",
  "coordinates": [-5.99006, 37.37839],
  "list": [
    [1, 2],
    [3.5, -4e-7]
  ]
}
`,
    );
  });
});
