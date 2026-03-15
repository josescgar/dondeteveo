import { describe, expect, it } from "vitest";

import type { RaceMeta } from "./schemas";
import { metaSchema } from "./schemas";
import { resolveStartTime } from "./points";

const baseMeta: RaceMeta = {
  name: "Test Race",
  date: "2026-04-01",
  distanceKm: 42.195,
  city: "Test City",
  startTime: "08:00",
  timezone: "Europe/Madrid",
  officialWebsiteUrl: "https://example.com",
  summary: "A test race",
  heroNote: "A hero note",
};

const metaWithWaves: RaceMeta = {
  ...baseMeta,
  waves: [
    { label: "Elite", startTime: "07:45" },
    { label: "Wave 1", startTime: "08:00" },
    { label: "Wave 2", startTime: "08:15" },
  ],
};

describe("resolveStartTime", () => {
  it("returns meta.startTime when no waves defined", () => {
    expect(resolveStartTime(baseMeta)).toBe("08:00");
  });

  it("returns meta.startTime when waves defined but no index provided", () => {
    expect(resolveStartTime(metaWithWaves)).toBe("08:00");
  });

  it("returns wave start time for valid index", () => {
    expect(resolveStartTime(metaWithWaves, 0)).toBe("07:45");
    expect(resolveStartTime(metaWithWaves, 1)).toBe("08:00");
    expect(resolveStartTime(metaWithWaves, 2)).toBe("08:15");
  });

  it("falls back to meta.startTime for out-of-bounds index", () => {
    expect(resolveStartTime(metaWithWaves, -1)).toBe("08:00");
    expect(resolveStartTime(metaWithWaves, 3)).toBe("08:00");
  });
});

describe("metaSchema waves validation", () => {
  it("accepts meta without waves", () => {
    const result = metaSchema.safeParse(baseMeta);
    expect(result.success).toBe(true);
  });

  it("accepts meta with valid waves", () => {
    const result = metaSchema.safeParse(metaWithWaves);
    expect(result.success).toBe(true);
  });

  it("rejects waves with fewer than 2 entries", () => {
    const result = metaSchema.safeParse({
      ...baseMeta,
      waves: [{ label: "Solo", startTime: "08:00" }],
    });
    expect(result.success).toBe(false);
  });

  it("rejects waves with invalid startTime format", () => {
    const result = metaSchema.safeParse({
      ...baseMeta,
      waves: [
        { label: "Wave 1", startTime: "8:00" },
        { label: "Wave 2", startTime: "08:15" },
      ],
    });
    expect(result.success).toBe(false);
  });

  it("rejects waves with empty label", () => {
    const result = metaSchema.safeParse({
      ...baseMeta,
      waves: [
        { label: "", startTime: "08:00" },
        { label: "Wave 2", startTime: "08:15" },
      ],
    });
    expect(result.success).toBe(false);
  });
});
