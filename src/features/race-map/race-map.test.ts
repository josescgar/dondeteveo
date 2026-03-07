import { describe, expect, it } from "vitest";

import { getRouteCoordinates } from "./race-map.logic";

describe("race map logic", () => {
  it("keeps all route segments when building map coordinates", () => {
    const coordinates = getRouteCoordinates({
      type: "FeatureCollection",
      features: [
        {
          type: "Feature",
          properties: {},
          geometry: {
            type: "LineString",
            coordinates: [
              [-5.99, 37.38],
              [-5.98, 37.39],
            ],
          },
        },
        {
          type: "Feature",
          properties: {},
          geometry: {
            type: "LineString",
            coordinates: [
              [-5.97, 37.4],
              [-5.96, 37.41],
            ],
          },
        },
      ],
    });

    expect(coordinates).toEqual([
      [37.38, -5.99],
      [37.39, -5.98],
      [37.4, -5.97],
      [37.41, -5.96],
    ]);
  });
});
