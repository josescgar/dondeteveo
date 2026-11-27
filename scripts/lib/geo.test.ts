import { describe, expect, it } from "vitest";

import {
  cumulativeDistancesKm,
  distanceToLineKm,
  haversineKm,
  lineLengthKm,
  positionAlongLine,
  projectOntoLine,
  roundPosition,
  roundTo,
  segmentLengths,
  type Position,
} from "./geo.ts";

const KM_PER_DEGREE_OF_LATITUDE = 111.195;

describe("roundTo / roundPosition", () => {
  it("rounds to the requested decimals without negative zero", () => {
    expect(roundTo(1.23456789, 6)).toBe(1.234568);
    expect(Object.is(roundTo(-0.0000001, 6), 0)).toBe(true);
    expect(roundPosition([-3.70000049, 40.4045123456])).toEqual([
      -3.7, 40.404512,
    ]);
  });
});

describe("haversineKm", () => {
  it("measures one degree of latitude", () => {
    expect(haversineKm([0, 0], [0, 1])).toBeCloseTo(
      KM_PER_DEGREE_OF_LATITUDE,
      3,
    );
  });

  it("is zero for identical positions", () => {
    expect(haversineKm([2.17, 41.38], [2.17, 41.38])).toBe(0);
  });
});

describe("line measurements", () => {
  const line: Position[] = [
    [0, 0],
    [0, 0.01],
    [0, 0.03],
  ];

  it("accumulates distances and total length", () => {
    const distances = cumulativeDistancesKm(line);
    expect(distances[0]).toBe(0);
    expect(distances[1]).toBeCloseTo(1.11195, 4);
    expect(lineLengthKm(line)).toBeCloseTo(3.33585, 4);
  });

  it("lists segment lengths with their start index", () => {
    const segments = segmentLengths(line);
    expect(segments.map((segment) => segment.index)).toEqual([0, 1]);
    expect(segments[1].lengthKm).toBeCloseTo(2.2239, 3);
  });

  it("interpolates and clamps positions along the line", () => {
    expect(positionAlongLine(line, 0)).toEqual([0, 0]);
    expect(positionAlongLine(line, 99)).toEqual([0, 0.03]);
    const [longitude, latitude] = positionAlongLine(line, 2.2239);
    expect(longitude).toBe(0);
    expect(latitude).toBeCloseTo(0.02, 6);
  });

  it("measures the distance from a point to the line", () => {
    expect(distanceToLineKm([0, 0.02], line)).toBeCloseTo(0, 9);
    // 0.0005 degrees of longitude at the equator is about 55.6 m.
    expect(distanceToLineKm([0.0005, 0.02], line)).toBeCloseTo(0.0556, 3);
    // Beyond the end of the line the nearest point is the last vertex.
    expect(distanceToLineKm([0, 0.04], line)).toBeCloseTo(1.11195, 4);
  });

  it("projects a point onto every segment with its along-line distance", () => {
    const outAndBack: Position[] = [
      [0, 0],
      [0, 0.02],
      [0, 0],
    ];
    const projections = projectOntoLine([0, 0.01], outAndBack);
    expect(projections.map((p) => p.offsetKm)).toEqual([0, 0]);
    expect(projections[0].alongKm).toBeCloseTo(1.11195, 4);
    expect(projections[1].alongKm).toBeCloseTo(3.33585, 4);
  });
});
