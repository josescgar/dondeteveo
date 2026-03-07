# Docs

## Purpose

- Long-lived project knowledge lives here.
- Issues and PRs track execution; these docs track durable decisions.

## Style Rules

- Keep docs concise and decision-first.
- Prefer bullets and short sections over long prose.
- Avoid duplication; link to related docs instead of repeating them.

## Read Only What You Need

- Do not read all docs by default.
- Start with `AGENTS.md`, then read only the docs relevant to the task.

## Documents

- `docs/product.md`: product scope, discovery, user flows, glossary
- `docs/architecture.md`: app architecture, routing, SEO, share URLs, repo structure
- `docs/design-system.md`: UX principles, visual tokens, component rules
- `docs/data-race-catalog.md`: race schema, file contract, provenance, curation
- `docs/engineering.md`: coding standards, testing, CI/CD, performance basics
- `docs/github-workflow.md`: labels, templates, branches, reviews, releases, skills
- `docs/security-privacy.md`: threat model, privacy posture, input safety
- `docs/adr/README.md`: ADR process and index

## Update Rule

- Update docs only for material changes to product behavior, scope, architecture, workflow, standards, security/privacy posture, or data model.

## ADR Index

- `docs/adr/0001-astro-preact-islands.md`
- `docs/adr/0002-github-pages-cloudflare.md`
- `docs/adr/0003-leaflet-geojson.md`
- `docs/adr/0004-fragment-share-state.md`
- `docs/adr/0005-localized-public-urls.md`
