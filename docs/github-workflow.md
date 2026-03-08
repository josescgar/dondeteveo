# GitHub Workflow

## Planning Model

- Single milestone: `Initial project planning`
- Flat task issue list
- No GitHub epics
- No GitHub phases

## Labels

- `type/feature`, `type/fix`, `type/hotfix`, `type/chore`, `type/docs`, `type/refactor`
- `area/docs`, `area/product`, `area/architecture`, `area/data`, `area/engineering`, `area/workflow`, `area/security`
- `priority/p0`, `priority/p1`, `priority/p2`
- `status/planned`, `status/ready`, `status/in-progress`, `status/blocked`, `status/in-review`, `status/done`

## Issue Writing

- Issues should be self-contained enough to work on without reopening `PLAN.md`.
- Keep issue bodies concise, but include locked context, expected outputs, acceptance criteria, dependencies, validation, and docs impact.

## Branching

- Conventional Branch format: `<type>/<description>`
- Standard types: `feature`, `fix`, `hotfix`, `chore`, `docs`, `refactor`, `release`

## Pull Requests

- One task issue -> one branch -> one PR when possible
- Use Conventional Commits
- Squash merge only
- Never merge directly to `main`
- PRs must say either `docs updated` or `no docs needed`

## Review Rules

- Human review required before merge
- Separate-agent code review required for PRs that change app code, config, CI/CD, or data logic
- Docs-only changes may skip separate-agent code review

## Branch Protection Baseline

- PR required for `main`
- 1 approval required
- Resolved conversations required
- Required checks required
- Linear history required
- No direct pushes

## Templates

- Issue templates (feature, fix, hotfix, chore, docs, refactor)
- Pull Request template

## Required Checks

- `quality`
- `e2e-smoke`
- `visual-regression`

## Releases

- Releases come from `main`
- SemVer tags
- Curated GitHub Releases

## Skills

- `create-issue`
- `implement`
- `release`
