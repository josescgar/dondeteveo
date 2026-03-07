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

## Required Metadata

- `name`
- `date`
- `distance`
- `city`
- `startTime`
- `timezone`
- `officialWebsiteUrl`

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
