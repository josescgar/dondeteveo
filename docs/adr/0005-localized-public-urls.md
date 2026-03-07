# ADR 0005: Localized Public URLs

## Status
- Accepted

## Context
- The site is bilingual and needs clear SEO-friendly routing.

## Decision
- Keep real content under `/en/...` and `/es/...`.
- Redirect `/` by browser language to `/en` or `/es`, fallback `/en`.
- Keep public race URLs country-free and year-based.

## Consequences
- Routing stays predictable.
- Canonical pages remain locale-prefixed.
- Internal data paths can still keep ISO country codes.
