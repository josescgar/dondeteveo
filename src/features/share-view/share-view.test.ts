import { describe, expect, it } from "vitest";

import {
  CHECKPOINT_SAFETY_MARGIN_MINUTES,
  buildPredictedPoints,
  buildPredictedRouteSelection,
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
    expect(predicted[0].earliestTime).toBe("09:20");
    expect(predicted[0].earliestDayOffset).toBe(0);
    expect(predicted[0].latestTime).toBe("09:30");
    expect(predicted[0].latestDayOffset).toBe(0);
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
    expect(predicted[0].earliestTime).toBe("23:53");
    expect(predicted[0].earliestDayOffset).toBe(0);
    expect(predicted[0].latestTime).toBe("00:03");
    expect(predicted[0].latestDayOffset).toBe(1);
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
    expect(predicted[0].earliestTime).toBe("14:55");
    expect(predicted[0].earliestDayOffset).toBe(1);
    expect(predicted[0].latestTime).toBe("15:05");
    expect(predicted[0].latestDayOffset).toBe(1);
    // 160 km = 1920 min → clock = 23:00 + 32:00 = 55:00 → wraps to 07:00, dayOffset 2
    expect(predicted[1].predictedTime).toBe("07:00");
    expect(predicted[1].dayOffset).toBe(2);
    expect(predicted[1].earliestTime).toBe("06:55");
    expect(predicted[1].earliestDayOffset).toBe(2);
    expect(predicted[1].latestTime).toBe("07:05");
    expect(predicted[1].latestDayOffset).toBe(2);
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
    expect(predicted[0].earliestTime).toBe("10:40");
    expect(predicted[0].latestTime).toBe("10:50");
  });

  it("builds a predicted passing time for any selected route point", () => {
    const predicted = buildPredictedRouteSelection(4.07, 5, "09:00");

    expect(predicted.time).toBe("09:20");
    expect(predicted.dayOffset).toBe(0);
  });

  it("wraps selected route times across midnight", () => {
    const predicted = buildPredictedRouteSelection(20, 15, "23:30");

    expect(predicted.time).toBe("04:30");
    expect(predicted.dayOffset).toBe(1);
  });
});
