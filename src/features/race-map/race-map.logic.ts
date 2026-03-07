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

export const getRouteCoordinates = (
  route: RaceRouteCollection,
): [number, number][] =>
  route.features.flatMap((feature) =>
    feature.geometry.coordinates.map(
      ([lng, lat]) => [lat, lng] as [number, number],
    ),
  );

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
