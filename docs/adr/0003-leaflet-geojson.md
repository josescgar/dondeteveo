# ADR 0003: Leaflet + GeoJSON

## Status

- Accepted

## Context

- The MVP needs simple route visualization and curated checkpoint overlays.

## Decision

- Use Leaflet for map rendering and GeoJSON for route and point data.

## Consequences

- Map implementation stays simple and static-friendly.
- Race data can remain in-repo and human-reviewable.
