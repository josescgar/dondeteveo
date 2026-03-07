# Data Race Catalog

## Purpose

- Define the internal race edition data contract used by discovery, race pages, and share pages.

## Folder Structure

- `data/<iso-country>/<race>/<year>/`

## Public vs Internal Paths

- Internal paths include the ISO country code.
- Public URLs do not include country.
- Race slugs must be globally unique across the full catalog.

## Required Files Per Edition

- `meta.json`
- `route.geojson`
- `points.geojson`
- `source.json`

## `meta.json` Schema

| Field                | Type                | Required | Notes                                   |
| -------------------- | ------------------- | -------- | --------------------------------------- |
| `name`               | string              | required | Display name                            |
| `date`               | string `YYYY-MM-DD` | required | Race day in local timezone              |
| `distanceKm`         | number              | required | e.g. `21.0975`                          |
| `city`               | string              | required | Host city display name                  |
| `startTime`          | string `HH:MM`      | required | Gun start in race local timezone        |
| `timezone`           | string (IANA)       | required | e.g. `"Europe/Madrid"`                  |
| `officialWebsiteUrl` | string (URL)        | required |                                         |
| `summary`            | string              | optional | 1–2 sentence description for race pages |
| `heroNote`           | string              | optional | Spectator-specific note for share pages |

## `source.json` Schema

| Field                | Notes                                  |
| -------------------- | -------------------------------------- |
| `officialSourceName` | Human-readable source name             |
| `officialSourceUrl`  | URL to the official source             |
| `routeSourceType`    | `"gpx"` \| `"kml"` \| `"manual-trace"` |
| `notes`              | Free-text audit notes                  |

## `points.geojson` Feature Properties

| Property     | Type                         | Notes                                                                                              |
| ------------ | ---------------------------- | -------------------------------------------------------------------------------------------------- |
| `id`         | string                       | Unique kebab-case identifier (e.g. `"km-10"`, `"cheer-plaza-nueva"`)                               |
| `label`      | string                       | Display label (e.g. `"10K split"`, `"Cheer point: Plaza Nueva"`)                                   |
| `kind`       | `"split"` \| `"cheer-point"` | `split` = timing splits shown in planner; `cheer-point` = spectator locations shown on share pages |
| `distanceKm` | number                       | Distance from start along the route                                                                |

## Timing Rules

- MVP uses constant pace.
- Arrival times are derived from route geometry and checkpoint positions.
- Only race local time is shown in the UI.

## Provenance Rules

- Store official source information.
- Record whether route data came from GPX/KML or manual tracing.
- Record enough notes to audit or update the edition later.

## Curation Workflow

- Add or update one edition at a time.
- Validate required files and fields.
- Check that the route, points, and metadata align.
- Preserve past editions rather than overwriting them.

## QA Checklist

- Required files present
- Required metadata present
- Slug globally unique
- Timezone present and correct
- Source information present
- Route and points load correctly
