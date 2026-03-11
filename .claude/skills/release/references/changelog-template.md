# Changelog Template

## Format

```markdown
## v<version> — <YYYY-MM-DD>

### Added
- feat(scope): description (#<issue>) — brief explanation

### Changed
- refactor(scope): description (#<issue>)

### Fixed
- fix(scope): description (#<issue>)

### Security
- fix(scope): patch for XSS in venue search (#<issue>)

### Chore
- chore(deps): upgrade astro to 5.x (#<issue>)
- ci: add visual regression step (#<issue>)

**Full changelog:** https://github.com/josescgar/dondeteveo/compare/v<prev>...v<new>
```

---

## Rules

- List only user-visible or operationally significant changes.
- Omit categories that have no entries.
- Link every entry to its issue number.
- Use imperative mood ("add", "fix", "remove" — not "added", "fixed").
- Keep entries to one line where possible; add a sub-bullet for important detail.

---

## First Release Example

```markdown
## v0.1.0 — 2026-03-08

### Added
- feat(map): interactive Leaflet map with venue markers (#3)
- feat(search): filter venues by category and name (#5)
- feat(venue): venue card and detail view (#7)
- feat(seo): sitemap and Open Graph meta tags (#9)

### Chore
- chore(config): Astro + Tailwind project bootstrap (#1)
- ci: GitHub Actions workflow for quality, E2E, and visual regression (#2)
```

---

## Subsequent Release Example

```markdown
## v0.2.0 — 2026-04-01

### Added
- feat(map): cluster markers for dense venue areas (#14)

### Fixed
- fix(search): correct filter reset when navigating back (#17)

### Chore
- chore(deps): upgrade astro to 5.2 (#19)

**Full changelog:** https://github.com/josescgar/dondeteveo/compare/v0.1.0...v0.2.0
```
