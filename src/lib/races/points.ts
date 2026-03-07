import type { RacePointFeature, RacePointsCollection } from "./schemas";

export const getPointSummaries = (
  points: RacePointsCollection,
): RacePointFeature[] =>
  [...points.features].sort(
    (left, right) => left.properties.distanceKm - right.properties.distanceKm,
  );
