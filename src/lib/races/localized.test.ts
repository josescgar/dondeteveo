import { describe, expect, it } from "vitest";

import { localizeRaceSummary } from "./localized";

describe("localized race content", () => {
  it("returns Spanish overrides for the sample race", () => {
    const summary = localizeRaceSummary(
      {
        countryCode: "es",
        raceSlug: "sevilla-half-marathon",
        year: "2026",
        upcoming: true,
        meta: {
          name: "Zurich Seville Half Marathon",
          date: "2026-01-25",
          distanceKm: 21.0975,
          city: "Seville",
          startTime: "09:00",
          timezone: "Europe/Madrid",
          officialWebsiteUrl:
            "https://www.zurichmaratonsevilla.es/media-maraton/",
          summary: "Fast winter half marathon in the center of Seville.",
          heroNote: "A spectator-friendly course.",
        },
      },
      "es",
    );

    expect(summary.meta.name).toBe("Zurich Media Maraton de Sevilla");
    expect(summary.meta.city).toBe("Sevilla");
    expect(summary.meta.summary).toContain("Sevilla");
  });
});
