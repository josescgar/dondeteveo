import { describe, expect, it } from "vitest";

import { getProvisionalFacts } from "./provisional";
import { metaSchema } from "./schemas";

const baseMeta = {
  name: "Example 10K",
  date: "2027-03-14",
  distanceKm: 10,
  city: "Seville",
  startTime: "09:00",
  timezone: "Europe/Madrid",
  officialWebsiteUrl: "https://example.com/",
  summary: "Example summary.",
  heroNote: "Example hero note.",
};

describe("meta provisional field", () => {
  it("keeps editions without the field unchanged", () => {
    const meta = metaSchema.parse(baseMeta);

    expect(meta).toEqual(baseMeta);
    expect(meta.provisional).toBeUndefined();
  });

  it("accepts route and start time flags independently", () => {
    expect(
      metaSchema.parse({ ...baseMeta, provisional: { route: true } })
        .provisional,
    ).toEqual({ route: true });
    expect(
      metaSchema.parse({ ...baseMeta, provisional: { startTime: true } })
        .provisional,
    ).toEqual({ startTime: true });
    expect(
      metaSchema.parse({
        ...baseMeta,
        provisional: { route: false, startTime: true },
      }).provisional,
    ).toEqual({ route: false, startTime: true });
  });

  it("rejects unknown provisional keys and non-boolean flags", () => {
    expect(
      metaSchema.safeParse({ ...baseMeta, provisional: { date: true } })
        .success,
    ).toBe(false);
    expect(
      metaSchema.safeParse({ ...baseMeta, provisional: { route: "yes" } })
        .success,
    ).toBe(false);
  });
});

describe("getProvisionalFacts", () => {
  it("returns nothing for confirmed editions", () => {
    expect(getProvisionalFacts(undefined)).toEqual([]);
    expect(getProvisionalFacts({})).toEqual([]);
    expect(getProvisionalFacts({ route: false, startTime: false })).toEqual([]);
  });

  it("returns provisional facts in display order", () => {
    expect(getProvisionalFacts({ startTime: true, route: true })).toEqual([
      "route",
      "startTime",
    ]);
    expect(getProvisionalFacts({ route: false, startTime: true })).toEqual([
      "startTime",
    ]);
    expect(getProvisionalFacts({ route: true })).toEqual(["route"]);
  });
});
