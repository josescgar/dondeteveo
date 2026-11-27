/**
 * Small, dependency-free geodesy helpers shared by the data scripts.
 *
 * Coordinates follow GeoJSON order: `[longitude, latitude]`.
 */

export type Position = readonly [longitude: number, latitude: number];

/** Mean Earth radius (IUGG), the same value earlier manual imports used. */
export const EARTH_RADIUS_KM = 6371.0088;

/** Decimal places kept for every imported coordinate (~0.1 m precision). */
export const COORDINATE_DECIMALS = 6;

const DEGREES_TO_RADIANS = Math.PI / 180;

const toRadians = (degrees: number): number => degrees * DEGREES_TO_RADIANS;

export const roundTo = (value: number, decimals: number): number => {
  const factor = 10 ** decimals;
  const rounded = Math.round(value * factor) / factor;
  // Avoid emitting `-0` in JSON output.
  return Object.is(rounded, -0) ? 0 : rounded;
};

export const roundPosition = (
  position: Position,
  decimals: number = COORDINATE_DECIMALS,
): Position => [roundTo(position[0], decimals), roundTo(position[1], decimals)];

export const isValidPosition = (position: Position): boolean =>
  Number.isFinite(position[0]) &&
  Number.isFinite(position[1]) &&
  Math.abs(position[0]) <= 180 &&
  Math.abs(position[1]) <= 90;

/** Great-circle distance between two positions, in kilometres. */
export const haversineKm = (from: Position, to: Position): number => {
  const deltaLatitude = toRadians(to[1] - from[1]);
  const deltaLongitude = toRadians(to[0] - from[0]);
  const a =
    Math.sin(deltaLatitude / 2) ** 2 +
    Math.cos(toRadians(from[1])) *
      Math.cos(toRadians(to[1])) *
      Math.sin(deltaLongitude / 2) ** 2;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.min(1, Math.sqrt(a)));
};

/** Running distance from the first coordinate to each coordinate, in km. */
export const cumulativeDistancesKm = (
  coordinates: readonly Position[],
): number[] => {
  const distances = [0];
  for (let index = 1; index < coordinates.length; index += 1) {
    distances.push(
      distances[index - 1] +
        haversineKm(coordinates[index - 1], coordinates[index]),
    );
  }
  return distances;
};

export const lineLengthKm = (coordinates: readonly Position[]): number => {
  const distances = cumulativeDistancesKm(coordinates);
  return distances[distances.length - 1] ?? 0;
};

export type Segment = {
  /** Index of the first coordinate of the segment. */
  index: number;
  lengthKm: number;
};

/** Every consecutive pair of coordinates, with its length. */
export const segmentLengths = (coordinates: readonly Position[]): Segment[] =>
  coordinates.slice(1).map((coordinate, offset) => ({
    index: offset,
    lengthKm: haversineKm(coordinates[offset], coordinate),
  }));

const interpolate = (from: Position, to: Position, ratio: number): Position => [
  from[0] + (to[0] - from[0]) * ratio,
  from[1] + (to[1] - from[1]) * ratio,
];

/**
 * Position at `distanceKm` measured along the line from its first coordinate.
 * Values outside the line are clamped to its ends.
 */
export const positionAlongLine = (
  coordinates: readonly Position[],
  distanceKm: number,
): Position => {
  if (coordinates.length === 0) {
    throw new Error("Cannot interpolate along an empty line.");
  }
  const distances = cumulativeDistancesKm(coordinates);
  const totalKm = distances[distances.length - 1];
  if (distanceKm <= 0) {
    return coordinates[0];
  }
  if (distanceKm >= totalKm) {
    return coordinates[coordinates.length - 1];
  }
  for (let index = 1; index < coordinates.length; index += 1) {
    if (distances[index] >= distanceKm) {
      const segmentKm = distances[index] - distances[index - 1];
      const ratio =
        segmentKm === 0 ? 0 : (distanceKm - distances[index - 1]) / segmentKm;
      return interpolate(coordinates[index - 1], coordinates[index], ratio);
    }
  }
  return coordinates[coordinates.length - 1];
};

/**
 * Shortest distance in km from a position to a polyline.
 *
 * Each segment is projected onto a local equirectangular plane centred on the
 * point. That is accurate to well under a metre for the short distances that
 * matter here (is a point on, or a few metres from, the route?).
 */
export const distanceToLineKm = (
  point: Position,
  coordinates: readonly Position[],
): number => {
  if (coordinates.length === 0) {
    return Number.POSITIVE_INFINITY;
  }
  if (coordinates.length === 1) {
    return haversineKm(point, coordinates[0]);
  }
  const longitudeScale = Math.cos(toRadians(point[1]));
  const kmPerDegree = toRadians(1) * EARTH_RADIUS_KM;
  const toPlane = (position: Position): [number, number] => [
    (position[0] - point[0]) * longitudeScale * kmPerDegree,
    (position[1] - point[1]) * kmPerDegree,
  ];

  let best = Number.POSITIVE_INFINITY;
  for (let index = 1; index < coordinates.length; index += 1) {
    const [ax, ay] = toPlane(coordinates[index - 1]);
    const [bx, by] = toPlane(coordinates[index]);
    const dx = bx - ax;
    const dy = by - ay;
    const lengthSquared = dx * dx + dy * dy;
    const ratio =
      lengthSquared === 0
        ? 0
        : Math.min(1, Math.max(0, -(ax * dx + ay * dy) / lengthSquared));
    best = Math.min(best, Math.hypot(ax + ratio * dx, ay + ratio * dy));
  }
  return best;
};
