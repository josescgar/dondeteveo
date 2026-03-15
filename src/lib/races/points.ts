import type {
  RaceMeta,
  RacePointFeature,
  RacePointsCollection,
} from "./schemas";

export const resolveStartTime = (
  meta: RaceMeta,
  waveIndex?: number,
): string => {
  if (
    meta.waves &&
    waveIndex !== undefined &&
    waveIndex >= 0 &&
    waveIndex < meta.waves.length
  ) {
    return meta.waves[waveIndex].startTime;
  }
  return meta.startTime;
};

export const getPointSummaries = (
  points: RacePointsCollection,
): RacePointFeature[] =>
  [...points.features].sort(
    (left, right) => left.properties.distanceKm - right.properties.distanceKm,
  );
