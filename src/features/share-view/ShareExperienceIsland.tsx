import { useEffect, useMemo, useState } from "preact/hooks";

import type { Locale } from "../../lib/config";
import { formatDistance } from "../../lib/format";
import { getDictionary } from "../../lib/i18n";
import type { RaceEdition } from "../../lib/races/catalog";
import { getPointSummaries } from "../../lib/races/points";
import { parseShareState } from "../../lib/share/share-state";
import RaceMapIsland from "../race-map/RaceMapIsland";
import {
  buildPredictedPoints,
  resolvePaceMinutesPerKm,
} from "./share-view.logic";

type Props = {
  locale: Locale;
  edition: RaceEdition;
};

export default function ShareExperienceIsland({ locale, edition }: Props) {
  const dictionary = getDictionary(locale);
  const [fragment, setFragment] = useState("");

  useEffect(() => {
    const syncFragment = () => setFragment(window.location.hash);
    syncFragment();
    window.addEventListener("hashchange", syncFragment);

    return () => window.removeEventListener("hashchange", syncFragment);
  }, []);

  const shareState = useMemo(() => parseShareState(fragment), [fragment]);
  const points = getPointSummaries(edition.points);
  const paceMinutesPerKm = shareState
    ? resolvePaceMinutesPerKm(shareState, edition.meta.distanceKm)
    : null;
  const predictedPoints = paceMinutesPerKm
    ? buildPredictedPoints(points, paceMinutesPerKm, edition.meta.startTime)
    : [];
  const pointDetails = Object.fromEntries(
    predictedPoints.map((point) => [point.id, point.predictedTime]),
  );

  if (!shareState || paceMinutesPerKm === null) {
    return (
      <div class="rounded-[1.8rem] border border-[var(--line)] bg-white/90 p-6 shadow-[var(--shadow-card)]">
        <h2 class="font-display text-3xl text-[var(--ink)]">
          {dictionary.sharePageTitle}
        </h2>
        <p class="mt-3 max-w-2xl text-base leading-7 text-[var(--muted)]">
          {dictionary.invalidShareState}
        </p>
      </div>
    );
  }

  return (
    <div class="space-y-6">
      <div class="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <RaceMapIsland
          route={edition.route}
          points={edition.points}
          pointDetails={pointDetails}
        />
        <div class="rounded-[1.8rem] border border-[var(--line)] bg-white/90 p-6 shadow-[var(--shadow-card)]">
          <div class="text-xs font-semibold tracking-[0.22em] text-[var(--muted)] uppercase">
            {dictionary.spectatorReady}
          </div>
          <h2 class="font-display mt-2 text-3xl text-[var(--ink)]">
            {edition.meta.name}
          </h2>
          <p class="mt-3 text-sm leading-7 text-[var(--muted)]">
            {dictionary.allTimesRaceLocal}
          </p>
          <div class="mt-5 rounded-[1.4rem] bg-[var(--cream)] p-4 text-sm leading-7 text-[var(--muted)]">
            <div>
              <strong class="text-[var(--ink)]">
                {dictionary.localTimeLabel}:
              </strong>{" "}
              {edition.meta.timezone}
            </div>
            <div>
              <strong class="text-[var(--ink)]">{dictionary.startTime}:</strong>{" "}
              {edition.meta.startTime}
            </div>
            {shareState.name && (
              <div>
                <strong class="text-[var(--ink)]">
                  {dictionary.runnerLabel}:
                </strong>{" "}
                {shareState.name}
              </div>
            )}
          </div>
        </div>
      </div>

      <div class="rounded-[1.8rem] border border-[var(--line)] bg-white/90 p-6 shadow-[var(--shadow-card)]">
        <h3 class="font-display text-3xl text-[var(--ink)]">
          {dictionary.predictedTimes}
        </h3>
        <p class="mt-2 text-sm leading-7 text-[var(--muted)]">
          {dictionary.allTimesRaceLocal}
        </p>
        <div class="mt-6 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {predictedPoints.map((point) => (
            <article class="rounded-[1.5rem] border border-[var(--line)] bg-[var(--cream)] p-4">
              <div class="text-xs font-semibold tracking-[0.22em] text-[var(--muted)] uppercase">
                {point.kind === "split"
                  ? dictionary.splitLabel
                  : dictionary.cheerPointLabel}
              </div>
              <h4 class="mt-2 text-lg font-semibold text-[var(--ink)]">
                {point.label}
              </h4>
              <div class="mt-2 text-sm text-[var(--muted)]">
                {formatDistance(point.distanceKm, locale)}
              </div>
              <div class="font-display mt-4 text-3xl text-[var(--ember)]">
                {point.predictedTime}
              </div>
            </article>
          ))}
        </div>
      </div>
    </div>
  );
}
