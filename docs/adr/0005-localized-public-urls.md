# ADR 0005: Localized Public URLs

## Status

- Accepted

## Context

- The site is bilingual and needs clear SEO-friendly routing.

## Decision

- Keep real content under `/en/...` and `/es/...`.
- Permanently redirect `/` to `/es/`; do not negotiate language in the browser.
- Use slash-terminated URLs for every localized content page.
- Keep public race URLs country-free and year-based.

## Consequences

- Routing stays predictable.
- Canonical pages remain locale-prefixed.
- Canonical metadata, alternate links, sitemap entries, and internal links share one final URL form.
- Cloudflare owns the production HTTP redirect because GitHub Pages serves static output.
- Users select English explicitly through the language switch, which maps equivalent pages and preserves share fragments.
- Internal data paths can still keep ISO country codes.
