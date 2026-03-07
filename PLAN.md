# Dondeteveo Plan

## Purpose

This document is the current working plan for Dondeteveo. It is detailed enough for another agent or developer to continue planning, refine decisions, or begin implementation.

Current phase: pre-implementation planning. A temporary planning snapshot exists in this file, but the repo still has no implementation work, GitHub issues, templates, workflows, or app code.

---

## Product Summary

Dondeteveo helps amateur runners generate an easily shareable web link so family and friends can know where and approximately when to cheer during a race.

The app is intentionally low-tech for MVP:
- no GPS
- no live tracking
- no user accounts
- no user-generated routes
- no race results ingestion
- no heavy identity requirements

The main user is the amateur runner.
The secondary audience is family and friends, often on mobile and potentially non-technical.

Core job-to-be-done:
- choose a race
- enter target pace or finish time
- generate a shareable link
- let spectators quickly understand where and when to see the runner

---

## MVP Scope

### In Scope
- curated catalog of races
- race discovery as an MVP feature
- discovery via browse, text search, and filters
- filters focused on race name, country, and date
- Spain-first catalog at launch
- bilingual product from day one: Spanish and English
- dedicated SEO-friendly page for every race
- route map with official splits and curated cheer points
- estimated arrival times derived from target pace/finish time
- read-only share page
- optional runner nickname
- mobile-first UI
- About/Contact page
- lightweight Privacy Policy page

### Out of Scope
- live tracking
- GPS/device integration
- user accounts or roles
- user-generated race routes
- race results or race outcomes
- social features
- personalized dashboards
- payments
- heavy back-office tooling in MVP

### Discovery and SEO Scope
- optimize discovery primarily for runners who already know the race they want
- homepage prioritizes direct race search
- every race edition has a dedicated SEO-friendly detail page
- only main listing pages are indexable in MVP; filter and search states are not
- past race editions remain public and indexable

---

## Product Discovery Model

Race discovery is part of MVP, not a secondary feature.

The product should optimize for runners who already know the race they want, while still supporting browsing.

Primary homepage action:
- direct race search

Discovery modes:
- direct search
- browse catalog
- basic filters

SEO implications:
- race discovery pages and race detail pages are strategic and indexable
- personalized share pages are public but always noindex
- past race editions should remain indexable

---

## UX Principles

- mobile-first
- fresh, clear, sport-oriented visual direction
- easy for non-technical spectators
- minimal friction from landing page to shared result
- fast understanding over feature density
- static-first and lightweight by default
- interactive only where truly useful

---

## Locked Technical Decisions

### App Stack
- Astro with islands architecture
- Preact for interactive islands only
- TypeScript with strict mode
- Tailwind CSS
- npm as package manager

### Maps and Data
- Leaflet for map rendering
- GeoJSON for route and point data
- pluggable free basemap provider
- manually curated in-repo race data
- route timings derived from geometry
- route authoring via lightweight browser-based tracing workflow when official GPX/KML is unavailable

### Hosting and Delivery
- GitHub Pages for hosting
- Cloudflare in front of GitHub Pages
- canonical production domain: `dondeteveo.com`
- `www.dondeteveo.com` redirects to apex
- Cloudflare Web Analytics
- SemVer releases from `main`
- Git tags and GitHub Releases with curated changelogs

### Sharing and Privacy
- no backend persistence in MVP
- share state encoded in URL fragment
- fragment contains minimal share state only
- optional runner identity allowed, but product copy should prefer nickname or short name
- shared result pages are always noindex
- all fragment input treated as untrusted input

### Localization and Routing
- all real content lives under `/en/...` and `/es/...`
- `/` redirects by browser language to `/en` or `/es`
- browser-language fallback is `/en`
- language switching should map to the equivalent page in the other locale
- `/en` and `/es` are the canonical localized homepages

---

## Architecture Overview

### Rendering Model
Use Astro for:
- routes
- layouts
- SEO metadata
- static content sections
- discovery pages
- race detail pages
- legal and informational pages

Use Preact only for:
- interactive form controls
- share interactions
- map controls and panels
- small browser-only widgets

Rule:
- Astro first
- Preact only for islands
- avoid building full pages in Preact

### Hydration Strategy
Use the lightest hydration directive that works:
- `client:load` only for immediately interactive critical UI
- `client:idle` for non-critical widgets
- `client:visible` for below-the-fold widgets
- avoid `client:only` unless SSR is impossible

### SEO Strategy
Indexable:
- `/en` and `/es` localized homepages
- `/en/races` and `/es/races` listing pages
- race detail pages
- About/Contact
- Privacy Policy

Not indexable:
- personalized share pages
- listing search and filter states

Routing and canonical rules:
- `/` is a UX entry point only, not a primary SEO page
- canonical pages live under locale-prefixed routes
- convenience race URLs redirect to explicit year-based race pages
- past race editions remain public and indexable

Canonical domain:
- `https://dondeteveo.com`

---

## Information Architecture and Page Model

### Top-Level Pages
- localized homepage
- race discovery page
- race detail pages
- share result pages
- About/Contact
- Privacy Policy

### Language Strategy
Use explicit language prefixes:
- `/es/...`
- `/en/...`

Root behavior:
- `/` redirects to `/es` or `/en` based on browser language
- fallback is `/en`

### Core Page Intent
1. Homepage
   - clear value proposition
   - primary direct race search
   - secondary browse entry points
   - featured or recent races if useful, but not at the expense of search-first UX

2. Discovery Page
   - catalog browsing
   - search input
   - filters by race name, country, date
   - only the main listing page is indexable in MVP

3. Race Detail Page
   - race identity
   - required metadata: name, date, distance, city, start time, timezone, official race website URL
   - course overview
   - CTA to generate a share page
   - indexable for SEO
   - canonical entry point for known races
   - past editions remain public and indexable

4. Share Result Page
   - race route map
   - official splits
   - curated cheer points
   - estimated arrival times
   - optional nickname display
   - share-focused mobile UI
   - noindex
   - only race local time is shown
   - all times must clearly indicate the race timezone

5. Informational Pages
   - About/Contact linking to `https://jerna.digital`
   - lightweight Privacy Policy

### Route Model
Real content routes:
- `/en`
- `/es`
- `/en/races`
- `/es/races`
- `/en/races/<race>`
- `/es/races/<race>`
- `/en/races/<race>/<year>`
- `/es/races/<race>/<year>`
- `/en/share/<race>/<year>#...`
- `/es/share/<race>/<year>#...`

Behavior rules:
- `/en/races/<race>` and `/es/races/<race>` redirect to the next upcoming edition if one exists, otherwise the most recent past edition
- `/en/races/<race>/<year>` and `/es/races/<race>/<year>` are the canonical race edition pages
- race slugs must be globally unique across the full catalog

---

## Data Model and Catalog Structure

Race data is curated and stored in-repo.

### Folder Structure
Use ISO country codes:

- `data/<iso-country>/<race>/<year>/`

Examples:
- `data/es/sevilla-half-marathon/2026/`
- `data/es/madrid-marathon/2026/`

### Files Per Race Edition
Each race edition should contain:
- metadata JSON
- route GeoJSON
- points GeoJSON
- source and provenance JSON

Recommended shape:
- `data/es/<race>/<year>/meta.json`
- `data/es/<race>/<year>/route.geojson`
- `data/es/<race>/<year>/points.geojson`
- `data/es/<race>/<year>/source.json`

### Race Entity Model
Race identity is edition-specific:
- race + year

This avoids ambiguity when courses change between years.

Race slug rules:
- race slugs must be globally unique across the full catalog
- public URLs do not include the country segment even though internal data paths do

### Timing Model
MVP uses constant pace.
Arrival times are derived from route geometry and checkpoint positions.
All predicted times are shown only in race local time.

Required race metadata:
- `name`
- `date`
- `distance`
- `city`
- `startTime`
- `timezone`
- `officialWebsiteUrl`

### Provenance
Every race edition must store source notes:
- official site
- official PDF
- official course map
- imported GPX or KML if available
- editor notes if manual tracing was required

---

## Recommended Repository Structure

```text
.
├── AGENTS.md
├── PLAN.md
├── docs/
│   ├── README.md
│   ├── product.md
│   ├── architecture.md
│   ├── design-system.md
│   ├── data-race-catalog.md
│   ├── engineering.md
│   ├── github-workflow.md
│   ├── security-privacy.md
│   └── adr/
├── data/
│   └── <iso-country>/<race>/<year>/
├── public/
├── src/
│   ├── pages/
│   ├── layouts/
│   ├── components/
│   │   ├── astro/
│   │   └── preact/
│   ├── features/
│   │   └── <feature>/
│   ├── lib/
│   └── styles/
└── tests/
    ├── e2e/
    └── visual/
```

### Feature Co-Location Rule
Feature-specific UI and logic should be co-located.

Example:
```text
src/features/race-planner/
  RacePlannerIsland.tsx
  race-planner.logic.ts
  race-planner.schema.ts
  race-planner.types.ts
  race-planner.test.ts
```

### Test Placement
- unit tests are co-located with feature logic
- e2e and visual tests live in root `tests/`

---

## Coding Standards

### General
- prefer simple, explicit code
- optimize for readability and maintainability
- one module, one clear responsibility
- use early returns over deep nesting
- keep functions and components small

### Naming
- use descriptive names
- avoid vague names like `data`, `value`, `item` when domain names are available
- booleans should read like predicates: `isLoading`, `hasError`, `canShare`

### No Magic Values
- no unexplained magic numbers
- no repeated hardcoded domain strings
- extract repeated literals into named constants

### Shared Domain Values
Use constants plus literal union types rather than TypeScript enums by default.

### TypeScript
- strict mode on
- no `any` unless strongly justified
- validate external input at boundaries
- use explicit domain types
- prefer discriminated unions for variant states

### Exports
- named exports by default for app code
- default exports only where framework conventions naturally expect them

### UI and Logic Separation
- component files focus on rendering and event wiring
- business logic lives outside JSX in sibling logic files
- validation and parsing lives in schema or validation files
- no business rules buried in component templates

### Astro and Preact
- Astro by default
- Preact only for interactive islands
- avoid `preact/compat` unless required by a dependency
- keep Preact state local and minimal
- avoid effects unless syncing with external or browser systems

### Tailwind
- token-driven usage
- avoid ad hoc arbitrary design choices
- extract repeated patterns when readability suffers
- keep component styling intentional and consistent

### Comments
- explain why, not what
- avoid stale or redundant comments
- no commented-out dead code

---

## Testing Strategy

### Unit Tests
Use Vitest for:
- pace calculations
- share state parsing and serialization
- validation
- data loading and transforms
- feature logic
- SEO helper logic
- route and checkpoint calculations

### E2E Tests
Use Playwright for:
- homepage search flow
- discovery flow
- race detail to share generation flow
- shared result rendering
- bilingual route coverage
- privacy and noindex expectations

### Visual Regression
Use focused visual tests only:
- homepage
- race detail page
- share result page

Initial browser coverage:
- Chromium only

---

## CI/CD Plan

### PR Workflow
Run on pull requests:
- install with `npm ci`
- lint
- typecheck
- unit tests
- Astro build
- Playwright smoke tests
- focused visual regression
- upload reports and artifacts on failure

### Main Workflow
Run on push to `main`:
- rerun verification
- deploy only if all checks pass
- deploy to GitHub Pages environment

### Release Workflow
Run on release or tag flow:
- validate released commit or tag
- propose or confirm SemVer bump
- prepare curated release notes
- publish Git tag and GitHub Release

### CI/CD Practices
- use stable unique job names
- use reusable verification workflow where helpful
- no PR previews for MVP workflow
- use `workers: 1` for Playwright in CI for stability
- cache dependencies, not Playwright browsers by default
- production deployment only from `main`

---

## GitHub Workflow Plan

### Work Model
- single milestone: `Initial project planning`
- flat planning task list only
- no GitHub Projects
- use issues, labels, milestones, and PRs
- no GitHub Epics
- no GitHub Phases

### Initial Planning Tasks
- `Task: Documentation bootstrapping`
- `Task: Define product scope, discovery, user flows, and UX baseline`
- `Task: Define architecture, routing, SEO, share URLs, and page model`
- `Task: Define race catalog schema, metadata, timezone rules, and curation workflow`
- `Task: Define engineering standards, project structure, testing, CI/CD, security, and privacy baseline`
- `Task: Define GitHub workflow, templates, branch protection, release rules, and implementation-ready backlog`

### Branching
- one task issue -> one branch -> one PR when possible
- branch naming follows the Conventional Branch specification:
  - `<type>/<description>`

Standard branch types:
- `feat`
- `fix`
- `hotfix`
- `release`
- `chore`

Examples:
- `feat/race-search-homepage`
- `chore/documentation-bootstrapping`
- `fix/timezone-labels`
- `release/v0.1.0`

### Commits and Merging
- conventional commits
- squash merge to `main`
- never merge directly to `main`

### Done Criteria
An issue is done when:
- scope is complete
- acceptance criteria are met
- validations are green
- docs are updated if material changes required it
- PR is approved
- PR is merged

### Reviews
Policy direction:
- PRs required
- at least one human approval
- required checks pass
- resolved conversations
- no direct pushes to `main`

### Templates
Prepare these templates from the start:
- Task issue template
- Bug issue template
- Pull Request template

Issue-writing rule:
- every GitHub issue must be self-contained enough to be worked on without reopening `PLAN.md`
- each issue should include the relevant locked context, expected outputs, acceptance criteria, dependencies, validation expectations, and docs impact
- issues should still stay concise, but not at the expense of missing execution context

### Lean Label Taxonomy
- `type/task`
- `type/bug`
- `area/docs`
- `area/product`
- `area/architecture`
- `area/data`
- `area/engineering`
- `area/workflow`
- `area/security`
- `priority/p0`
- `priority/p1`
- `priority/p2`
- `status/planned`
- `status/ready`
- `status/in-progress`
- `status/blocked`
- `status/in-review`
- `status/done`

---

## Documentation System

Long-lived docs live in `docs/`.
Ephemeral execution and task tracking live in GitHub issues and PRs.

### Planned Docs
- `AGENTS.md`
- `docs/README.md`
- `docs/product.md`
- `docs/architecture.md`
- `docs/design-system.md`
- `docs/data-race-catalog.md`
- `docs/engineering.md`
- `docs/github-workflow.md`
- `docs/security-privacy.md`
- `docs/adr/`

Documentation style rules:
- keep docs concise and decision-first
- avoid duplication across documents
- prefer bullets, checklists, and short sections over long prose
- make docs easy to scan for both humans and agents

### AGENTS.md Principles
`AGENTS.md` should:
- be concise
- act as the operational quick reference for AI agents
- explicitly tell agents not to read all docs every time
- point agents to the minimum relevant docs for each task type
- require checking whether material doc updates are needed before closing work

### Material Doc Update Rule
Update long-lived docs only when there is a material change to:
- product behavior
- scope
- architecture
- workflow
- standards
- security or privacy posture
- data model

PRs should explicitly state either:
- docs updated
- or no docs needed because there was no material change

---

## Security and Privacy Posture

### Main Risks
- untrusted fragment input
- XSS
- privacy leakage via shared links
- third-party exposure to map or analytics providers
- dependency and supply-chain issues
- inaccurate or malformed curated race data

### Mitigations
- strict parse, validate, normalize boundaries
- never render user input as raw HTML
- nickname-first identity policy
- noindex on personalized pages
- keep dependencies lean
- reviewed upgrades only via PR
- provenance notes for race editions
- Cloudflare used for edge hardening and headers

### Privacy Notes
- there is no account system in MVP
- third-party services may still receive IP and referrer data
- privacy disclosures should cover Cloudflare and map providers
- user local time is irrelevant for MVP and should never be shown alongside race times

---

## Initial ADRs To Create

- Astro + Preact islands
- GitHub Pages + Cloudflare
- Leaflet + GeoJSON
- URL fragment share state
- SEO policy: indexable race pages, noindex shared pages

---

## Planning Workstreams

These workstreams organize planning in this document and conversation only. They are not GitHub issue types.

### Documentation Bootstrapping
Define:
- docs structure
- AGENTS.md approach
- ADR usage
- doc update rules

### Product and UX Definition
Define:
- product scope
- user flows
- discovery model
- race page model
- bilingual behavior
- success criteria
- non-goals

### Architecture and Information Architecture
Define:
- route model
- page model
- rendering boundaries
- SEO rules
- share link model
- map and data approach
- custom domain and deployment behavior

### Engineering, Security, and Delivery
Define:
- repo layout
- feature structure
- data layout
- testing layout
- code quality rules
- CI/CD workflows
- threat model
- branch protection configuration

### Execution Readiness
Convert final approved planning into:
- the six flat GitHub planning tasks
- templates
- workflow automation tasks
- implementation tasks
- rich self-contained issue bodies for both planning and implementation tasks

---

## Initial Implementation Backlog

This is the recommended first execution wave after the planning tasks are completed.

1. `Task: Bootstrap documentation and agent guidance`
2. `Task: Bootstrap Astro app, tooling, and base project structure`
3. `Task: Implement OpenCode workflow skills`
4. `Task: Implement localized routing, homepage shells, and SEO baseline`
5. `Task: Implement race catalog schema, loaders, and first sample race edition`
6. `Task: Implement race discovery and race detail pages`
7. `Task: Implement share flow, prediction logic, and share page`
8. `Task: Implement CI/CD, templates, and branch protection configuration`

Recommended first execution order:
- documentation and agent guidance
- Astro/tooling/bootstrap
- OpenCode workflow skills
- localized routing and SEO baseline
- race catalog schema and first sample race
- discovery and race detail pages
- share flow
- CI/CD and workflow hardening

---

## Workflow Skills To Plan

These are documentation and specification targets first, not yet implemented assets.

### issue-intake
- normalize incoming task issue
- confirm scope and acceptance criteria
- identify relevant docs and validation needs
- identify docs impact and dependencies
- ensure the issue is agent-ready before implementation starts

### implementation
- read the issue, `AGENTS.md`, and only the minimum relevant docs
- derive a Conventional Branch-compliant branch name
- produce an implementation plan
- implement code and documentation changes as needed
- run required validations
- verify whether material doc updates are needed
- prepare the PR summary and checklist
- end with a separate-agent code review when the PR changes app code, config, CI/CD, or data logic
- hand off the PR for mandatory human review before merge

### release
- inspect merged PRs since the last tag
- propose the SemVer bump
- draft curated changelog and GitHub Release notes
- prepare the release tag
- verify the release checklist before publishing

Skill design rules:
- keep the skill set limited to `issue-intake`, `implementation`, and `release`
- docs-only changes may skip separate-agent code review
- any code, config, CI/CD, or data-logic change must include separate-agent code review before human review

---

## Immediate Next Planning Work

1. create the planning issues in GitHub under the `Initial project planning` milestone
2. create the lean labels and templates in GitHub
3. create the implementation backlog issues after planning tasks are approved

---

## Open Decisions

No major information architecture or routing decisions are currently open.

Current source of truth:
- `/` redirects by browser language to `/en` or `/es`, fallback `/en`
- `/en` and `/es` are canonical localized homepages
- `/en/races` and `/es/races` are the indexable listing pages
- `/en/races/<race>` and `/es/races/<race>` are convenience redirects to the most relevant edition
- `/en/races/<race>/<year>` and `/es/races/<race>/<year>` are canonical race edition pages
- `/en/share/<race>/<year>#...` and `/es/share/<race>/<year>#...` are non-indexable share pages
- internal data paths remain `data/<iso-country>/<race>/<year>/`

---
