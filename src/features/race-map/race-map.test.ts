import { describe, expect, it } from "vitest";

import type { RaceRouteCollection } from "../../lib/races/schemas";

import {
  DEFAULT_ROUTE_SELECTION_TOLERANCE_METERS,
  getRouteCoordinates,
  getRouteSelection,
} from "./race-map.logic";

const buildRoute = (): RaceRouteCollection => ({
  type: "FeatureCollection" as const,
  features: [
    {
      type: "Feature" as const,
      properties: {
        id: "segment-a",
      },
      geometry: {
        type: "LineString" as const,
        coordinates: [
          [-5.99, 37.38],
          [-5.98, 37.38],
          [-5.97, 37.38],
        ],
      },
    },
    {
      type: "Feature" as const,
      properties: {
        id: "segment-b",
      },
      geometry: {
        type: "LineString" as const,
        coordinates: [
          [-5.97, 37.38],
          [-5.97, 37.39],
        ],
      },
    },
  ],
});

describe("race map logic", () => {
  it("keeps all route segments when building map coordinates", () => {
    const coordinates = getRouteCoordinates(buildRoute());

    expect(coordinates).toEqual([
      [37.38, -5.99],
      [37.38, -5.98],
      [37.38, -5.97],
      [37.38, -5.97],
      [37.39, -5.97],
    ]);
  });

  it("snaps a selected point to the route and scales it to the official race distance", () => {
    const selection = getRouteSelection(
      buildRoute(),
      [-5.975, 37.38],
      10,
      DEFAULT_ROUTE_SELECTION_TOLERANCE_METERS,
    );

    expect(selection).not.toBeNull();
    expect(selection?.distanceKm).toBeCloseTo(4.6, 1);
    expect(selection?.coordinates[0]).toBeCloseTo(37.38, 5);
    expect(selection?.coordinates[1]).toBeCloseTo(-5.975, 5);
  });

  it("keeps scaling distance across later route features", () => {
    const selection = getRouteSelection(
      buildRoute(),
      [-5.97, 37.385],
      10,
      DEFAULT_ROUTE_SELECTION_TOLERANCE_METERS,
    );

    expect(selection).not.toBeNull();
    expect(selection?.distanceKm).toBeGreaterThan(6);
  });

  it("returns null when the click is too far from the route", () => {
    const selection = getRouteSelection(
      buildRoute(),
      [-5.95, 37.45],
      10,
      DEFAULT_ROUTE_SELECTION_TOLERANCE_METERS,
    );

    expect(selection).toBeNull();
  });

  it("returns both passes for overlapping route selections", () => {
    const overlappingRoute = {
      type: "FeatureCollection" as const,
      features: [
        {
          type: "Feature" as const,
          properties: {},
          geometry: {
            type: "LineString" as const,
            coordinates: [
              [-5.99, 37.38],
              [-5.98, 37.38],
              [-5.97, 37.38],
            ],
          },
        },
        {
          type: "Feature" as const,
          properties: {},
          geometry: {
            type: "LineString" as const,
            coordinates: [
              [-5.97, 37.38],
              [-5.98, 37.38],
              [-5.99, 37.38],
            ],
          },
        },
      ],
    } satisfies RaceRouteCollection;

    const selection = getRouteSelection(
      overlappingRoute,
      [-5.98, 37.38],
      10,
      DEFAULT_ROUTE_SELECTION_TOLERANCE_METERS,
    );

    expect(selection).not.toBeNull();
    expect(selection?.distanceKm).toBeCloseTo(7.5, 0);
    expect(selection?.returnPassDistanceKm).toBeCloseTo(2.5, 0);
  });

  it("does not produce a return pass for consecutive segments within the ambiguity threshold", () => {
    const tightRoute = {
      type: "FeatureCollection" as const,
      features: [
        {
          type: "Feature" as const,
          properties: {},
          geometry: {
            type: "LineString" as const,
            coordinates: [
              [-5.99, 37.38],
              [-5.988, 37.38],
              [-5.986, 37.38],
              [-5.984, 37.38],
            ],
          },
        },
      ],
    } satisfies RaceRouteCollection;

    const selection = getRouteSelection(
      tightRoute,
      [-5.987, 37.38],
      10,
      DEFAULT_ROUTE_SELECTION_TOLERANCE_METERS,
    );

    expect(selection).not.toBeNull();
    expect(selection?.distanceKm).toBeDefined();
    expect(selection?.returnPassDistanceKm).toBeUndefined();
  });
});
