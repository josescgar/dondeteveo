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
      <div style="background-color: var(--color-surface); border: 1px solid var(--color-line); padding: 1.5rem;">
        <div
          class="font-mono text-[10px] tracking-[0.3em] uppercase"
          style="color: var(--color-muted);"
        >
          {dictionary.spectatorReady}
        </div>
        <h2
          class="font-display mt-2 text-4xl font-bold uppercase"
          style="color: var(--color-text);"
        >
          {dictionary.sharePageTitle}
        </h2>
        <p
          class="mt-3 max-w-2xl font-mono text-base leading-7"
          style="color: var(--color-muted);"
        >
          {dictionary.invalidShareState}
        </p>
      </div>
    );
  }

  return (
    <div class="space-y-8">
      {/* Runner header band */}
      <div style="background-color: var(--color-surface); border: 1px solid var(--color-line); padding: 1.25rem 1.5rem;">
        <h2
          class="font-display text-4xl font-bold uppercase"
          style="color: var(--color-text);"
        >
          {edition.meta.name}{" "}
          <span style="color: var(--color-accent);">· {edition.year}</span>
        </h2>
        {shareState.name && (
          <div
            class="mt-3 inline-block px-4 py-1.5 font-mono text-xs tracking-[0.2em] uppercase"
            style="background-color: var(--color-surface-raised); color: var(--color-accent); border: 1px solid var(--color-line);"
          >
            {dictionary.runnerLabel}: {shareState.name}
          </div>
        )}
        <div class="mt-3 font-mono text-sm" style="color: var(--color-muted);">
          <span style="color: var(--color-text);">{dictionary.startTime}:</span>{" "}
          {edition.meta.startTime}
          <span class="ml-2">({edition.meta.timezone})</span>
        </div>
      </div>

      {/* Timing cards — hero */}
      <div>
        <div
          class="mb-1 font-mono text-[10px] tracking-[0.3em] uppercase"
          style="color: var(--color-muted);"
        >
          {dictionary.predictedTimes}
        </div>
        <p
          class="mb-4 font-mono text-xs leading-6"
          style="color: var(--color-muted);"
        >
          {dictionary.allTimesRaceLocal}
        </p>
        <div class="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {predictedPoints.map((point) => (
            <article
              class="timing-card"
              style="background-color: var(--color-surface); border: 1px solid var(--color-line); padding: 1.5rem;"
            >
              <div
                class="font-mono text-[9px] tracking-[0.32em] uppercase"
                style="color: var(--color-muted);"
              >
                {point.kind === "split"
                  ? dictionary.splitLabel
                  : dictionary.cheerPointLabel}
              </div>
              <h4
                class="font-display mt-1 text-xl leading-tight font-bold uppercase"
                style="color: var(--color-text);"
              >
                {point.label}
              </h4>
              <div
                class="mt-1 font-mono text-xs"
                style="color: var(--color-muted);"
              >
                {formatDistance(point.distanceKm, locale)}
              </div>
              <div
                class="mt-4 font-mono leading-none font-medium"
                style={`font-size: clamp(2.8rem, 8vw, 4rem); color: var(--color-coral); letter-spacing: -0.02em;`}
              >
                {point.predictedTime}
              </div>
            </article>
          ))}
        </div>
      </div>

      {/* Map — secondary */}
      <RaceMapIsland
        route={edition.route}
        points={edition.points}
        pointDetails={pointDetails}
      />
    </div>
  );
}
