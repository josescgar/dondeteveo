import "leaflet/dist/leaflet.css";

import { useEffect, useMemo, useRef, useState } from "preact/hooks";

import type { Locale } from "../../lib/config";
import { MAP_ATTRIBUTION, MAP_TILE_URL } from "../../lib/config";
import { getDictionary } from "../../lib/i18n";
import type {
  RacePointsCollection,
  RaceRouteCollection,
} from "../../lib/races/schemas";
import {
  getMapMarkers,
  getRouteCoordinates,
  getRouteSelection,
  type RouteSelection,
} from "./race-map.logic";

type MapMode = "static" | "distance-only" | "spectator";

type Props = {
  locale: Locale;
  route: RaceRouteCollection;
  points: RacePointsCollection;
  raceDistanceKm: number;
  pointDetails?: Record<string, string>;
  mode?: MapMode;
  selectionTimeFormatter?: (distanceKm: number) => string | null;
};

const formatExactDistance = (distanceKm: number, locale: Locale): string =>
  `${new Intl.NumberFormat(locale === "en" ? "en-GB" : "es-ES", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(distanceKm)} km`;

export default function RaceMapIsland({
  locale,
  route,
  points,
  raceDistanceKm,
  pointDetails,
  mode = "static",
  selectionTimeFormatter,
}: Props) {
  const dictionary = useMemo(() => getDictionary(locale), [locale]);
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<import("leaflet").Map | null>(null);
  const leafletRef = useRef<typeof import("leaflet") | null>(null);
  const selectionLayerRef = useRef<import("leaflet").LayerGroup | null>(null);
  const [selection, setSelection] = useState<RouteSelection | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [canFullscreen, setCanFullscreen] = useState(false);

  useEffect(() => {
    let mounted = true;

    const syncFullscreenState = () => {
      const active = document.fullscreenElement === wrapperRef.current;
      setIsFullscreen(active);
      requestAnimationFrame(() => {
        mapRef.current?.invalidateSize();
      });
    };

    const mountMap = async () => {
      const leaflet = await import("leaflet");

      if (!mounted || !containerRef.current) {
        return;
      }

      leafletRef.current = leaflet;
      mapRef.current = leaflet.map(containerRef.current, {
        scrollWheelZoom: false,
      });

      setCanFullscreen(Boolean(wrapperRef.current?.requestFullscreen));

      leaflet
        .tileLayer(MAP_TILE_URL, {
          attribution: MAP_ATTRIBUTION,
        })
        .addTo(mapRef.current);

      const routeCoordinates = getRouteCoordinates(route);
      const polyline = leaflet
        .polyline(routeCoordinates, {
          className: "dtv-route-line",
          color: "#f26419",
          interactive: false,
          weight: 5,
        })
        .addTo(mapRef.current);
      const hitArea = leaflet
        .polyline(routeCoordinates, {
          className: "dtv-route-hit-area",
          color: "#f26419",
          opacity: 0,
          weight: 18,
        })
        .addTo(mapRef.current);

      const applySelection = (lat: number, lng: number) => {
        setSelection(
          getRouteSelection(route, [lng, lat], raceDistanceKm) ?? null,
        );
      };

      hitArea.on("click", (event: { latlng: { lat: number; lng: number } }) => {
        applySelection(event.latlng.lat, event.latlng.lng);
      });

      mapRef.current.on(
        "click",
        (event: { latlng: { lat: number; lng: number } }) => {
          applySelection(event.latlng.lat, event.latlng.lng);
        },
      );

      const markers = getMapMarkers(points, pointDetails);
      markers.forEach((marker) => {
        const circle = leaflet.circleMarker(marker.coordinates, {
          radius: marker.kind === "cheer-point" ? 8 : 5,
          color: marker.kind === "cheer-point" ? "#1e6fa0" : "#f26419",
          fillColor: marker.kind === "cheer-point" ? "#f26419" : "#ffffff",
          fillOpacity: 1,
          weight: 2,
        });

        const popupContent = document.createElement("div");
        const label = document.createElement("div");
        label.textContent = marker.label;
        popupContent.append(label);

        if (marker.detail) {
          const detail = document.createElement("div");
          detail.textContent = marker.detail;
          popupContent.append(detail);
        }

        circle.bindPopup(popupContent);
        circle.addTo(mapRef.current!);
      });

      selectionLayerRef.current = leaflet.layerGroup().addTo(mapRef.current);
      mapRef.current.fitBounds(polyline.getBounds(), { padding: [24, 24] });
    };

    document.addEventListener("fullscreenchange", syncFullscreenState);
    mountMap();

    return () => {
      mounted = false;
      document.removeEventListener("fullscreenchange", syncFullscreenState);
      selectionLayerRef.current?.remove();
      selectionLayerRef.current = null;
      mapRef.current?.remove();
      mapRef.current = null;
      leafletRef.current = null;
    };
  }, [pointDetails, points, raceDistanceKm, route]);

  useEffect(() => {
    const leaflet = leafletRef.current;
    const layerGroup = selectionLayerRef.current;

    if (!leaflet || !layerGroup) {
      return;
    }

    layerGroup.clearLayers();

    if (!selection) {
      return;
    }

    leaflet
      .circleMarker(selection.coordinates, {
        className: "dtv-route-selection-halo",
        color: "#1e6fa0",
        fillColor: "#1e6fa0",
        fillOpacity: 0.18,
        radius: 16,
        weight: 2,
      })
      .addTo(layerGroup);

    leaflet
      .circleMarker(selection.coordinates, {
        className: "dtv-route-selection-marker",
        color: "#ffffff",
        fillColor: "#1e6fa0",
        fillOpacity: 1,
        radius: 7,
        weight: 3,
      })
      .addTo(layerGroup);
  }, [selection]);

  const handleDismissSelection = () => {
    setSelection(null);
  };

  const handleToggleFullscreen = async () => {
    if (!wrapperRef.current) {
      return;
    }

    if (document.fullscreenElement === wrapperRef.current) {
      await document.exitFullscreen();
      return;
    }

    await wrapperRef.current.requestFullscreen?.();
  };

  const predictedPassingTime =
    mode === "spectator" && selection
      ? (selectionTimeFormatter?.(selection.distanceKm) ?? null)
      : null;

  return (
    <div
      ref={wrapperRef}
      class="relative overflow-hidden"
      style="border: 1px solid var(--color-line); background-color: var(--color-surface);"
    >
      {mode === "spectator" && canFullscreen && (
        <button
          type="button"
          data-map-fullscreen-toggle
          onClick={handleToggleFullscreen}
          class="absolute top-3 right-3 z-[500] px-3 py-2 font-mono text-[10px] tracking-[0.2em] uppercase"
          style="background-color: var(--color-surface-raised); color: var(--color-text); border: 1px solid var(--color-line); cursor: pointer;"
          aria-label={
            isFullscreen
              ? dictionary.exitFullscreenMap
              : dictionary.enterFullscreenMap
          }
        >
          {isFullscreen
            ? dictionary.exitFullscreenMap
            : dictionary.enterFullscreenMap}
        </button>
      )}
      <div
        ref={containerRef}
        data-race-map
        data-map-mode={mode}
        class="w-full overflow-hidden"
        style={isFullscreen ? "height: 100%;" : "height: 24rem;"}
      />
      {mode !== "static" && selection && (
        <div
          data-route-selection-panel
          class="absolute right-3 bottom-3 left-3 z-[500] max-w-md p-4 sm:left-auto"
          style="background-color: var(--color-surface-raised); border: 1px solid var(--color-line); box-shadow: 0 18px 45px rgba(15, 23, 42, 0.18);"
        >
          <div class="flex items-start justify-between gap-4">
            <div>
              <div
                class="font-mono text-[10px] tracking-[0.24em] uppercase"
                style="color: var(--color-muted);"
              >
                {dictionary.selectedRoutePoint}
              </div>
              <div
                data-route-selection-distance
                class="font-display mt-2 text-2xl font-bold uppercase"
                style="color: var(--color-text);"
              >
                {formatExactDistance(selection.distanceKm, locale)}
              </div>
            </div>
            <button
              type="button"
              data-route-selection-dismiss
              onClick={handleDismissSelection}
              class="shrink-0 px-2 py-1 font-mono text-sm uppercase"
              style="background: none; color: var(--color-muted); border: 1px solid var(--color-line); cursor: pointer;"
              aria-label={dictionary.dismissRoutePoint}
            >
              X
            </button>
          </div>
          {mode === "spectator" && predictedPassingTime && (
            <div
              class="mt-4 font-mono text-sm"
              style="color: var(--color-text);"
            >
              <span style="color: var(--color-muted);">
                {dictionary.predictedPassingTime}:
              </span>{" "}
              <span data-route-selection-time>{predictedPassingTime}</span>
            </div>
          )}
          {mode === "spectator" && selection.streetName && (
            <div
              class="mt-2 font-mono text-sm"
              style="color: var(--color-text);"
            >
              <span style="color: var(--color-muted);">
                {dictionary.streetLabel}:
              </span>{" "}
              <span data-route-selection-street>{selection.streetName}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
