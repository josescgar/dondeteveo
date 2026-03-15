import type { Locale } from "../config";
import type {
  RaceLocalizations,
  RaceMeta,
  RacePointsCollection,
} from "./schemas";
import type { RaceEdition, RaceSummary } from "./catalog";

const getEditionOverride = (
  localizations: RaceLocalizations | undefined,
  locale: Locale,
) => localizations?.[locale];

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

const localizeWaves = (
  waves: RaceMeta["waves"],
  waveLabels?: string[],
): RaceMeta["waves"] => {
  if (!waves || !waveLabels) return waves;
  return waves.map((wave, i) => ({
    ...wave,
    label: waveLabels[i] ?? wave.label,
  }));
};

export const localizeRaceEdition = (
  edition: RaceEdition,
  locale: Locale,
): RaceEdition => {
  const override = getEditionOverride(edition.localizations, locale);

  if (!override) {
    return edition;
  }

  return {
    ...edition,
    meta: {
      ...edition.meta,
      ...override.meta,
      waves: localizeWaves(edition.meta.waves, override.waveLabels),
    },
    points: localizePoints(edition.points, override.pointLabels),
  };
};

export const localizeRaceSummary = (
  summary: RaceSummary,
  locale: Locale,
): RaceSummary => {
  const override = getEditionOverride(summary.localizations, locale);

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
