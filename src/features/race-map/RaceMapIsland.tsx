import "leaflet/dist/leaflet.css";

import { useEffect, useRef } from "preact/hooks";

import { MAP_ATTRIBUTION, MAP_TILE_URL } from "../../lib/config";
import { getMapMarkers, getRouteCoordinates } from "./race-map.logic";
import type {
  RacePointsCollection,
  RaceRouteCollection,
} from "../../lib/races/schemas";

type Props = {
  route: RaceRouteCollection;
  points: RacePointsCollection;
  pointDetails?: Record<string, string>;
};

export default function RaceMapIsland({ route, points, pointDetails }: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    let map: import("leaflet").Map | undefined;

    const mountMap = async () => {
      const leaflet = await import("leaflet");
      if (!containerRef.current) {
        return;
      }

      map = leaflet.map(containerRef.current, {
        scrollWheelZoom: false,
      });

      leaflet
        .tileLayer(MAP_TILE_URL, {
          attribution: MAP_ATTRIBUTION,
        })
        .addTo(map);

      const routeCoordinates = getRouteCoordinates(route);
      const polyline = leaflet
        .polyline(routeCoordinates, {
          color: "#f26419",
          weight: 5,
        })
        .addTo(map);

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
        circle.addTo(map!);
      });

      map.fitBounds(polyline.getBounds(), { padding: [24, 24] });
    };

    mountMap();

    return () => {
      map?.remove();
    };
  }, [pointDetails, points, route]);

  return (
    <div
      ref={containerRef}
      class="h-[24rem] w-full overflow-hidden"
      style="border: 1px solid var(--color-line);"
    />
  );
}
