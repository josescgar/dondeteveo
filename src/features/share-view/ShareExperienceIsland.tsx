import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "preact/hooks";

import { Tooltip } from "../../components/Tooltip";
import type { Locale } from "../../lib/config";
import { formatDistance } from "../../lib/format";
import { getDictionary } from "../../lib/i18n";
import type { RaceEdition } from "../../lib/races/catalog";
import { getPointSummaries } from "../../lib/races/points";
import { parseShareState } from "../../lib/share/share-state";
import RaceMapIsland from "../race-map/RaceMapIsland";
import {
  buildPredictedPoints,
  buildPredictedRouteSelection,
  resolvePaceMinutesPerKm,
} from "./share-view.logic";

type Props = {
  locale: Locale;
  edition: RaceEdition;
};

export default function ShareExperienceIsland({ locale, edition }: Props) {
  const dictionary = getDictionary(locale);
  const [fragment, setFragment] = useState("");
  const [copied, setCopied] = useState(false);
  const [shared, setShared] = useState(false);
  const [canShare, setCanShare] = useState(true);
  const [currentHref, setCurrentHref] = useState("");
  const [selectedPointId, setSelectedPointId] = useState<string | null>(null);
  const [focusedPointRequestNonce, setFocusedPointRequestNonce] = useState(0);
  const mapSectionRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const syncFragment = () => {
      setFragment(window.location.hash);
      setCurrentHref(window.location.href);
    };
    syncFragment();
    window.addEventListener("hashchange", syncFragment);

    return () => window.removeEventListener("hashchange", syncFragment);
  }, []);

  useEffect(() => {
    if (!navigator.share) {
      setCanShare(false);
    }
  }, []);

  useEffect(() => {
    setCopied(false);
  }, [fragment]);

  const getScrollBehavior = () =>
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
      ? "auto"
      : "smooth";

  const handleTimingCardSelect = useCallback((pointId: string) => {
    setSelectedPointId(pointId);
    setFocusedPointRequestNonce((current) => current + 1);
    mapSectionRef.current?.scrollIntoView({
      behavior: getScrollBehavior(),
      block: "start",
      inline: "nearest",
    });
  }, []);

  const handleMapSelectionChange = useCallback(
    (
      selection:
        | {
            kind: "route";
          }
        | {
            kind: "marker";
            id: string;
          }
        | null,
    ) => {
      setSelectedPointId(selection?.kind === "marker" ? selection.id : null);
    },
    [],
  );

  const handleCopy = () => {
    navigator.clipboard.writeText(window.location.href).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const handleShare = () => {
    navigator
      .share({ url: window.location.href })
      .then(() => {
        setShared(true);
        setTimeout(() => setShared(false), 2000);
      })
      .catch(() => {
        // User cancelled the share sheet — ignore silently
      });
  };

  const shareState = useMemo(() => parseShareState(fragment), [fragment]);

  useEffect(() => {
    const nameSlot = document.getElementById("share-h1-name-slot");
    if (!nameSlot) return;

    if (!shareState?.name) {
      nameSlot.textContent = "";
      nameSlot.setAttribute("style", "");
      return;
    }

    nameSlot.textContent =
      locale === "es" ? `a ${shareState.name} ` : `${shareState.name} `;
    nameSlot.setAttribute(
      "style",
      "color: var(--color-accent); opacity: 0; transition: opacity 600ms ease-out;",
    );

    requestAnimationFrame(() => {
      nameSlot.setAttribute(
        "style",
        "color: var(--color-accent); opacity: 1; transition: opacity 600ms ease-out;",
      );
    });
  }, [locale, shareState?.name]);

  const points = useMemo(
    () => getPointSummaries(edition.points),
    [edition.points],
  );
  const paceMinutesPerKm = useMemo(
    () =>
      shareState
        ? resolvePaceMinutesPerKm(shareState, edition.meta.distanceKm)
        : null,
    [edition.meta.distanceKm, shareState],
  );
  const predictedPoints = useMemo(
    () =>
      paceMinutesPerKm
        ? buildPredictedPoints(points, paceMinutesPerKm, edition.meta.startTime)
        : [],
    [edition.meta.startTime, paceMinutesPerKm, points],
  );
  const formatDayOffset = (n: number) => {
    if (n < 0) {
      return `D${n}`;
    }

    return dictionary.dayOffsetLabel.replace("{n}", String(n));
  };
  const formatPointTime = (time: string, dayOffset: number) =>
    dayOffset !== 0 ? `${time} (${formatDayOffset(dayOffset)})` : time;
  const formatSafetyMargin = (point: (typeof predictedPoints)[number]) =>
    dictionary.checkpointSafetyMargin
      .replace("{minutes}", String(point.safetyMarginMinutes))
      .replace("{start}", point.earliestTime)
      .replace("{end}", point.latestTime);
  const formatPredictedRouteTime = useCallback(
    (distanceKm: number) => {
      if (paceMinutesPerKm === null) {
        return null;
      }

      const predicted = buildPredictedRouteSelection(
        distanceKm,
        paceMinutesPerKm,
        edition.meta.startTime,
      );

      return `${formatPointTime(predicted.predictedTime, predicted.dayOffset)} · ${dictionary.checkpointSafetyMargin
        .replace("{minutes}", String(predicted.safetyMarginMinutes))
        .replace("{start}", predicted.earliestTime)
        .replace("{end}", predicted.latestTime)}`;
    },
    [
      dictionary.checkpointSafetyMargin,
      dictionary.dayOffsetLabel,
      edition.meta.startTime,
      paceMinutesPerKm,
    ],
  );
  const pointDetails = useMemo(
    () =>
      Object.fromEntries(
        predictedPoints.map((point) => [
          point.id,
          `${formatPointTime(point.predictedTime, point.dayOffset)} · ${formatSafetyMargin(point)}`,
        ]),
      ),
    [
      dictionary.checkpointSafetyMargin,
      dictionary.dayOffsetLabel,
      predictedPoints,
    ],
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
      {/* Share URL box */}
      <div>
        <div
          class="mb-1 font-mono text-[10px] tracking-[0.3em] uppercase"
          style="color: var(--color-muted);"
        >
          {dictionary.shareLinkTitle}
        </div>
        <div
          class="flex items-center gap-2"
          style="background-color: var(--color-surface-raised); border: 1px solid var(--color-line); padding: 0.5rem 0.75rem;"
        >
          <input
            type="text"
            readOnly
            value={currentHref}
            class="min-w-0 flex-1 overflow-hidden border-none bg-transparent font-mono text-xs text-ellipsis outline-none"
            style="color: var(--color-text);"
          />
          <Tooltip
            text={dictionary.copiedToClipboard}
            visible={copied}
            class="shrink-0"
          >
            <button
              type="button"
              onClick={handleCopy}
              style="color: var(--color-accent); background: none; border: none; cursor: pointer; padding: 0.25rem;"
              aria-label={dictionary.copyLink}
            >
              {copied ? (
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                >
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              ) : (
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                >
                  <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                  <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                </svg>
              )}
            </button>
          </Tooltip>
          {canShare && (
            <Tooltip
              text={dictionary.sharedViaDevice}
              visible={shared}
              class="shrink-0"
            >
              <button
                type="button"
                onClick={handleShare}
                style="color: var(--color-accent); background: none; border: none; cursor: pointer; padding: 0.25rem;"
                aria-label={dictionary.shareLink}
              >
                {shared ? (
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                  >
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                ) : (
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                  >
                    <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
                    <polyline points="16 6 12 2 8 6" />
                    <line x1="12" y1="2" x2="12" y2="15" />
                  </svg>
                )}
              </button>
            </Tooltip>
          )}
        </div>
      </div>

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
        {edition.meta.specialNote && (
          <div
            class="mt-4"
            style="background-color: var(--color-surface-warning); border: 1px solid var(--color-warning-line); padding: 1rem 1.25rem;"
          >
            <div
              class="font-mono text-[10px] tracking-[0.28em] uppercase"
              style="color: var(--color-warning);"
            >
              // {dictionary.importantRaceNote}
            </div>
            <p
              class="mt-3 font-mono text-sm leading-6"
              style="color: var(--color-text);"
            >
              {edition.meta.specialNote}
            </p>
          </div>
        )}
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
            <button
              key={point.id}
              type="button"
              class="timing-card w-full text-left"
              data-predicted-point-card
              data-point-id={point.id}
              data-selected={selectedPointId === point.id ? "true" : "false"}
              aria-pressed={selectedPointId === point.id}
              onClick={() => handleTimingCardSelect(point.id)}
              style={`background-color: var(--color-surface); border: 1px solid ${
                selectedPointId === point.id
                  ? "var(--color-accent)"
                  : "var(--color-line)"
              }; padding: 1.5rem; cursor: pointer; width: 100%;`}
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
                class="mt-4 flex items-baseline gap-2 font-mono leading-none font-medium"
                style={`font-size: clamp(2.8rem, 8vw, 4rem); color: var(--color-coral); letter-spacing: -0.02em;`}
              >
                {point.predictedTime}
                {point.dayOffset > 0 && (
                  <span
                    class="font-mono text-xs font-normal tracking-wide"
                    style="color: var(--color-muted);"
                  >
                    {formatDayOffset(point.dayOffset)}
                  </span>
                )}
              </div>
              <div
                class="mt-3 font-mono text-xs leading-5"
                style="color: var(--color-muted);"
              >
                {formatSafetyMargin(point)}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Map — secondary */}
      <section ref={mapSectionRef} data-share-map-section>
        <RaceMapIsland
          locale={locale}
          route={edition.route}
          points={edition.points}
          raceDistanceKm={edition.meta.distanceKm}
          pointDetails={pointDetails}
          mode="spectator"
          focusedMarkerRequest={
            selectedPointId
              ? {
                  id: selectedPointId,
                  nonce: focusedPointRequestNonce,
                }
              : undefined
          }
          onSelectionChange={handleMapSelectionChange}
          selectionTimeFormatter={formatPredictedRouteTime}
        />
      </section>
    </div>
  );
}
