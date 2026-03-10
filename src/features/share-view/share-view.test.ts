import { describe, expect, it } from "vitest";

import {
  CHECKPOINT_SAFETY_MARGIN_MINUTES,
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
    expect(predicted[0].bufferedTime).toBe("09:30");
    expect(predicted[0].bufferedDayOffset).toBe(0);
    expect(predicted[0].safetyMarginMinutes).toBe(
      CHECKPOINT_SAFETY_MARGIN_MINUTES,
    );
  });

  it("adds a safety margin without changing the exact checkpoint time", () => {
    const points = [
      {
        properties: {
          id: "start",
          label: "Start",
          kind: "split",
          distanceKm: 0,
        },
      },
    ] as never;

    const predicted = buildPredictedPoints(points, 5, "23:58");
    expect(predicted[0].predictedTime).toBe("23:58");
    expect(predicted[0].dayOffset).toBe(0);
    expect(predicted[0].bufferedTime).toBe("00:03");
    expect(predicted[0].bufferedDayOffset).toBe(1);
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
    expect(predicted[0].bufferedTime).toBe("15:05");
    expect(predicted[0].bufferedDayOffset).toBe(1);
    // 160 km = 1920 min → clock = 23:00 + 32:00 = 55:00 → wraps to 07:00, dayOffset 2
    expect(predicted[1].predictedTime).toBe("07:00");
    expect(predicted[1].dayOffset).toBe(2);
    expect(predicted[1].bufferedTime).toBe("07:05");
    expect(predicted[1].bufferedDayOffset).toBe(2);
  });

  it("applies the same safety margin for finish-time shares", () => {
    const pace = resolvePaceMinutesPerKm(
      { mode: "finish", value: "01:45:00" },
      21,
    );

    expect(pace).not.toBeNull();

    const points = [
      {
        properties: {
          id: "km-21",
          label: "Finish",
          kind: "split",
          distanceKm: 21,
        },
      },
    ] as never;

    const predicted = buildPredictedPoints(points, pace!, "09:00");
    expect(predicted[0].predictedTime).toBe("10:45");
    expect(predicted[0].bufferedTime).toBe("10:50");
  });
});
