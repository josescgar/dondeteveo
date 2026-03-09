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
    expect(predicted[0].dayOffset).toBe(0);
  });

  it("wraps times past midnight and sets dayOffset for overnight races", () => {
    const points = [
      {
        properties: {
          id: "km-80",
          label: "80K split",
          kind: "split",
          distanceKm: 80,
        },
      },
      {
        properties: {
          id: "km-160",
          label: "160K split",
          kind: "split",
          distanceKm: 160,
        },
      },
    ] as never;

    // Start at 23:00, pace 12 min/km → 80 km = 960 min → clock = 23:00 + 16:00 = 39:00 → wraps to 15:00, dayOffset 1
    const predicted = buildPredictedPoints(points, 12, "23:00");
    expect(predicted[0].predictedTime).toBe("15:00");
    expect(predicted[0].dayOffset).toBe(1);
    // 160 km = 1920 min → clock = 23:00 + 32:00 = 55:00 → wraps to 07:00, dayOffset 2
    expect(predicted[1].predictedTime).toBe("07:00");
    expect(predicted[1].dayOffset).toBe(2);
  });
});
