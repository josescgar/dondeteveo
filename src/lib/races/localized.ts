import type { Locale } from "../config";
import type { RaceMeta, RacePointsCollection } from "./schemas";
import type { RaceEdition, RaceSummary } from "./catalog";

type LocalizedEditionOverride = {
  meta?: Partial<RaceMeta>;
  pointLabels?: Record<string, string>;
};

const LOCALIZED_EDITIONS: Record<
  string,
  Partial<Record<Locale, LocalizedEditionOverride>>
> = {
  "sevilla-half-marathon/2026": {
    es: {
      meta: {
        name: "Zurich Media Maraton de Sevilla",
        city: "Sevilla",
        summary:
          "Media maraton invernal y rapida por el centro de Sevilla, con avenidas amplias y un recorrido favorable para llevar ritmo constante.",
        heroNote:
          "Un recorrido comodo para espectadores, con varios puntos centricos para animar durante la carrera.",
      },
      pointLabels: {
        start: "Salida",
        "km-5": "Punto 5K",
        "cheer-plaza-nueva": "Punto para animar: Plaza Nueva",
        "km-10": "Punto 10K",
        "cheer-maria-luisa": "Punto para animar: Parque de Maria Luisa",
        "km-15": "Punto 15K",
        "cheer-alameda": "Punto para animar: Alameda",
        finish: "Meta",
      },
    },
  },
};

const getEditionOverride = (
  raceSlug: string,
  year: string,
  locale: Locale,
): LocalizedEditionOverride | undefined =>
  LOCALIZED_EDITIONS[`${raceSlug}/${year}`]?.[locale];

const localizePoints = (
  points: RacePointsCollection,
  pointLabels?: Record<string, string>,
): RacePointsCollection => {
  if (!pointLabels) {
    return points;
  }

  return {
    ...points,
    features: points.features.map((feature) => ({
      ...feature,
      properties: {
        ...feature.properties,
        label: pointLabels[feature.properties.id] ?? feature.properties.label,
      },
    })),
  };
};

export const localizeRaceEdition = (
  edition: RaceEdition,
  locale: Locale,
): RaceEdition => {
  const override = getEditionOverride(edition.raceSlug, edition.year, locale);

  if (!override) {
    return edition;
  }

  return {
    ...edition,
    meta: {
      ...edition.meta,
      ...override.meta,
    },
    points: localizePoints(edition.points, override.pointLabels),
  };
};

export const localizeRaceSummary = (
  summary: RaceSummary,
  locale: Locale,
): RaceSummary => {
  const override = getEditionOverride(summary.raceSlug, summary.year, locale);

  if (!override?.meta) {
    return summary;
  }

  return {
    ...summary,
    meta: {
      ...summary.meta,
      ...override.meta,
    },
  };
};
