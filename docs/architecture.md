# Architecture

## Core Decisions

- Astro first
- Preact only for interactive islands
- GitHub Pages behind Cloudflare
- Leaflet + GeoJSON
- No backend persistence in MVP
- Share state encoded in the URL fragment

## Public Routing

- `/` permanently redirects to `/es/`; Cloudflare owns the production HTTP redirect and preserves the query string
- Canonical localized homepages: `/en/`, `/es/`
- Listing pages: `/en/races/`, `/es/races/`
- Convenience race URLs: `/en/races/<race>/`, `/es/races/<race>/`
- Canonical race edition pages: `/en/races/<race>/<year>/`, `/es/races/<race>/<year>/`
- Share pages: `/en/share/<race>/<year>/#...`, `/es/share/<race>/<year>/#...`

## Routing Rules

- Public URLs do not include country.
- Page route builders return final slash-terminated URLs. Asset and sitemap filenames remain extension-terminated.
- Race slugs must be globally unique.
- Convenience race URLs redirect to the next upcoming edition if available (including a provisional one), otherwise the most recent past edition.
- Language switching should map directly to the equivalent page in the other locale.

## SEO Rules

- Indexable: localized homepages, listing pages, race edition pages, About/Contact, Privacy Policy
- Non-indexable: share pages, search states, filter states
- Past editions remain public and indexable.
- Provisional editions (route and/or start time pending confirmation) are indexable like any other edition; the date and the race are real.
- Canonical domain: `https://dondeteveo.com`
- Canonical, locale alternate, Open Graph, internal page links, and sitemap entries use final slash-terminated page URLs.
- Every indexable page emits `hreflang` alternates for both locales plus `hreflang="x-default"`, pointing at the English URL. `noindex` pages (share, 404, convenience race routes) emit no alternates; their visible language switch is unaffected.
- Homepage and listing titles lead with spectator-intent keywords and end with the brand (`<keyword phrase> | Dondeteveo`), at most 60 characters, with 120-160 character descriptions.
- Structured data (JSON-LD) is built by pure helpers in `src/lib/structured-data.ts` and passed to `BaseLayout.astro` through its `jsonLd` prop: `WebSite` + `Organization` on the localized homepages, `SportsEvent` + `BreadcrumbList` on race edition pages. `SportsEvent.startDate` carries the race timezone's UTC offset on race day (DST-aware), or only the date when the edition's start time is provisional. `Organization.url` is the rendered locale's homepage, never the `/` redirect stub. The layout never emits JSON-LD on `noindex` pages, and serialization escapes `<`, `>` and `&` so race data cannot break out of the script element.
- Every sitemap URL has a `lastmod`: the last git commit touching the edition's data folder for edition pages, the whole `data/` folder for homepages and listings, and the page source for About, Privacy and Contribute. Template and copy changes do not move `lastmod`. Shallow clones, a missing `data/` folder and unknown URLs fall back to the build time, so CI checks out full history (`fetch-depth: 0`).
- Public pages emit centralized metadata and generated `og:image` assets without altering extension-terminated asset URLs.
- The sitemap excludes `/`, share pages, generated images, convenience race routes, and non-page assets. Search Console should discover every generated sitemap URL; the current 13-edition catalog produces 36 URLs.

## Race Edition Page Content

Edition pages target spectator-intent searches ("where to watch", "dónde animar", "recorrido"). Everything below is server-rendered Astro generated from edition data, with strings in `src/lib/i18n.ts` (`editionPage`) and logic in `src/lib/races/edition-page.ts` and `src/lib/races/editions.ts`:

- Title: `<name> <year>: route & where to watch | Dondeteveo` (ES `recorrido y dónde animar`), at most 65 characters. Long names drop the site name first, then use the short intent (`where to watch` / `dónde animar`), then the bare `<name> <year>`, and only then truncate the name.
- Meta description: date, city, distance, start time (local) and number of cheer points, plus the edition summary when it fits; 120-160 characters, whole sentences unless nothing else fits.
- Exactly one H1 (race name) and H2 sections: route overview, where to watch (cheer points, with a fallback when an edition has none), start times (gun start or every wave with its localized label), FAQ (questions as H3, answers as visible text), other editions and more races.
- Times are race local time only, always labelled with the race IANA timezone.
- Internal linking: "Other editions" links every other edition of the same race; a past edition with an upcoming sibling also shows a prominent pointer to it near the top. "More races" links up to 6 upcoming editions of other races (one per race: its next edition), same city first, then nearest by date, with the race slug as a stable tie-breaker.
- Past vs upcoming is decided once per build from the race date in the race timezone (`isUpcomingEdition`), the same rule the catalog and convenience routes use, so the output is deterministic for a given build date. Pages only change classification on the next deploy.

## Rendering Boundaries

- Use Astro for pages, layouts, SEO metadata, and static sections.
- Use Preact for interactive inputs, share interactions, and map controls.
- Use the lightest hydration directive that works.

## Share Model

- MVP uses URL fragment state only.
- Fragment data is untrusted and must be parsed and validated before use.
- Share pages are always `noindex`.

## Race Listing Pagination

The race listing pages (`/en/races/`, `/es/races/`) initially render every edition as a visible server-rendered link. Client-side filters and "Load more" pagination may change the presentation after interaction, but must never prevent crawlers from discovering an indexable edition in the initial listing HTML. The localized homepages keep a compact upcoming-race view.

## Deployment Redirects

Astro generates a static fallback for `/` to `/es/`, but GitHub Pages cannot emit the required HTTP redirect from repository configuration. Cloudflare must configure an exact-path permanent redirect from `https://dondeteveo.com/` to `https://dondeteveo.com/es/`, preserving query parameters and leaving all other paths unchanged.

After route or catalog changes, verify both `sitemap-index.xml` and its child `sitemap-0.xml` in Google Search Console. Submit the child sitemap directly if Search Console does not register URLs from the index.

## Repository Shape

- `src/pages/`, `src/layouts/`
- `src/components/astro/`, `src/components/preact/`
- `src/features/<feature>/` for co-located feature code
- `src/lib/` for shared cross-feature code
- `src/styles/`
- `data/`
- `tests/`

## Related ADRs

- `docs/adr/0001-astro-preact-islands.md`
- `docs/adr/0002-github-pages-cloudflare.md`
- `docs/adr/0004-fragment-share-state.md`
- `docs/adr/0005-localized-public-urls.md`
