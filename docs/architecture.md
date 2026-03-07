# Architecture

## Core Decisions

- Astro first
- Preact only for interactive islands
- GitHub Pages behind Cloudflare
- Leaflet + GeoJSON
- No backend persistence in MVP
- Share state encoded in the URL fragment

## Public Routing

- `/` redirects by browser language to `/en` or `/es`, fallback `/en`
- Canonical localized homepages: `/en`, `/es`
- Listing pages: `/en/races`, `/es/races`
- Convenience race URLs: `/en/races/<race>`, `/es/races/<race>`
- Canonical race edition pages: `/en/races/<race>/<year>`, `/es/races/<race>/<year>`
- Share pages: `/en/share/<race>/<year>#...`, `/es/share/<race>/<year>#...`

## Routing Rules

- Public URLs do not include country.
- Race slugs must be globally unique.
- Convenience race URLs redirect to the next upcoming edition if available, otherwise the most recent past edition.
- Language switching should map directly to the equivalent page in the other locale.

## SEO Rules

- Indexable: localized homepages, listing pages, race edition pages, About/Contact, Privacy Policy
- Non-indexable: share pages, search states, filter states
- Past editions remain public and indexable.
- Canonical domain: `https://dondeteveo.com`

## Rendering Boundaries

- Use Astro for pages, layouts, SEO metadata, and static sections.
- Use Preact for interactive inputs, share interactions, and map controls.
- Use the lightest hydration directive that works.

## Share Model

- MVP uses URL fragment state only.
- Fragment data is untrusted and must be parsed and validated before use.
- Share pages are always `noindex`.

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
