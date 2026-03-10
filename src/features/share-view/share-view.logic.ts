import type { RacePointFeature } from "../../lib/races/schemas";
import {
  dayOffsetFromMinutes,
  formatMinutesAsClock,
  parseFinishTimeToMinutes,
  parsePaceToMinutesPerKm,
  type ShareState,
} from "../../lib/share/share-state";

export type PredictedPoint = {
  id: string;
  label: string;
  kind: "split" | "cheer-point";
  distanceKm: number;
  predictedTime: string;
  dayOffset: number;
  safetyMarginMinutes: number;
  earliestTime: string;
  earliestDayOffset: number;
  latestTime: string;
  latestDayOffset: number;
};

export type PredictedRouteSelection = {
  predictedTime: string;
  dayOffset: number;
  safetyMarginMinutes: number;
  earliestTime: string;
  earliestDayOffset: number;
  latestTime: string;
  latestDayOffset: number;
};

export const CHECKPOINT_SAFETY_MARGIN_MINUTES = 5;

export const resolvePaceMinutesPerKm = (
  state: ShareState,
  raceDistanceKm: number,
): number | null => {
  if (state.mode === "pace") {
    return parsePaceToMinutesPerKm(state.value);
  }

  const finishMinutes = parseFinishTimeToMinutes(state.value);
  if (finishMinutes === null) {
    return null;
  }

  return finishMinutes / raceDistanceKm;
};

const startClockMinutes = (startTime: string): number => {
  const [hours, minutes] = startTime.split(":").map(Number);
  return hours * 60 + minutes;
};

const buildClockPrediction = (clockMinutes: number) => ({
  time: formatMinutesAsClock(clockMinutes),
  dayOffset: dayOffsetFromMinutes(clockMinutes),
});

export const buildPredictedRouteSelection = (
  distanceKm: number,
  paceMinutesPerKm: number,
  raceStartTime: string,
): PredictedRouteSelection => {
  const clockMinutes =
    startClockMinutes(raceStartTime) + distanceKm * paceMinutesPerKm;
  const predictedClock = buildClockPrediction(clockMinutes);
  const earliestClock = buildClockPrediction(
    clockMinutes - CHECKPOINT_SAFETY_MARGIN_MINUTES,
  );
  const latestClock = buildClockPrediction(
    clockMinutes + CHECKPOINT_SAFETY_MARGIN_MINUTES,
  );

  return {
    predictedTime: predictedClock.time,
    dayOffset: predictedClock.dayOffset,
    safetyMarginMinutes: CHECKPOINT_SAFETY_MARGIN_MINUTES,
    earliestTime: earliestClock.time,
    earliestDayOffset: earliestClock.dayOffset,
    latestTime: latestClock.time,
    latestDayOffset: latestClock.dayOffset,
  };
};

export const buildPredictedPoints = (
  points: RacePointFeature[],
  paceMinutesPerKm: number,
  raceStartTime: string,
): PredictedPoint[] => {
  return points.map((point) => {
    const predictedClock = buildPredictedRouteSelection(
      point.properties.distanceKm,
      paceMinutesPerKm,
      raceStartTime,
    );

    return {
      id: point.properties.id,
      label: point.properties.label,
      kind: point.properties.kind,
      distanceKm: point.properties.distanceKm,
      predictedTime: predictedClock.predictedTime,
      dayOffset: predictedClock.dayOffset,
      safetyMarginMinutes: predictedClock.safetyMarginMinutes,
      earliestTime: predictedClock.earliestTime,
      earliestDayOffset: predictedClock.earliestDayOffset,
      latestTime: predictedClock.latestTime,
      latestDayOffset: predictedClock.latestDayOffset,
    };
  });
};
