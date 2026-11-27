# Data Race Catalog

## Purpose

- Define the internal race edition data contract used by discovery, race pages, and share pages.

## Folder Structure

- `data/<iso-country>/<race>/<year>/`
- One race edition represents one distance, one route, and one point set.
- Multi-distance events must be split into separate race slugs and edition folders.

## Public vs Internal Paths

- Internal paths include the ISO country code.
- Public URLs do not include country.
- Race slugs must be globally unique across the full catalog.

## Required Files Per Edition

- `meta.json`
- `route.geojson`
- `points.geojson`
- `source.json`

## Optional Files Per Edition

- `localizations.json` — locale-specific overrides for meta fields and point labels

## `meta.json` Schema

| Field                | Type                | Required | Notes                                                         |
| -------------------- | ------------------- | -------- | ------------------------------------------------------------- |
| `name`               | string              | required | Display name                                                  |
| `date`               | string `YYYY-MM-DD` | required | Race day in local timezone                                    |
| `distanceKm`         | number              | required | e.g. `21.0975`                                                |
| `city`               | string              | required | Host city display name                                        |
| `startTime`          | string `HH:MM`      | required | Gun start in race local timezone                              |
| `timezone`           | string (IANA)       | required | e.g. `"Europe/Madrid"`                                        |
| `officialWebsiteUrl` | string (URL)        | required |                                                               |
| `summary`            | string              | required | 1–2 sentence description for race pages                       |
| `heroNote`           | string              | required | Spectator-specific note for share pages                       |
| `specialNote`        | string              | optional | Prominent race-day note for important logistics or exceptions |
| `waves`              | array of objects    | optional | Wave start definitions (min 2 if present)                     |
| `waves[].label`      | string              | required | Wave display name (e.g. `"Elite"`, `"Wave 1"`)                |
| `waves[].startTime`  | string `HH:MM`      | required | Wave gun time in race local timezone                          |

- Omit `specialNote` entirely when a race does not need an extra highlighted callout.
- Omit `waves` for races with a single start time. If present, `waves` must contain at least 2 entries. Each wave has a `label` and a `startTime` in the same `HH:MM` format as the main `startTime`.

## `source.json` Schema

| Field                | Notes                                                |
| -------------------- | ---------------------------------------------------- |
| `officialSourceName` | Human-readable source name                           |
| `officialSourceUrl`  | URL to the official source                           |
| `routeSourceType`    | `"gpx-import"` \| `"kml-import"` \| `"manual-trace"` |
| `notes`              | Free-text audit notes                                |

## `points.geojson` Feature Properties

| Property     | Type                         | Notes                                                                                              |
| ------------ | ---------------------------- | -------------------------------------------------------------------------------------------------- |
| `id`         | string                       | Unique kebab-case identifier (e.g. `"km-10"`, `"cheer-plaza-nueva"`)                               |
| `label`      | string                       | Display label (e.g. `"10K split"`, `"Cheer point: Plaza Nueva"`)                                   |
| `kind`       | `"split"` \| `"cheer-point"` | `split` = timing splits shown in planner; `cheer-point` = spectator locations shown on share pages |
| `distanceKm` | number                       | Distance from start along the route                                                                |

## `localizations.json` Schema

Optional file. Keys are locale codes (e.g. `"es"`). Each locale entry may contain:

| Field         | Type                     | Notes                                                               |
| ------------- | ------------------------ | ------------------------------------------------------------------- |
| `meta`        | object (partial)         | Any subset of: `name`, `city`, `summary`, `heroNote`, `specialNote` |
| `pointLabels` | `Record<string, string>` | Maps point `id` from `points.geojson` to a localized display label  |

Both fields are optional per locale. Point IDs that don't match any feature in `points.geojson` are silently ignored.

Example:

```json
{
  "es": {
    "meta": {
      "name": "Carrera Ejemplo 10K",
      "city": "Sevilla"
    },
    "pointLabels": {
      "start": "Salida",
      "finish": "Meta"
    }
  }
}
```

## Timing Rules

- MVP uses constant pace.
- Arrival times are derived from route geometry and checkpoint positions.
- Only race local time is shown in the UI.

## Provenance Rules

- Store official source information.
- Record whether route data came from GPX/KML or manual tracing.
- Record enough notes to audit or update the edition later.

## Community Contributions

Community members can contribute new races via pull request. See [`CONTRIBUTING.md`](../CONTRIBUTING.md) for the full guide, including data schemas, folder structure, and QA checklist.

## Curation Workflow

- Add or update one edition at a time.
- Import GPX/KML routes with the import script instead of converting them by hand:

  ```bash
  npm run data:import -- <route.gpx|route.kml> data/<iso-country>/<race-slug>/<year> --distance <official-km> [--name "<race name>"]
  ```

  - Reads GPX tracks (all `trkseg`s; routes only when the file has no usable track, so a course exported as both is not doubled), and KML `LineString` / `gx:Track` geometries, including `MultiGeometry`. Several lines are joined in document order only when each starts where the previous one ended (within 0.25 km, `--max-join-gap-km`); otherwise the import fails and lists the lines so one can be picked with `--line <n>`. KMZ must be unzipped first.
  - Writes `route.geojson` (one `LineString`, elevation and source metadata removed, coordinates rounded to six decimals, consecutive duplicates dropped) and a starter `points.geojson` with `start`, `km-<n>` splits every 5 km (`--split-interval`), `halfway` for marathons, and `finish`. Cheer points are not generated.
  - Point `distanceKm` values are official distances; positions are interpolated at the same fraction of the measured route length. The script prints the measured length and its difference from the official distance: record both in `source.json` `notes`. If the difference is more than the validator's 3%, the import fails without writing anything unless `--allow-length-mismatch` is passed.
  - Refuses to write into an existing edition folder unless `--force` is passed (which overwrites only `route.geojson` and `points.geojson`), and refuses any target that does not resolve to `<data-dir>/<iso-country>/<race-slug>/<year>` (`--data-dir`, default `data`).
  - Then add `meta.json` and `source.json`, add location suffixes to split labels (e.g. `"5K split - Plaza Nueva"`), and add cheer points.

- Validate the edition (or omit the folder to validate the whole catalog; CI does this on every push):

  ```bash
  npm run data:validate -- data/<iso-country>/<race-slug>/<year>
  ```

- Preserve past editions rather than overwriting them.

## Validation Checks

`npm run data:validate` exits non-zero on any error. `--list-checks` prints the checks; tolerances are configurable with `--length-tolerance`, `--max-jump-km`, `--max-point-offset-m`, `--point-position-km` and `--point-position-pct`.

| Check                       | Rule                                                                                                                                                                     |
| --------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `required-files`            | `meta.json`, `source.json`, `route.geojson` and `points.geojson` exist                                                                                                   |
| `schema`                    | Every file (and `localizations.json`, if present) is valid JSON matching the Zod schemas                                                                                 |
| `edition-year`              | `meta.date` is in the edition folder's year                                                                                                                              |
| `timezone`                  | `meta.timezone` is a valid IANA time zone (not a UTC offset)                                                                                                             |
| `waves`                     | `meta.waves`, if present, has at least two entries                                                                                                                       |
| `route-single-line`         | `route.geojson` has exactly one `LineString` feature                                                                                                                     |
| `route-length`              | Measured route length is within 3% of `distanceKm`                                                                                                                       |
| `route-jumps`               | No gap over 2 km between consecutive route coordinates                                                                                                                   |
| `points-on-route`           | Every point is within 50 m of the route line                                                                                                                             |
| `point-distance-range`      | Every point `distanceKm` is between 0 and the race `distanceKm` (points use official distances)                                                                          |
| `point-ids-unique`          | Point ids are unique within the edition                                                                                                                                  |
| `point-position`            | Each point's along-route position, scaled to the official distance, is within max(1 km, 5%) of its `distanceKm`; on out-and-back legs and laps the matching pass is used |
| `start-finish-points`       | There is a point at `distanceKm` 0 and one at the race `distanceKm`                                                                                                      |
| `localization-point-labels` | Every `pointLabels` key in `localizations.json` is an existing point id                                                                                                  |
| `folder-names`              | Every folder under `data/` is `<iso-country>/<race-slug>/<year>` (two-letter lowercase country, kebab-case slug, four-digit year), since the site loads them all         |
| `slug-unique`               | A race slug is used in only one country folder                                                                                                                           |

Accepted exceptions for committed editions live in `scripts/edition-validation/known-issues.ts`. Each one names an edition, a check and looser limits for that check (for example `lengthTolerancePercent: 3.5`). Errors within those limits are reported as warnings, anything beyond them is still an error, and the validator warns when an exception is no longer needed. Exceptions for past editions are permanent, because past editions are preserved as published; never add one to get a new edition through.

## QA Checklist

- Route imported with `npm run data:import` when a GPX/KML file exists
- `npm run data:validate` passes for the edition
- Required metadata present
- Timezone present and correct
- Source information present, including the measured route length for imports
- Split labels carry location suffixes; cheer points added where useful
- Route and points load correctly
