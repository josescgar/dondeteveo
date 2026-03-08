# Commit Conventions

## Format

```
<type>(<scope>): <short description>

[optional body]

[optional footer: "Closes #<issue-number>"]
```

- Subject line: imperative mood, no period, max 72 chars.
- Body: explain *what* and *why*, not *how*.
- Footer: reference the issue on the final commit of a feature branch.

---

## Types

| Type       | When to use                                      |
|------------|--------------------------------------------------|
| `feat`     | New feature or user-visible behavior             |
| `fix`      | Bug fix                                          |
| `chore`    | Maintenance with no behavior change              |
| `docs`     | Documentation only                               |
| `refactor` | Code restructure, no behavior change             |
| `test`     | Adding or fixing tests                           |
| `style`    | Formatting, whitespace (no logic change)         |
| `perf`     | Performance improvement                          |
| `ci`       | CI/CD configuration                              |
| `build`    | Build system or tooling changes                  |
| `revert`   | Reverting a previous commit                      |

---

## Scopes

### Component / page

| Scope    | Covers                              |
|----------|-------------------------------------|
| `map`    | Leaflet map component               |
| `search` | Search and filter functionality     |
| `venue`  | Venue cards or detail views         |
| `layout` | Layout components                   |
| `ui`     | General UI components               |

### Infrastructure

| Scope    | Covers                                        |
|----------|-----------------------------------------------|
| `data`   | Data schemas, Zod models                      |
| `config` | Astro / Vite / Tailwind configuration         |
| `deps`   | Dependency additions or upgrades              |
| `build`  | Build configuration                           |
| `test`   | Test configuration or utilities               |
| `seo`    | SEO, sitemap                                  |
| `styles` | Global styles, Tailwind tokens                |
| `i18n`   | Internationalization                          |

---

## Examples

```
feat(map): add cluster markers for dense venue areas

fix(search): correct filter reset when navigating back

chore(deps): upgrade astro to 5.x

docs(seo): update sitemap generation notes

refactor(venue): extract card component from inline template

test(search): add unit tests for filter logic

ci: add visual regression step to PR workflow
```

---

## Breaking Changes

Append `!` after the type/scope and add a `BREAKING CHANGE:` footer:

```
feat(data)!: rename venue slug field to id

BREAKING CHANGE: `venue.slug` is now `venue.id` — update all consumers.
```
