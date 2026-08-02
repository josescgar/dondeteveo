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
- Convenience race URLs redirect to the next upcoming edition if available, otherwise the most recent past edition.
- Language switching should map directly to the equivalent page in the other locale.

## SEO Rules

- Indexable: localized homepages, listing pages, race edition pages, About/Contact, Privacy Policy
- Non-indexable: share pages, search states, filter states
- Past editions remain public and indexable.
- Canonical domain: `https://dondeteveo.com`
- Canonical, locale alternate, Open Graph, internal page links, and sitemap entries use final slash-terminated page URLs.
- Public pages emit centralized metadata and generated `og:image` assets without altering extension-terminated asset URLs.
- The sitemap excludes `/`, share pages, generated images, convenience race routes, and non-page assets. Search Console should discover every generated sitemap URL; the current 13-edition catalog produces 36 URLs.

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
