import { describe, expect, it } from "vitest";

import {
  buildPredictedPoints,
  resolvePaceMinutesPerKm,
} from "./share-view.logic";

describe("share view logic", () => {
  it("resolves pace from a finish target", () => {
    const pace = resolvePaceMinutesPerKm(
      { mode: "finish", value: "01:45:00" },
      21,
    );

    expect(pace).not.toBeNull();
  });

  it("builds predicted point times", () => {
    const points = [
      {
        properties: {
          id: "km-5",
          label: "5K split",
          kind: "split",
          distanceKm: 5,
        },
      },
    ] as never;

    const predicted = buildPredictedPoints(points, 5, "09:00");
    expect(predicted[0].predictedTime).toBe("09:25");
  });
});
