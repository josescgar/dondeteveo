import { describe, expect, it } from "vitest";

import { localizeRaceEdition, localizeRaceSummary } from "./localized";
import type { RaceEdition, RaceSummary } from "./catalog";

const baseMeta10k = {
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
} as const;

const localizations10k = {
  es: {
    meta: {
      name: 'Carrera Triana - Los Remedios "Torre Sevilla" 10K',
      city: "Sevilla",
      summary:
        "10K urbano por La Cartuja, Triana y Los Remedios, con regreso junto al rio hasta la zona de Torre Sevilla.",
      heroNote:
        "El recorrido vuelve por varios puntos muy comodos para animar, con buenas opciones alrededor de Plaza de Cuba, Calle Betis y la ribera de Triana.",
    },
    pointLabels: {
      start: "Salida - Camino de los Descubrimientos",
      finish: "Meta - Torre Sevilla",
    },
  },
};

const localizations5k = {
  es: {
    meta: {
      name: 'Carrera Triana - Los Remedios "Torre Sevilla" 5K',
      city: "Sevilla",
      summary:
        "5K compacto que comparte la segunda mitad del recorrido Triana - Los Remedios, desde Blas Infante hasta Torre Sevilla.",
      heroNote:
        "Se puede seguir bien desde Plaza de Cuba, Calle Betis y el tramo final junto al rio sin alejarse del corazon del recorrido.",
      specialNote:
        "La hora de salida indicada es orientativa. Esta 5K empieza cuando la carrera de 10K pasa por el punto de 5K, asi que la salida exacta puede variar ligeramente el dia de la prueba.",
    },
    pointLabels: {
      start: "Salida - Avenida Alfredo Kraus",
      finish: "Meta - Torre Sevilla",
    },
  },
};

describe("localizeRaceSummary", () => {
  it("returns Spanish overrides for the Triana 10K", () => {
    const summary = localizeRaceSummary(
      {
        countryCode: "es",
        raceSlug: "carrera-triana-los-remedios-10k",
        year: "2026",
        upcoming: true,
        meta: baseMeta10k,
        localizations: localizations10k,
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
        localizations: localizations5k,
      },
      "es",
    );

    expect(summary.meta.specialNote).toContain("La hora de salida indicada");
  });

  it("returns base data when no localizations are present", () => {
    const summary: RaceSummary = {
      countryCode: "es",
      raceSlug: "carrera-triana-los-remedios-10k",
      year: "2026",
      upcoming: true,
      meta: baseMeta10k,
    };

    const result = localizeRaceSummary(summary, "es");
    expect(result).toBe(summary);
  });

  it("returns base data when locale is not in localizations", () => {
    const summary: RaceSummary = {
      countryCode: "es",
      raceSlug: "carrera-triana-los-remedios-10k",
      year: "2026",
      upcoming: true,
      meta: baseMeta10k,
      localizations: localizations10k,
    };

    const result = localizeRaceSummary(summary, "en");
    expect(result).toBe(summary);
  });
});

describe("localizeRaceEdition", () => {
  const baseEdition: RaceEdition = {
    countryCode: "es",
    raceSlug: "carrera-triana-los-remedios-10k",
    year: "2026",
    meta: baseMeta10k,
    source: {
      officialSourceName: "Test",
      officialSourceUrl: "https://example.com",
      routeSourceType: "manual-trace",
      notes: "Test notes",
    },
    route: {
      type: "FeatureCollection",
      features: [
        {
          type: "Feature",
          properties: {},
          geometry: {
            type: "LineString",
            coordinates: [
              [-6.0, 37.38],
              [-6.01, 37.39],
            ],
          },
        },
      ],
    },
    points: {
      type: "FeatureCollection",
      features: [
        {
          type: "Feature",
          properties: {
            id: "start",
            label: "Start",
            kind: "split",
            distanceKm: 0,
          },
          geometry: { type: "Point", coordinates: [-6.0, 37.38] },
        },
        {
          type: "Feature",
          properties: {
            id: "finish",
            label: "Finish",
            kind: "split",
            distanceKm: 10,
          },
          geometry: { type: "Point", coordinates: [-6.01, 37.39] },
        },
      ],
    },
    localizations: localizations10k,
  };

  it("localizes meta and point labels for Spanish locale", () => {
    const result = localizeRaceEdition(baseEdition, "es");

    expect(result.meta.name).toBe(
      'Carrera Triana - Los Remedios "Torre Sevilla" 10K',
    );
    expect(result.meta.city).toBe("Sevilla");
    expect(result.points.features[0].properties.label).toBe(
      "Salida - Camino de los Descubrimientos",
    );
    expect(result.points.features[1].properties.label).toBe(
      "Meta - Torre Sevilla",
    );
  });

  it("returns base edition when no localizations are present", () => {
    const editionWithoutLocalizations = {
      ...baseEdition,
      localizations: undefined,
    };
    const result = localizeRaceEdition(editionWithoutLocalizations, "es");
    expect(result).toBe(editionWithoutLocalizations);
  });

  it("localizes wave labels when waveLabels override is present", () => {
    const editionWithWaves: RaceEdition = {
      ...baseEdition,
      meta: {
        ...baseEdition.meta,
        waves: [
          { label: "Wave 1 (sub 1:30)", startTime: "08:15" },
          { label: "Wave 2 (sub 1:45)", startTime: "08:20" },
        ],
      },
      localizations: {
        es: {
          waveLabels: ["Cajón 1 (sub 1:30)", "Cajón 2 (sub 1:45)"],
        },
      },
    };

    const result = localizeRaceEdition(editionWithWaves, "es");
    expect(result.meta.waves).toEqual([
      { label: "Cajón 1 (sub 1:30)", startTime: "08:15" },
      { label: "Cajón 2 (sub 1:45)", startTime: "08:20" },
    ]);
  });

  it("keeps base wave labels when no waveLabels override is present", () => {
    const waves = [
      { label: "Wave 1", startTime: "08:15" },
      { label: "Wave 2", startTime: "08:20" },
    ] as const;
    const editionWithWaves: RaceEdition = {
      ...baseEdition,
      meta: { ...baseEdition.meta, waves: [...waves] },
      localizations: {
        es: {
          meta: { name: "Nombre" },
        },
      },
    };

    const result = localizeRaceEdition(editionWithWaves, "es");
    expect(result.meta.waves).toEqual([...waves]);
  });

  it("keeps base label when point ID has no localized label", () => {
    const editionWithPartialLabels: RaceEdition = {
      ...baseEdition,
      localizations: {
        es: {
          pointLabels: { start: "Salida" },
        },
      },
    };

    const result = localizeRaceEdition(editionWithPartialLabels, "es");
    expect(result.points.features[0].properties.label).toBe("Salida");
    expect(result.points.features[1].properties.label).toBe("Finish");
  });
});
