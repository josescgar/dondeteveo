import { describe, expect, it } from "vitest";

import { localizeRaceSummary } from "./localized";

describe("localized race content", () => {
  it("returns Spanish overrides for the Triana 10K", () => {
    const summary = localizeRaceSummary(
      {
        countryCode: "es",
        raceSlug: "carrera-triana-los-remedios-10k",
        year: "2026",
        upcoming: true,
        meta: {
          name: 'Triana - Los Remedios 10K "Torre Sevilla"',
          date: "2026-03-15",
          distanceKm: 10,
          city: "Seville",
          startTime: "09:00",
          timezone: "Europe/Madrid",
          officialWebsiteUrl:
            "https://imd.sevilla.org/programas-deportivos/circuito-carreras-sevilla10/calendario-del-circuito/carrera-popular-triana",
          summary: "Urban 10K across La Cartuja, Triana, and Los Remedios.",
          heroNote: "A spectator-friendly course.",
        },
      },
      "es",
    );

    expect(summary.meta.name).toBe(
      'Carrera Triana - Los Remedios "Torre Sevilla" 10K',
    );
    expect(summary.meta.city).toBe("Sevilla");
    expect(summary.meta.summary).toContain("Triana");
    expect(summary.meta.specialNote).toBeUndefined();
  });

  it("returns the localized special note for the Triana 5K", () => {
    const summary = localizeRaceSummary(
      {
        countryCode: "es",
        raceSlug: "carrera-triana-los-remedios-5k",
        year: "2026",
        upcoming: true,
        meta: {
          name: 'Triana - Los Remedios 5K "Torre Sevilla"',
          date: "2026-03-15",
          distanceKm: 5,
          city: "Seville",
          startTime: "09:30",
          timezone: "Europe/Madrid",
          officialWebsiteUrl:
            "https://imd.sevilla.org/programas-deportivos/circuito-carreras-sevilla10/calendario-del-circuito/carrera-popular-triana",
          summary:
            "Compact 5K sharing the closing half of the Triana - Los Remedios event.",
          heroNote: "A spectator-friendly course.",
          specialNote:
            "The listed start time is approximate. This 5K starts when the 10K race reaches the 5K mark.",
        },
      },
      "es",
    );

    expect(summary.meta.specialNote).toContain("La hora de salida indicada");
  });
});
