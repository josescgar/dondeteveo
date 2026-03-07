# AGENTS

## Purpose
- `Dondeteveo` helps amateur runners share a simple link so spectators know where and when to cheer during a race.
- MVP is intentionally low-tech: no GPS, live tracking, accounts, user-generated routes, or race results.

## Core Product Rules
- Race discovery is part of MVP.
- Primary homepage action is direct race search.
- Every race edition has a dedicated SEO page.
- Share pages are public by URL and always `noindex`.
- Only race local time is shown. Never show viewer local time.

## Stack And Architecture
- Astro first.
- Preact only for interactive islands.
- Tailwind for styling.
- TypeScript in strict mode.
- Leaflet + GeoJSON for maps.
- GitHub Pages behind Cloudflare.

## Coding Rules
- Keep UI thin and move business logic into co-located `*.logic.ts` or similar files.
- Validate all external input at boundaries, especially URL fragment state.
- No magic numbers or repeated hardcoded domain strings.
- Prefer constants + literal union types over scattered strings or TypeScript enums.
- Use named exports by default. Only use default exports where framework conventions expect them.
- Update docs only when there is a material change.

## Workflow Rules
- Never work directly on `main`.
- Use Conventional Branch naming: `<type>/<description>`.
- Use Conventional Commits.
- Implementation PRs that change app code, config, CI/CD, or data logic must end with a separate-agent code review before human review.

## Docs Map
- `docs/README.md`: doc index and when to read each doc
- `docs/product.md`: product scope, discovery, flows, and glossary
- `docs/architecture.md`: routing, SEO, app boundaries, and structure
- `docs/design-system.md`: UX and visual rules
- `docs/data-race-catalog.md`: race data model and curation workflow
- `docs/engineering.md`: code standards, testing, and CI/CD
- `docs/github-workflow.md`: GitHub process, templates, labels, branches, and releases
- `docs/security-privacy.md`: threat model and privacy rules
- `docs/adr/README.md`: ADR rules and index

## How To Read Docs
- Start here, then read only the smallest relevant set of docs for your task.
- Do not read every document by default.
- For routing or SEO work, read `docs/architecture.md` and `docs/security-privacy.md`.
- For race data work, read `docs/data-race-catalog.md`.
- For code structure, testing, or CI work, read `docs/engineering.md`.
- For issue, PR, or release workflow, read `docs/github-workflow.md`.

## Doc Update Rule
- Update long-lived docs only for material changes to product behavior, scope, architecture, workflow, standards, security/privacy posture, or data model.
- If no material change happened, explicitly note `no docs needed` in the PR summary.

## Done Check
- Scope complete
- Acceptance criteria met
- Validations run
- Docs updated or explicitly not needed
- Code review completed when applicable
- Ready for human review
