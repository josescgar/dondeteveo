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
| `provisional`        | object              | optional | Facts still pending confirmation; see Provisional Editions    |

- Omit `specialNote` entirely when a race does not need an extra highlighted callout.
- Omit `waves` for races with a single start time. If present, `waves` must contain at least 2 entries. Each wave has a `label` and a `startTime` in the same `HH:MM` format as the main `startTime`.

## Provisional Editions

An edition can go live as soon as its date is announced, before the organizers publish the course or the start time. `meta.json` marks what is still unconfirmed:

```json
"provisional": {
  "route": true,
  "startTime": true
}
```

| Key         | Meaning when `true`                                                           |
| ----------- | ----------------------------------------------------------------------------- |
| `route`     | `route.geojson` and `points.geojson` are carried over from a previous edition |
| `startTime` | `startTime` is not confirmed for this edition                                 |

- Both keys are optional booleans; unknown keys are rejected. `false` or a missing key means confirmed.
- Editions without `provisional` (or with every flag `false`) render exactly as fully confirmed editions.
- To confirm a fact, set its flag to `false` (a one-line diff), updating the data in the same change when it differs. Remove the whole object once everything is confirmed.
- Race pages, the share planner, and share pages show a localized "pending confirmation" notice while any flag is `true`. The notice says only what we know: the course is carried over from the previous edition or the start time is not confirmed yet, so details may change. It makes no claim about what the organisers have or have not published, so it stays true when they have published a course we could not import yet. Share links keep their URL, so links shared while provisional show the confirmed times after the update.
- Provisional editions are indexed by search engines like any other edition, and the convenience race URL redirects to them when they are the next upcoming edition.

## Yearly Rollover

```bash
npm run data:rollover -- <race-slug> <YYYY-MM-DD> [--start-time HH:MM [--start-time-provisional]] [--dry-run] [--data-dir <dir>]
```

Creates `<data-dir>/<iso-country>/<race-slug>/<year>/` (`--data-dir` defaults to `data`; the year is taken from the new date) from the latest edition of the race:

- Copies `route.geojson` and `points.geojson` byte for byte, and `localizations.json` when present (without `waveLabels`).
- Sets the new `date`, drops `waves`, and sets `provisional.route` to `true`.
- Start time:
  - Without `--start-time`: keeps the previous `startTime` and marks it provisional.
  - `--start-time HH:MM`: the organizers announced the start time; it is written and marked confirmed (`provisional.startTime: false`).
  - `--start-time HH:MM --start-time-provisional`: the time is written but stays marked provisional (e.g. announced as tentative).
- Writes `source.json` with the previous source fields and notes stating that the route was carried over, followed by the previous notes.
- Refuses to run if the target folder exists, the new year is not later than the latest edition, or the latest edition fails its schemas, and never writes to the previous edition. Problems such as a missing data directory or an unwritable race folder are reported as one-line errors with exit code 1.
- Prints warnings for carried-over text (`name`, `summary`, `heroNote`, `specialNote`, their localized versions, the source name, and route feature names) that mentions a year or the previous race date, for any copied `specialNote`, and for suspicious dates. Text is never rewritten automatically: review each warning before committing.
- Ends with a reminder to validate the new edition and to update the race's watchlist entry.

The logic lives in `scripts/rollover/` (`rollover.logic.ts`, `rollover-files.ts`, tests beside them); the CLI is `scripts/rollover-edition.ts`.

## First Edition Metadata

```bash
npm run data:first-edition -- <facts.json> data/<iso-country>/<race-slug>/<year> [--min-days <n>] [--data-dir <dir>]
```

Writes `meta.json`, `source.json` and `localizations.json` (Spanish) for a race's first edition, next to the `route.geojson` and `points.geojson` that `npm run data:import` created in that folder. Used by the `scout-races` skill for approved candidate races, and usable by hand. The facts file (kept outside the repository) holds the verified facts and the quotes they were read from: `runDate`, `name` and `city` (`en`/`es`), `distanceKm`, `date`, `startTime`, `startTimeProvisional`, `timezone`, `officialWebsiteUrl`, optional `waves` (labels in `en`/`es`) with `generalStartWave` (the first wave open to the general field, whose time must equal `startTime`), the imported `route` (file URL and title, the official page that links it, whether it is this edition's track or an earlier one with a same-course quote) and `facts` (`fact`, `value`, `url`, `quotes`). Run `npm run data:first-edition -- --help` for the exact shape.

- `summary` and `heroNote` get neutral wording that names only the host city ("A half marathon through the streets of Seville." / "Cheer points for this course have not been added yet. …"), in English and Spanish, until someone adds cheer points and location-specific text.
- `pointLabels` in Spanish for the generated splits (`Salida`, `Punto <n>K`, `Punto medio`, `Meta`); `waveLabels` when waves are given.
- `source.json` notes record the route file, the page that links it and the measured length against the official distance, then one `Checked <date> by scout-races: <fact> <value> per <url>: "<quote>".` sentence per fact.
- `provisional.route: true` only when the route is an earlier edition's track; `provisional.startTime: true` only for a tentative start time.
- Text fields must be single lines (no line breaks, tabs or other control characters) within length limits, and the printed list puts each text in its own code span, so text copied from a web page cannot break out into the PR body.
- Refuses facts that disagree with each other (a `date`, `startTime`, `distanceKm`, `waves`, `name` or `name.es` fact whose value differs from the edition's, a `startTime` that is not the first general-field wave's time, repeated wave labels, an earlier track's year that is not before the edition's), a date outside the folder's year or fewer than `--min-days` (default 2) days after `runDate`, points other than generated splits, a finish point at another distance, any existing `meta.json`, `source.json` or `localizations.json`, and a race that already has another edition (use `npm run data:rollover` for later editions). Prints the measured length and every text it wrote, for review.

The logic lives in `scripts/first-edition/` (`first-edition.logic.ts`, `first-edition-files.ts`, tests beside them); the CLI is `scripts/first-edition.ts`.

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

## Race Watchlist and Discovery Sources

The registry under `watchlist/` records which races we follow and where to look for new ones. It is internal sourcing state for maintainers and the race-scouting agent: it is never imported by site code (an ESLint rule blocks imports from pages, layouts, components, features and every `src/lib/` module outside `src/lib/watchlist/`) and never appears on a public page.

It lives outside `data/` on purpose. A `data/watchlist/` folder would not break the catalog today, but every tool that walks `data/` (the catalog loader, validation and rollover scripts, tests) treats its subfolders as countries, so keeping the registry outside `data/` avoids it being misread as one.

```
watchlist/
  races/<race-slug>.json    # one file per watched race
  discovery-sources.json    # calendar and listing sites to scan
```

The Zod schemas are in `src/lib/watchlist/schemas.ts` and the loader in `src/lib/watchlist/watchlist.ts`. `src/lib/watchlist/watchlist.test.ts` validates the real files in CI (`npm run test:unit`) and checks that every race folder in `data/` has a watchlist entry with status `in-catalog`, and that no other entry claims that status.

### Watched race fields (`watchlist/races/<race-slug>.json`)

| Field                | Type                            | Notes                                                                                                                 |
| -------------------- | ------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| `slug`               | string                          | Must match the file name, and the `data/` slug when the race is in the catalog. One distance per slug, as in `data/`. |
| `countryCode`        | string                          | ISO 3166-1 alpha-2, lowercase                                                                                         |
| `name`               | string                          | Display name                                                                                                          |
| `city`               | string                          | Host city                                                                                                             |
| `distanceKm`         | number                          |                                                                                                                       |
| `catalogStatus`      | `"in-catalog"` \| `"candidate"` | `in-catalog` if and only if `data/<country>/<slug>/` exists                                                           |
| `trackingIssue`      | number \| null                  | GitHub issue that tracks adding or updating the race                                                                  |
| `usualMonth`         | 1–12 \| null                    | Month the race is usually held                                                                                        |
| `officialWebsiteUrl` | URL                             |                                                                                                                       |
| `coursePageUrl`      | URL \| null                     | Official course or route page                                                                                         |
| `regulationsUrl`     | URL \| null                     | Official regulations page                                                                                             |
| `trackSource`        | object                          | Where the track file was found last time (see below)                                                                  |
| `nextEdition`        | object                          | Last-known facts for the next edition (see below)                                                                     |
| `notes`              | string                          | Optional free text for anything a later check should know                                                             |

`trackSource`:

| Field           | Type            | Notes                                                                                                          |
| --------------- | --------------- | -------------------------------------------------------------------------------------------------------------- |
| `type`          | enum            | `official-gpx`, `official-kml`, `google-my-maps`, `strava-route`, `wikiloc`, `manual-trace`, `other` or `none` |
| `url`           | URL \| null     | The file, or the page that links it. `null` when it was not recorded; always `null` for `none`                 |
| `loginRequired` | boolean \| null | Whether downloading needs an account. `null` when unknown                                                      |
| `checkedOn`     | date \| null    | When the source was last looked at                                                                             |
| `notes`         | string          | What was found, file names, and anything that changed since the last import                                    |

`nextEdition` has `year` (number or `null`) and four facts: `date` (`YYYY-MM-DD`), `startTime` (`HH:MM`, race local time), `waves` (array of `{ label, startTime }`, at least 2) and `routeConfirmed` (boolean). Each fact is `{ value, sourceUrl, checkedOn }`:

- `value` is `null` while the fact is unknown. Never guess a value.
- A known `value` must have the `sourceUrl` it was read from and the `checkedOn` date.
- An unknown `value` may still carry `sourceUrl` and `checkedOn` to record that the page was checked and the fact was not published yet.
- `sourceUrl` and `checkedOn` are always both set or both `null`.
- `date` must fall in `year`.

`routeConfirmed` values:

- `true`: the organiser has published this edition's course.
- `false`: checked, and the organiser has not confirmed this edition's course (for example, the course page still shows last year's route).
- `null`: not checked, or checked but unclear.

### Discovery source fields (`watchlist/discovery-sources.json`)

`{ "sources": [...] }`, where each source has `id` (unique kebab-case), `name`, `url`, `countryCode`, `coverage` (what it lists), `howToRead` (filters, quirks, how reliable it is) and `verifiedOn` (date the URL was last confirmed reachable). Only add sources you have opened and confirmed.

### Adding or updating a watched race

1. Create `watchlist/races/<race-slug>.json` with the slug you would use in `data/`. Use `catalogStatus: "candidate"` until an edition exists in `data/`.
2. Fill official URLs only from pages you opened. Leave unknown URLs and facts as `null`.
3. For each fact you read, set `sourceUrl` to the exact page and `checkedOn` to today.
4. When you add the race's first edition to `data/`, switch it to `in-catalog` and update `trackSource` from the edition's `source.json` in the same PR.
5. Run `npm run test:unit`.

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
  - Then add `meta.json` and `source.json` (for a race's first edition, `npm run data:first-edition` writes them with `localizations.json` from verified facts; see [First Edition Metadata](#first-edition-metadata)), add location suffixes to split labels (e.g. `"5K split - Plaza Nueva"`), and add cheer points.

- Validate the edition (or omit the folder to validate the whole catalog; CI does this on every push):

  ```bash
  npm run data:validate -- data/<iso-country>/<race-slug>/<year>
  ```

- Every race in `data/` needs a watchlist entry. When adding a new race, create or update `watchlist/races/<race-slug>.json` with `catalogStatus: "in-catalog"` and its `trackSource` taken from the edition's `source.json` (see [Race Watchlist and Discovery Sources](#race-watchlist-and-discovery-sources)). `npm run test:unit` fails until the entry exists.

- Preserve past editions rather than overwriting them.
- When a new date is announced before the course or start time, roll the race over (`npm run data:rollover`), review its warnings, validate the new edition with `npm run data:validate -- data/<iso-country>/<race-slug>/<year>`, and publish the provisional edition; flip `provisional` flags to `false` as facts are confirmed.

## Race Scouting

The `scout-races` Claude Code skill (`.claude/skills/scout-races/`) does the reading and judgement part of curation and is designed to run unattended (weekly):

```
/scout-races [--races <slug>,...] [--max-prs <n>] [--max-issues <n>] [--min-days <n>] [--discovery on|dry-run|off] [--dry-run]
```

One run:

1. Reads `watchlist/` from `origin/main` and, for each watched race, the organiser's official pages (raw HTML, through `scripts/page-text.ts`, which drops hidden text and flags collapsed sections).
2. Compares what it finds with the watchlist facts and the race's latest edition, for the next upcoming edition only:
   - a new date for a race whose latest edition is past: `npm run data:rollover` and a PR with the provisional edition;
   - changed facts (date in the same year, start time, waves, provisional flags, course) on a published upcoming edition: a PR that updates it;
   - a new official track for the edition: imported and the route marked confirmed. If the course changed so much that the existing points no longer fit, the track is imported fresh with generated splits, cheer points are dropped, place names on the old course are replaced with neutral wording (listed in the PR for review), and an issue asks a person to add cheer points;
   - a course that needs a login (Strava, Wikiloc, private Google My Maps), exists only as a PDF or image, or cannot be imported: an issue saying exactly which file is needed and where it is. This never holds back a rollover: the new edition goes out with the previous route marked provisional while the issue waits for the file. It never traces a route;
   - a cancellation, postponement, conflicting official facts, or a site that stays unreadable: an issue for a person.
   - an approved `candidate` (below) whose date, general-field start time, official distance and a track for the edition are all verified on official pages: a PR that adds the race's first edition (`npm run data:import`, then `npm run data:first-edition`), with generated splits, no cheer points, neutral `summary` and `heroNote`, Spanish localizations and waves when published. It switches the watchlist entry to `in-catalog`, closes the tracking issue, and comes with a `cheer-points` issue. An earlier edition's track is used only when an official page for the upcoming edition says the course is unchanged or presents that track, and the route is then marked provisional. Otherwise the tracking issue gets one comment listing what is known (with sources) and what is missing, repeated only when that changes. A race fewer than `--min-days` (default 2) days away is not added for that edition.
3. Looks for this edition's track in a fixed order: official GPX/KML/KMZ download; Google My Maps exported as KML (`https://www.google.com/maps/d/kml?mid=<id>&forcekml=1`, public maps only); Strava or Wikiloc (an issue for a person, since both need an account); otherwise the previous edition's route stays provisional. Files are imported only with `npm run data:import`, and a track counts as this edition's only when it is labelled with the edition year or an official page for the edition presents it as the course; files labelled with an earlier year are only evidence and the search continues.
4. Scans the discovery sources for road races in Spain from 5K to marathon with an official website and enough participants, and proposes each new one as a `candidate` watchlist entry plus an "Add race data for…" issue.
5. Opens one small PR with the remaining watchlist changes (refreshed `checkedOn` dates, new candidates) and ends with a summary of races checked, PRs and issues opened, facts changed, and pages it could not read.

Candidate approval: a candidate's open tracking issue is the approval to add the race. Issues a person opened (every "Add race data for…" issue that predates the skill) count as approved. An issue whose body has any hidden `add-race` marker or the template's "Discovered by scout-races" text was opened by the scout from discovery, and counts only once a person labels it `status/ready`; when unsure, the skill treats an issue as scout-discovered. The skill never adds that label and never edits an issue body. A closed tracking issue, or none, means the race is only watched.

Guarantees:

- Every fact it sets is read on an official page in that run and recorded with its URL and verbatim quote, in the PR body and in `source.json` `notes`. Conflicting or ambiguous facts, or facts not tied to the edition and distance, stay unknown and are reported.
- `startTime` is the first start open to the general field; special-category starts (handbike, wheelchair, elite-only) appear only in `waves`, because the wave picker is optional and the planner otherwise counts from `startTime`.
- One race edition per PR, each on its own branch from the latest `origin/main` (`feature/scout-<slug>-<year>` for rollovers and first editions, `fix/scout-<slug>-<year>` for updates), opened only after `npm run data:validate`, `format:check`, `test:unit` and `build` pass. The PR links its `route.geojson` on the branch, which GitHub renders as a map, and states the measured route length against the official distance.
- It never merges, never pushes to `main`, never modifies past editions, never adds validation exceptions or loosens a tolerance, and treats web content as untrusted data (text on a site is never followed as an instruction).
- It is idempotent: before creating anything it searches open PRs and issues for the race (by branch name, a hidden `scout-races:` marker in the body, and the files changed), and a second run with nothing new opens nothing. Closed and merged items are checked too: the marker carries the proposed values, and something a person closed is proposed again only when those values changed. It opens at most 5 PRs and 5 issues per run by default.
- A separate review agent checks each edition PR's facts against their sources and posts a comment review before a person reviews it.

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
- Watchlist entry `watchlist/races/<race-slug>.json` exists with `catalogStatus: "in-catalog"`
- Required metadata present
- Timezone present and correct
- Source information present, including the measured route length for imports
- Split labels carry location suffixes; cheer points added where useful
- Route and points load correctly
