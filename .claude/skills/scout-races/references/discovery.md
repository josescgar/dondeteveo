# Discovering New Races

Goal: find road races worth adding that the watchlist does not follow yet, and propose each as a `candidate` with an "Add race data for…" issue. The discovery sources are listings, not official sources: they only point to races; every fact comes from the organiser's own site.

## Selection criteria (for now)

A race qualifies only if every item holds:

1. **Country**: Spain (`countryCode` `es`).
2. **Surface and type**: a road race on asphalt in a town or city. Skip trail, mountain, cross-country, track, ultra, obstacle, relay, walking, virtual, children's and charity-walk events, and races whose official page describes a mostly off-road course. Evidence (quote it): an official page that calls it a road race ("carrera urbana", "en ruta", "asfalto", "circuito urbano", "homologado" by a road-running federation) or lists a course through named city streets. A listing site's "road" filter alone is not enough.
3. **Distance**: from 5 km to the marathon (42.195 km). Standard distances first (5K, 10K, 15K, half marathon, marathon). A non-standard distance (for example 12K or 20K) qualifies only with at least 10,000 participants.
4. **Official website** run by the organiser (or the city council or sports department that organises it, whose domain then counts as official), with the edition's date published on it. Listing pages, registration platforms and news articles are not official websites.
5. **Size**, from the official site or the RFEA calendar: a published participant cap or previous-edition finishers of at least 3,000 (at least 1,500 for marathons), or a World Athletics Label. No size evidence: skip and list it as "size unknown".
6. **Next edition** within the next 12 months and at least 21 days away (so a person has time to add it).
7. **Not already followed or rejected**: no `watchlist/races/` entry with the same slug, name or official domain; no `data/` folder for it; no open issue for it; no closed issue for it (a closed issue means a person already handled or rejected it).

Prefer larger events: rank qualifying races by size, largest first, and propose at most as many as the remaining issue cap allows.

## Procedure

1. Read `watchlist/discovery-sources.json` (from the base worktree). For each source in file order, open its `url` and follow its `howToRead` (filters, tabs, query parameters) as far as a scripted fetch allows. Listings are not evidence, so `scripts/page-text.ts` or a summarising fetch tool are both fine here; the untrusted-content rule still applies. Some listings only render results with JavaScript or behind a POST form (at the time of writing the RFEA calendar and the Finishers search): report such a source as unreadable for scripted runs and move on; do not change its `verifiedOn`.
2. Collect road races in Spain from 5 km to marathon with a date in the window from **every** readable source before evaluating any, and merge duplicates. Then pick up to 15 to evaluate, in this order: marathons and half marathons first, then races listed by more than one source, then races whose listing states a large field.
3. For each race picked, find and open the organiser's official website: follow the listing's link to it if there is one; otherwise use a web search for the race name and year and take only results on a domain that matches the race or its organiser (or a city council). Confirm the site is the organiser's by finding, on the site itself, the race's own regulations or registration for the edition. If no such site is found, reject the race ("no official website found"). From the official pages, record name, city, date, distances, start time if published, regulations URL, course page URL, track links, road-race evidence and size evidence, each with its URL and verbatim quote (`node "$REPO_ROOT/scripts/page-text.ts"`, as for race pages).
4. Apply the selection criteria. Record each rejection with a one-line reason (for the summary counts).
5. **Multi-distance events**: each qualifying distance is its own slug, its own issue and its own watchlist entry. A distance that does not qualify on its own (for example a 5K run alongside a large marathon without its own size evidence) is not proposed.
6. **Slug**: lowercase ASCII kebab-case, no sponsor names, globally unique across `data/` and `watchlist/races/`. Use `<city>-marathon` or `<city>-half-marathon` for marathons and half marathons named after their city, and `<distinctive-name>-<distance>k` otherwise (for example `valencia-10k`, `jean-bouin-10k`). Check existing slugs before choosing.
7. With `--discovery on` (and not `--dry-run`), for each selected race in rank order while `issuesOpened < max-issues`:
   1. Run the duplicate check (open and closed issues, `github-items.md`).
   2. Open the `add-race` issue (`github-items.md`).
   3. Create `watchlist/races/<slug>.json` for the Phase 6 PR: `catalogStatus: "candidate"`, `trackingIssue` the new issue number, `usualMonth` the month of the found date, URLs only from pages you opened, facts per `race-check.md` section 8 (unknown facts `null`), `trackSource` per what the course page offers (`none` with notes when there is no file), and `notes` with the size evidence and discovery source.
8. With `--discovery dry-run` (or `--dry-run`), create nothing: list each race that would be added with its slug, distance, date, city, official URL and size evidence (quote and URL), and the rejection counts by reason.

## Discovery sources

Only add or change a discovery source when you have opened it in this run, only with `--discovery on` (never in a dry run), and only through the Phase 6 watchlist PR: update `verifiedOn` for sources you read successfully; describe a changed URL or filter in `howToRead`. Never add a source that is a search engine, a social network, or requires an account.
