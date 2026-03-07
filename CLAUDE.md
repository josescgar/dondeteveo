# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What This Project Is

`Dondeteveo` ("where do I see you") is a race-day cheering planner. Runners share a link so spectators know where and when to cheer during a race. No GPS, live tracking, accounts, or user-generated routes — intentionally low-tech MVP.

## Core Product Rules

- Race discovery is part of MVP.
- Primary homepage action is direct race search.
- Every race edition has a dedicated SEO page.
- Share pages are public by URL and always `noindex`.
- Only race local time is shown. Never show viewer local time.

## Commands

```bash
npm run dev          # Start Astro dev server
npm run build        # Build for production
npm run check        # Astro type check
npm run lint         # ESLint
npm run format       # Prettier write
npm run format:check # Prettier check

npm run test:unit    # Vitest (unit tests only)
npm run test:e2e     # Playwright e2e smoke tests
npm run test:visual  # Playwright visual regression
npm run test         # All three above

# Run a single unit test file
npx vitest run src/features/share-planner/share-planner.test.ts
```

## Architecture

### Stack

- **Astro** for pages, layouts, SEO, and static content
- **Preact** only for interactive islands (never use `preact/compat` unless forced by a dep)
- **Tailwind v4** via `@tailwindcss/vite`
- **Leaflet + GeoJSON** for maps
- **Zod** for all schema validation
- **TypeScript strict mode** throughout
- Deployed to **GitHub Pages behind Cloudflare**

### Routing

All pages are under `src/pages/[locale]/` (locales: `en`, `es`). The root `src/pages/index.astro` redirects by browser language. URL structure:

- `/en` or `/es` — homepage
- `/en/races` — race listing
- `/en/races/<race>` — redirects to the next upcoming or most recent past edition
- `/en/races/<race>/<year>` — canonical race edition page (SEO-indexed)
- `/en/share/<race>/<year>#...` — share page (always `noindex`, state in URL fragment)

Public URLs **never** include the country code. Race slugs must be globally unique.

### Share State

Share pages encode runner state (pace/finish-time/nickname) in the URL fragment as `URLSearchParams`. This is untrusted input and must be validated via `parseShareState()` in `src/lib/share/share-state.ts` before use.

### Feature Structure

Each feature lives in `src/features/<feature>/` with three co-located files:

- `*.logic.ts` — pure business logic
- `*.test.ts` — unit tests (Vitest)
- `*Island.tsx` — Preact interactive island

Features: `race-discovery`, `race-map`, `share-planner`, `share-view`.

### Shared Libraries (`src/lib/`)

- `config.ts` — constants, supported locales, fragment key names
- `i18n.ts` — `getDictionary(locale)` for all UI strings
- `seo.ts` — SEO metadata helpers
- `format.ts` — formatting utilities
- `races/schemas.ts` — Zod schemas for race data (`RaceMeta`, `RaceSource`, GeoJSON types)
- `races/catalog.ts` — loads race editions from `data/`
- `races/localized.ts` — locale-aware race data helpers
- `races/points.ts` — checkpoint/timing logic
- `share/share-state.ts` — serialize/parse URL fragment share state

### Race Data (`data/`)

```
data/<iso-country>/<race-slug>/<year>/
  meta.json       # name, date, distanceKm, city, startTime, timezone, officialWebsiteUrl, summary, heroNote
  route.geojson   # LineString route
  points.geojson  # split and cheer-point Features
  source.json     # provenance: where the route data came from
```

Internal paths include the ISO country; public URLs do not. Preserve past editions — never overwrite them.

## Coding Rules

- Keep Preact island components thin; business logic belongs in co-located `*.logic.ts` files.
- Use named exports by default. Default exports only where Astro conventions require them.
- Prefer constants and literal union types over enums or scattered strings.
- Validate all external input at boundaries — especially URL fragment state and race data files.
- Only show race local time in the UI. Never show viewer local time.
- Use the lightest hydration directive that works (`client:load`, `client:visible`, etc.).

## Workflow Rules

- Never work directly on `main`.
- Branch naming: `<type>/<description>` (Conventional Commits style).
- Implementation PRs that change app code, config, CI/CD, or data logic must include a code review agent pass before human review.

## Docs

Read only the smallest relevant set for your task. Do not read all docs by default.

- `docs/architecture.md` — routing, SEO, rendering boundaries; read for routing or SEO work
- `docs/data-race-catalog.md` — race data model and curation workflow; read for race data work
- `docs/engineering.md` — code standards, testing, CI/CD; read for code structure, testing, or CI work
- `docs/github-workflow.md` — PR/issue/release process; read for issue, PR, or release workflow
- `docs/security-privacy.md` — threat model and privacy rules
- `docs/adr/` — architecture decision records

## Doc Update Rule

Update docs only for material changes to product behavior, scope, architecture, workflow, standards, security/privacy posture, or data model. If no material change happened, note `no docs needed` in the PR summary.

## Done Check

Before marking work complete:

- Scope complete and acceptance criteria met
- Validations run (lint, typecheck, tests as applicable)
- Docs updated or explicitly noted as not needed
- Code review completed when applicable
- Ready for human review
