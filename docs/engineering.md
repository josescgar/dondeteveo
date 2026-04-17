# Engineering

## Principles

- Prefer simple, explicit code.
- Keep modules focused.
- Optimize for readability and maintainability first.

## Code Rules

- No magic numbers or repeated hardcoded domain strings.
- Use named constants.
- Prefer constants + literal union types for shared domain values.
- Use named exports by default.
- Keep components thin.
- Move business logic out of JSX into co-located logic files.

## TypeScript

- Strict mode on
- No `any` without strong justification
- Validate external input at boundaries

## Astro And Preact

- Astro by default
- Preact only for interactive islands
- Avoid `preact/compat` unless required by a dependency
- Use the lightest hydration directive that works

## Project Structure

- Unit tests are co-located with feature logic.
- E2E tests live under root `tests/`.
- Shared generic code lives in `src/lib/`.

## Testing

- Vitest for logic, parsing, validation, and transforms
- Playwright for smoke E2E flows

## Toolchain

- Node.js `>=22.12.0`

## Pre-commit Hooks

Configured via Husky + lint-staged. Runs automatically on `git commit`:

- `*.{js,mjs,cjs,ts,mts,cts,jsx,tsx,astro}` → ESLint fix + Prettier format
- `*.{json,md,css,yml,yaml}` → Prettier format only

Prevents lint and format regressions from reaching CI.

## CI/CD Baseline

- Branch pushes run `quality` only (lint, typecheck, unit tests, build) — fast feedback, no browser overhead
- PRs run the full suite: `quality` → `e2e-smoke` (depends on `quality`)
- All jobs run on `ubuntu-latest`; no macOS runners
- Deploy is currently disabled (stubbed in `ci.yml`)

## Dependency Hygiene

- Keep dependencies lean
- Review upgrades via PR
- Commit the lockfile
