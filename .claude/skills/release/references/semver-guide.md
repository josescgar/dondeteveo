# SemVer Guide

## Format

```
v<MAJOR>.<MINOR>.<PATCH>
```

---

## Rules

| Increment | When                                                                 |
|-----------|----------------------------------------------------------------------|
| **PATCH** | Backwards-compatible bug fixes only (`fix` commits)                  |
| **MINOR** | New backwards-compatible functionality (`feat` commits)              |
| **MAJOR** | Breaking changes (any commit with `!` or `BREAKING CHANGE:` footer)  |

When in doubt, prefer the **higher** increment.

---

## Pre-1.0 Versioning (current state)

dondeteveo is pre-1.0 (`0.x.y`). Under pre-1.0:

- `0.x.y` — the public API is not yet stable.
- A `MINOR` bump (`0.x+1.0`) may include breaking changes.
- Use judgement: if the change feels breaking, bump `MINOR`; if it is purely additive, bump `PATCH`.
- Reserve `1.0.0` for when the product is publicly stable.

---

## Examples

| Current | Change type       | Next    |
|---------|-------------------|---------|
| `0.1.0` | Bug fix           | `0.1.1` |
| `0.1.0` | New feature       | `0.2.0` |
| `0.1.1` | Bug fix           | `0.1.2` |
| `0.2.0` | Breaking refactor | `0.3.0` |
| `0.9.0` | Stable release    | `1.0.0` |

---

## Changelog Categories by Commit Type

| Category | Commit types                         |
|----------|--------------------------------------|
| Added    | `feat`                               |
| Changed  | `refactor`, `perf`, `style`          |
| Fixed    | `fix`                                |
| Security | security fixes (note in body)        |
| Chore    | `chore`, `build`, `ci`, `deps`       |

---

## References

- [Semantic Versioning 2.0.0](https://semver.org/)
- [Keep a Changelog](https://keepachangelog.com/)
- Releases: `https://github.com/josescgar/dondeteveo/releases`
