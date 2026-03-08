# Contributing Race Data

Thank you for helping grow the Dondeteveo race catalog! This guide explains how to contribute a new race edition via pull request.

## Race Data Structure

Each race edition lives in its own folder:

```
data/<iso-country>/<race-slug>/<year>/
  meta.json         # Race metadata
  route.geojson     # LineString route geometry
  points.geojson    # Split and cheer-point features
  source.json       # Data provenance
```

- `<iso-country>` — lowercase ISO 3166-1 alpha-2 code (e.g. `es`, `us`, `gb`)
- `<race-slug>` — kebab-case, globally unique across the catalog (e.g. `sevilla-half-marathon`)
- `<year>` — edition year (e.g. `2026`)

See `data/es/sevilla-half-marathon/2026/` for a complete working example.

## Required Files

### `meta.json`

| Field                | Type                | Required | Notes                                   |
| -------------------- | ------------------- | -------- | --------------------------------------- |
| `name`               | string              | yes      | Display name                            |
| `date`               | string `YYYY-MM-DD` | yes      | Race day in local timezone              |
| `distanceKm`         | number              | yes      | e.g. `21.0975`                          |
| `city`               | string              | yes      | Host city display name                  |
| `startTime`          | string `HH:MM`      | yes      | Gun start in race local timezone        |
| `timezone`           | string (IANA)       | yes      | e.g. `"Europe/Madrid"`                  |
| `officialWebsiteUrl` | string (URL)        | yes      | Link to the official race website       |
| `summary`            | string              | no       | 1–2 sentence description for race pages |
| `heroNote`           | string              | no       | Spectator-specific note for share pages |

Example:

```json
{
  "name": "Zurich Seville Half Marathon",
  "date": "2026-01-25",
  "distanceKm": 21.0975,
  "city": "Seville",
  "startTime": "09:00",
  "timezone": "Europe/Madrid",
  "officialWebsiteUrl": "https://www.zurichmaratonsevilla.es/media-maraton/",
  "summary": "Fast winter half marathon in the center of Seville.",
  "heroNote": "A spectator-friendly course with multiple central cheering opportunities."
}
```

### `route.geojson`

A standard GeoJSON `FeatureCollection` containing a single `Feature` with a `LineString` geometry representing the race route.

### `points.geojson`

A GeoJSON `FeatureCollection` of `Point` features. Each feature must have these properties:

| Property     | Type                         | Notes                                                            |
| ------------ | ---------------------------- | ---------------------------------------------------------------- |
| `id`         | string                       | Unique kebab-case identifier (e.g. `"km-10"`)                    |
| `label`      | string                       | Display label (e.g. `"10K split"`)                               |
| `kind`       | `"split"` or `"cheer-point"` | `split` for timing points, `cheer-point` for spectator locations |
| `distanceKm` | number                       | Distance from start along the route                              |

Include at minimum: `start`, key kilometer splits, and `finish`.

### `source.json`

| Field                | Notes                                 |
| -------------------- | ------------------------------------- |
| `officialSourceName` | Human-readable source name            |
| `officialSourceUrl`  | URL to the official source            |
| `routeSourceType`    | `"gpx"`, `"kml"`, or `"manual-trace"` |
| `notes`              | Free-text audit notes                 |

## Tools for Creating Route Data

You don't need specialized software to create race routes. These free online tools let you draw routes on a map and export them in formats we can use:

- **[geojson.io](https://geojson.io)** — Draw routes (LineString) and points directly on a map and export as GeoJSON. This is the most direct option since Dondeteveo uses GeoJSON natively. You can create both `route.geojson` and `points.geojson` here.
- **[plotaroute.com](https://www.plotaroute.com)** — Trace a route along roads with automatic snap-to-path. Great for accuracy since it follows real streets. Export as GPX, then convert to GeoJSON using geojson.io (import the GPX file there).
- **[mapstogpx.com](https://mapstogpx.com)** — Convert Google Maps directions into a GPX file. Useful if the race route follows a path you can replicate with Google Maps directions. Convert the resulting GPX to GeoJSON via geojson.io.

**Tip:** Many official race websites publish route maps or GPX/KML files. Check the race's official site first — you may be able to download the route directly and convert it to GeoJSON.

## Step-by-Step PR Instructions

1. **Fork** the repository and clone your fork.
2. **Create a branch**: `git checkout -b data/<race-slug>-<year>` (e.g. `data/boston-marathon-2026`).
3. **Create the folder**: `data/<iso-country>/<race-slug>/<year>/`.
4. **Add the four required files** following the schemas above.
5. **Run validation**:
   ```bash
   npm run build        # Confirms the data loads correctly
   npm run check        # Type checking
   npm run lint         # Linting
   ```
6. **Commit and push** your branch.
7. **Open a pull request** against `main` with a brief description of the race.

## QA Checklist

Before submitting, verify:

- [ ] All four required files are present (`meta.json`, `route.geojson`, `points.geojson`, `source.json`)
- [ ] All required metadata fields are filled in
- [ ] Race slug is globally unique (not used by another race)
- [ ] Timezone is present and uses an IANA timezone identifier
- [ ] Source information is present and accurate
- [ ] Route and points load correctly (`npm run build` passes)
- [ ] Points include at least `start` and `finish`

## Can't Submit a PR?

No worries! You can also request a race by [opening a GitHub issue](https://github.com/josescgar/dondeteveo/issues/new) or sending an email to jose.escobar.dev@gmail.com.
