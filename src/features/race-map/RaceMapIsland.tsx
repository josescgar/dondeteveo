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
  type RaceMapMarker,
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
  focusedMarkerRequest?: {
    id: string;
    nonce: number;
  };
  onSelectionChange?: (
    selection:
      | {
          kind: "route";
        }
      | {
          kind: "marker";
          id: string;
        }
      | null,
  ) => void;
  selectionTimeFormatter?: (distanceKm: number) => string | null;
};

type MapPanelState =
  | {
      kind: "route";
      selection: RouteSelection;
    }
  | {
      kind: "marker";
      marker: RaceMapMarker;
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
  focusedMarkerRequest,
  onSelectionChange,
  selectionTimeFormatter,
}: Props) {
  const dictionary = useMemo(() => getDictionary(locale), [locale]);
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<import("leaflet").Map | null>(null);
  const leafletRef = useRef<typeof import("leaflet") | null>(null);
  const selectionLayerRef = useRef<import("leaflet").LayerGroup | null>(null);
  const markerLayerByIdRef = useRef(
    new Map<string, import("leaflet").CircleMarker>(),
  );
  const markerByIdRef = useRef(new Map<string, RaceMapMarker>());
  const [panelState, setPanelState] = useState<MapPanelState | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [canFullscreen, setCanFullscreen] = useState(false);
  const [isMapReady, setIsMapReady] = useState(false);

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
        const selection = getRouteSelection(route, [lng, lat], raceDistanceKm);
        setPanelState(selection ? { kind: "route", selection } : null);
        onSelectionChange?.(selection ? { kind: "route" } : null);
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
      markerLayerByIdRef.current.clear();
      markerByIdRef.current.clear();
      markers.forEach((marker) => {
        const circle = leaflet.circleMarker(marker.coordinates, {
          className: `dtv-point-marker dtv-point-marker--${marker.kind}`,
          radius: marker.kind === "cheer-point" ? 8 : 5,
          color: "#ffffff",
          fillColor: marker.kind === "cheer-point" ? "#1e6fa0" : "#f26419",
          fillOpacity: 1,
          weight: 3,
        });

        circle.on("click", (event) => {
          leaflet.DomEvent.stopPropagation(event);
          setPanelState({ kind: "marker", marker });
          onSelectionChange?.({ kind: "marker", id: marker.id });
        });
        circle.addTo(mapRef.current!);
        markerLayerByIdRef.current.set(marker.id, circle);
        markerByIdRef.current.set(marker.id, marker);
      });

      selectionLayerRef.current = leaflet.layerGroup().addTo(mapRef.current);
      mapRef.current.fitBounds(polyline.getBounds(), { padding: [24, 24] });
      setIsMapReady(true);
    };

    document.addEventListener("fullscreenchange", syncFullscreenState);
    setIsMapReady(false);
    mountMap();

    return () => {
      mounted = false;
      document.removeEventListener("fullscreenchange", syncFullscreenState);
      selectionLayerRef.current?.remove();
      selectionLayerRef.current = null;
      markerLayerByIdRef.current.clear();
      markerByIdRef.current.clear();
      mapRef.current?.remove();
      mapRef.current = null;
      leafletRef.current = null;
    };
  }, [onSelectionChange, pointDetails, points, raceDistanceKm, route]);

  useEffect(() => {
    if (!focusedMarkerRequest || mode === "static" || !isMapReady) {
      return;
    }

    const map = mapRef.current;
    const marker = markerByIdRef.current.get(focusedMarkerRequest.id);
    const markerLayer = markerLayerByIdRef.current.get(focusedMarkerRequest.id);

    if (!map || !marker || !markerLayer) {
      return;
    }

    markerLayer.bringToFront();
    setPanelState({ kind: "marker", marker });
    map.flyTo(marker.coordinates, map.getZoom(), {
      animate: !window.matchMedia("(prefers-reduced-motion: reduce)").matches,
      duration: 0.5,
    });
  }, [focusedMarkerRequest, isMapReady, mode]);

  useEffect(() => {
    const leaflet = leafletRef.current;
    const layerGroup = selectionLayerRef.current;

    if (!leaflet || !layerGroup) {
      return;
    }

    layerGroup.clearLayers();

    if (!panelState) {
      return;
    }

    if (panelState.kind === "marker") {
      leaflet
        .circleMarker(panelState.marker.coordinates, {
          className: "dtv-point-selection-halo",
          color: "#1e6fa0",
          fillColor: "#1e6fa0",
          fillOpacity: 0.18,
          radius: 16,
          weight: 2,
        })
        .addTo(layerGroup);

      return;
    }

    const { selection } = panelState;

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
  }, [panelState, pointDetails, points, raceDistanceKm, route]);

  const handleDismissSelection = () => {
    setPanelState(null);
    onSelectionChange?.(null);
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

  const selectedRoute =
    panelState?.kind === "route" ? panelState.selection : null;
  const selectedMarker =
    panelState?.kind === "marker" ? panelState.marker : null;
  const predictedPassingTime =
    mode === "spectator" && selectedRoute
      ? (selectionTimeFormatter?.(selectedRoute.distanceKm) ?? null)
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
          class="absolute top-3 right-3 z-[500] flex h-10 w-10 items-center justify-center"
          style="background-color: var(--color-surface-raised); color: var(--color-text); border: 1px solid var(--color-line); cursor: pointer;"
          aria-label={
            isFullscreen
              ? dictionary.exitFullscreenMap
              : dictionary.enterFullscreenMap
          }
          title={
            isFullscreen
              ? dictionary.exitFullscreenMap
              : dictionary.enterFullscreenMap
          }
        >
          {isFullscreen ? (
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
              aria-hidden="true"
            >
              <path d="M4 14h6v6" />
              <path d="M20 10h-6V4" />
              <path d="M14 20v-6h6" />
              <path d="M10 4v6H4" />
            </svg>
          ) : (
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
              aria-hidden="true"
            >
              <path d="M15 3h6v6" />
              <path d="M9 21H3v-6" />
              <path d="M21 3l-7 7" />
              <path d="M3 21l7-7" />
            </svg>
          )}
        </button>
      )}
      <div
        ref={containerRef}
        data-race-map
        data-map-mode={mode}
        class="w-full overflow-hidden"
        style={isFullscreen ? "height: 100%;" : "height: 24rem;"}
      />
      {mode !== "static" && panelState && (
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
                {selectedRoute
                  ? dictionary.selectedRoutePoint
                  : selectedMarker?.kind === "cheer-point"
                    ? dictionary.cheerPointLabel
                    : dictionary.splitLabel}
              </div>
              <div
                data-route-selection-primary
                class="font-display mt-2 text-2xl font-bold uppercase"
                style="color: var(--color-text);"
              >
                {selectedRoute
                  ? formatExactDistance(selectedRoute.distanceKm, locale)
                  : selectedMarker?.label}
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
          {selectedRoute && (
            <div data-route-selection-distance class="hidden">
              {formatExactDistance(selectedRoute.distanceKm, locale)}
            </div>
          )}
          {mode === "spectator" && predictedPassingTime && selectedRoute && (
            <div
              class="mt-4 font-mono text-sm"
              style="color: var(--color-text);"
            >
              <span data-route-selection-time>{predictedPassingTime}</span>
            </div>
          )}
          {selectedMarker?.detail && (
            <div
              data-point-selection-detail
              class="mt-4 font-mono text-sm leading-6"
              style="color: var(--color-text);"
            >
              {selectedMarker.detail}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
