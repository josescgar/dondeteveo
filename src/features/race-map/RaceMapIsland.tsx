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
    };

    const mountMap = async () => {
      const leaflet = await import("leaflet");

      if (!mounted || !containerRef.current) {
        return;
      }

      leafletRef.current = leaflet;
      mapRef.current = leaflet.map(containerRef.current, {
        scrollWheelZoom: true,
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

  useEffect(() => {
    mapRef.current?.invalidateSize();
  }, [isFullscreen]);

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
  const predictedReturnTime =
    mode === "spectator" && selectedRoute?.returnPassDistanceKm != null
      ? (selectionTimeFormatter?.(selectedRoute.returnPassDistanceKm) ?? null)
      : null;

  return (
    <div
      ref={wrapperRef}
      class={`bg-surface relative overflow-hidden ${isFullscreen ? "h-screen w-screen" : "border-line h-96 border"}`}
    >
      {mode === "spectator" && canFullscreen && (
        <button
          type="button"
          data-map-fullscreen-toggle
          onClick={handleToggleFullscreen}
          class="border-line bg-surface-raised text-text absolute top-3 right-3 z-[500] flex h-10 w-10 cursor-pointer items-center justify-center border"
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
        class="h-full w-full overflow-hidden"
      />
      {mode !== "static" && panelState && (
        <div
          data-route-selection-panel
          class="border-line bg-surface-raised absolute right-3 bottom-3 left-3 z-[500] max-w-md border p-4 shadow-md sm:left-auto"
        >
          <div class="flex items-start justify-between gap-4">
            <div>
              <div class="text-muted font-mono text-[10px] tracking-[0.24em] uppercase">
                {selectedRoute
                  ? dictionary.selectedRoutePoint
                  : selectedMarker?.kind === "cheer-point"
                    ? dictionary.cheerPointLabel
                    : dictionary.splitLabel}
              </div>
              <div
                data-route-selection-primary
                class="font-display text-text mt-2 text-2xl font-bold uppercase"
              >
                {selectedRoute
                  ? selectedRoute.returnPassDistanceKm != null
                    ? `${formatExactDistance(selectedRoute.returnPassDistanceKm, locale)} / ${formatExactDistance(selectedRoute.distanceKm, locale)}`
                    : formatExactDistance(selectedRoute.distanceKm, locale)
                  : selectedMarker?.label}
              </div>
            </div>
            <button
              type="button"
              data-route-selection-dismiss
              onClick={handleDismissSelection}
              class="border-line text-muted shrink-0 cursor-pointer border bg-transparent px-2 py-1 font-mono text-sm uppercase"
              aria-label={dictionary.dismissRoutePoint}
            >
              X
            </button>
          </div>
          {selectedRoute && (
            <div data-route-selection-distance class="hidden">
              {selectedRoute.returnPassDistanceKm != null
                ? `${formatExactDistance(selectedRoute.returnPassDistanceKm, locale)} / ${formatExactDistance(selectedRoute.distanceKm, locale)}`
                : formatExactDistance(selectedRoute.distanceKm, locale)}
            </div>
          )}
          {mode === "spectator" && predictedPassingTime && selectedRoute && (
            <div class="text-text mt-4 font-mono text-sm">
              {predictedReturnTime ? (
                <div class="flex flex-col gap-1">
                  <div>
                    <span class="text-muted mr-2">
                      {dictionary.firstPassLabel}
                    </span>
                    <span data-route-selection-time>{predictedReturnTime}</span>
                  </div>
                  <div>
                    <span class="text-muted mr-2">
                      {dictionary.returnPassLabel}
                    </span>
                    <span data-route-selection-return-time>
                      {predictedPassingTime}
                    </span>
                  </div>
                </div>
              ) : (
                <span data-route-selection-time>{predictedPassingTime}</span>
              )}
            </div>
          )}
          {selectedMarker?.detail && (
            <div
              data-point-selection-detail
              class="text-text mt-4 font-mono text-sm leading-6"
            >
              {selectedMarker.detail}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
