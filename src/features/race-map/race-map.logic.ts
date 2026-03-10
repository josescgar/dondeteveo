import type {
  RacePointsCollection,
  RaceRouteCollection,
} from "../../lib/races/schemas";

export type RaceMapMarker = {
  id: string;
  label: string;
  kind: "split" | "cheer-point";
  coordinates: [number, number];
  detail?: string;
};

export type RouteSelection = {
  coordinates: [number, number];
  distanceKm: number;
};

type RouteSelectionCandidate = RouteSelection & {
  distanceFromRouteMeters: number;
  rawDistanceKm: number;
};

type RouteSegment = {
  start: [number, number];
  end: [number, number];
  distanceBeforeKm: number;
  lengthKm: number;
};

const EARTH_RADIUS_METERS = 6_371_000;
const ROUTE_SELECTION_TIE_TOLERANCE_METERS = 0.5;
const AMBIGUOUS_SELECTION_DISTANCE_THRESHOLD_KM = 0.1;

export const DEFAULT_ROUTE_SELECTION_TOLERANCE_METERS = 90;

const toRadians = (value: number): number => (value * Math.PI) / 180;

const clamp = (value: number, minimum: number, maximum: number): number =>
  Math.min(maximum, Math.max(minimum, value));

const projectCoordinate = (
  [lng, lat]: [number, number],
  referenceLatitude: number,
): { x: number; y: number } => {
  const latitudeRadians = toRadians(lat);
  const longitudeRadians = toRadians(lng);
  const referenceLatitudeRadians = toRadians(referenceLatitude);

  return {
    x:
      EARTH_RADIUS_METERS *
      longitudeRadians *
      Math.cos(referenceLatitudeRadians),
    y: EARTH_RADIUS_METERS * latitudeRadians,
  };
};

const unprojectCoordinate = (
  point: { x: number; y: number },
  referenceLatitude: number,
): [number, number] => {
  const referenceLatitudeRadians = toRadians(referenceLatitude);

  return [
    (point.x / (EARTH_RADIUS_METERS * Math.cos(referenceLatitudeRadians))) *
      (180 / Math.PI),
    (point.y / EARTH_RADIUS_METERS) * (180 / Math.PI),
  ];
};

const distanceBetweenCoordinatesKm = (
  [startLng, startLat]: [number, number],
  [endLng, endLat]: [number, number],
): number => {
  const deltaLatitude = toRadians(endLat - startLat);
  const deltaLongitude = toRadians(endLng - startLng);
  const startLatitudeRadians = toRadians(startLat);
  const endLatitudeRadians = toRadians(endLat);
  const halfChordLength =
    Math.sin(deltaLatitude / 2) ** 2 +
    Math.cos(startLatitudeRadians) *
      Math.cos(endLatitudeRadians) *
      Math.sin(deltaLongitude / 2) ** 2;
  const angularDistance =
    2 * Math.atan2(Math.sqrt(halfChordLength), Math.sqrt(1 - halfChordLength));

  return (EARTH_RADIUS_METERS * angularDistance) / 1000;
};

const getRouteSegments = (route: RaceRouteCollection): RouteSegment[] => {
  const segments: RouteSegment[] = [];
  let cumulativeDistanceKm = 0;

  route.features.forEach((feature) => {
    const coordinates = feature.geometry.coordinates;

    for (
      let coordinateIndex = 0;
      coordinateIndex < coordinates.length - 1;
      coordinateIndex += 1
    ) {
      const start = coordinates[coordinateIndex] as [number, number];
      const end = coordinates[coordinateIndex + 1] as [number, number];
      const lengthKm = distanceBetweenCoordinatesKm(start, end);

      if (lengthKm === 0) {
        continue;
      }

      segments.push({
        start,
        end,
        distanceBeforeKm: cumulativeDistanceKm,
        lengthKm,
      });
      cumulativeDistanceKm += lengthKm;
    }
  });

  return segments;
};

const getRouteReferenceLatitude = (route: RaceRouteCollection): number => {
  let coordinateCount = 0;
  let latitudeTotal = 0;

  route.features.forEach((feature) => {
    feature.geometry.coordinates.forEach(([, lat]) => {
      coordinateCount += 1;
      latitudeTotal += lat;
    });
  });

  return coordinateCount === 0 ? 0 : latitudeTotal / coordinateCount;
};

const scaleRouteDistance = (
  rawDistanceKm: number,
  totalRouteDistanceKm: number,
  raceDistanceKm: number,
): number => {
  if (totalRouteDistanceKm === 0) {
    return 0;
  }

  const scaledDistanceKm =
    (rawDistanceKm / totalRouteDistanceKm) * raceDistanceKm;
  return clamp(scaledDistanceKm, 0, raceDistanceKm);
};

export const getRouteCoordinates = (
  route: RaceRouteCollection,
): [number, number][] =>
  route.features.flatMap((feature) =>
    feature.geometry.coordinates.map(
      ([lng, lat]) => [lat, lng] as [number, number],
    ),
  );

export const getRouteSelection = (
  route: RaceRouteCollection,
  coordinate: [number, number],
  raceDistanceKm: number,
  maxSnapDistanceMeters = DEFAULT_ROUTE_SELECTION_TOLERANCE_METERS,
): RouteSelection | null => {
  const segments = getRouteSegments(route);

  if (segments.length === 0) {
    return null;
  }

  const totalRouteDistanceKm =
    segments[segments.length - 1].distanceBeforeKm +
    segments[segments.length - 1].lengthKm;
  const referenceLatitude = getRouteReferenceLatitude(route);
  const projectedCoordinate = projectCoordinate(coordinate, referenceLatitude);
  let closestSelection: RouteSelectionCandidate | null = null;
  let closestDistanceFromRouteMeters = Number.POSITIVE_INFINITY;
  let hasAmbiguousMatch = false;

  for (const segment of segments) {
    const projectedStart = projectCoordinate(segment.start, referenceLatitude);
    const projectedEnd = projectCoordinate(segment.end, referenceLatitude);
    const deltaX = projectedEnd.x - projectedStart.x;
    const deltaY = projectedEnd.y - projectedStart.y;
    const segmentLengthSquared = deltaX ** 2 + deltaY ** 2;

    if (segmentLengthSquared === 0) {
      continue;
    }

    const projectionRatio = clamp(
      ((projectedCoordinate.x - projectedStart.x) * deltaX +
        (projectedCoordinate.y - projectedStart.y) * deltaY) /
        segmentLengthSquared,
      0,
      1,
    );
    const snappedProjectedPoint = {
      x: projectedStart.x + deltaX * projectionRatio,
      y: projectedStart.y + deltaY * projectionRatio,
    };
    const snappedCoordinate = unprojectCoordinate(
      snappedProjectedPoint,
      referenceLatitude,
    );
    const distanceFromRouteMeters =
      distanceBetweenCoordinatesKm(coordinate, snappedCoordinate) * 1000;

    const rawDistanceKm =
      segment.distanceBeforeKm + segment.lengthKm * projectionRatio;

    if (closestSelection) {
      const distanceDelta = Math.abs(
        distanceFromRouteMeters - closestDistanceFromRouteMeters,
      );

      if (distanceDelta <= ROUTE_SELECTION_TIE_TOLERANCE_METERS) {
        if (
          Math.abs(rawDistanceKm - closestSelection.rawDistanceKm) >
          AMBIGUOUS_SELECTION_DISTANCE_THRESHOLD_KM
        ) {
          hasAmbiguousMatch = true;
        }

        continue;
      }

      if (distanceFromRouteMeters > closestDistanceFromRouteMeters) {
        continue;
      }
    }

    hasAmbiguousMatch = false;

    closestSelection = {
      coordinates: [snappedCoordinate[1], snappedCoordinate[0]],
      distanceKm: scaleRouteDistance(
        rawDistanceKm,
        totalRouteDistanceKm,
        raceDistanceKm,
      ),
      distanceFromRouteMeters,
      rawDistanceKm,
    };
    closestDistanceFromRouteMeters = distanceFromRouteMeters;
  }

  if (
    !closestSelection ||
    hasAmbiguousMatch ||
    closestDistanceFromRouteMeters > maxSnapDistanceMeters
  ) {
    return null;
  }

  return {
    coordinates: closestSelection.coordinates,
    distanceKm: closestSelection.distanceKm,
  };
};

export const getMapMarkers = (
  points: RacePointsCollection,
  details?: Record<string, string>,
): RaceMapMarker[] =>
  points.features.map((feature) => ({
    id: feature.properties.id,
    label: feature.properties.label,
    kind: feature.properties.kind,
    coordinates: [
      feature.geometry.coordinates[1],
      feature.geometry.coordinates[0],
    ],
    detail: details?.[feature.properties.id],
  }));
