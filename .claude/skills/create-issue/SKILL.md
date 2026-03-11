# Skill: create-issue

## Invocation

```
/create-issue <type> <title>
```

## Purpose

Create a GitHub issue on `josescgar/dondeteveo` with the correct labels, structured body, and branch/commit guidance.

## Type Configuration

| Type       | Label           | Branch Prefix | Commit Type | Use Case               |
| ---------- | --------------- | ------------- | ----------- | ---------------------- |
| `feature`  | `type/feature`  | `feature/`    | `feat`      | New functionality      |
| `fix`      | `type/fix`      | `fix/`        | `fix`       | Bug fixes              |
| `hotfix`   | `type/hotfix`   | `fix/`        | `fix`       | Urgent production bugs |
| `chore`    | `type/chore`    | `chore/`      | `chore`     | Maintenance tasks      |
| `docs`     | `type/docs`     | `docs/`       | `docs`      | Documentation updates  |
| `refactor` | `type/refactor` | `refactor/`   | `refactor`  | Code restructuring     |

- `hotfix` automatically gets `priority/p0`.
- All issues get `status/planned`.

## Additional Labels (interactive)

- **Area** (pick one): `area/docs`, `area/product`, `area/architecture`, `area/data`, `area/engineering`, `area/workflow`, `area/security`
- **Priority** (pick one): `priority/p0`, `priority/p1`, `priority/p2` — hotfix defaults to `priority/p0`

## Steps

1. **Validate** — confirm `<type>` is one of: feature, fix, hotfix, chore, docs, refactor. Confirm `<title>` is present.
2. **Ask clarifying questions** — use `AskUserQuestion` for ALL type-specific questions (not just area/priority). Batch max 4 questions per call. See the per-type batching guide below.

   **Before calling AskUserQuestion:** read `<type>` and `<title>` and infer 2–4 specific, plausible options for each open-ended question based on what the title implies. Options should reflect the actual issue, not generic templates. Area and priority always use their fixed label values.

3. **Ensure labels exist** — for each label to be applied:
   ```bash
   gh label create "<label>" --repo josescgar/dondeteveo 2>/dev/null || true
   ```
4. **Generate issue body** — use the matching template from `references/issue-templates.md`, filled with answers.
5. **Create the issue**:
   ```bash
   gh issue create \
     --repo josescgar/dondeteveo \
     --title "<title>" \
     --body "<body>" \
     --label "type/<type>,area/<area>,priority/<priority>,status/planned"
   ```
6. **Report** — output the issue URL and remind the user:
   > Start working on it with `/implementation <issue-number>`

## Per-type Batching Guide

For all open-ended questions marked _(infer options)_, derive 2–4 specific, plausible options from the `<title>` before calling `AskUserQuestion`. Options should reflect what the title implies, not generic templates.

### `feature` — 2 rounds

**Round 1** (4 questions):

1. _What problem does this solve?_ — _(infer options)_
2. _What is the expected deliverable?_ — _(infer options)_
3. _Which area?_ — fixed: "area/product", "area/engineering", "area/data", "area/architecture"
4. _Priority?_ — fixed: "priority/p1 (high)", "priority/p2 (low)", "priority/p0 (critical)"

**Round 2** (3 questions): 5. _Acceptance criteria_ (multiSelect) — _(infer options)_ 6. _Dependencies?_ — fixed: "No dependencies", "Depends on another open issue (specify in body)" 7. _Docs updates needed?_ — fixed: "No docs needed", "Update existing docs", "New docs section needed"

---

### `fix` — 2 rounds

**Round 1** (4 questions):

1. _Expected behavior?_ — _(infer options)_
2. _Actual behavior?_ — _(infer options)_
3. _Which area?_ — fixed: "area/product", "area/engineering", "area/data", "area/architecture"
4. _Priority?_ — fixed: "priority/p1 (high)", "priority/p2 (low)", "priority/p0 (critical)"

**Round 2** (3 questions): 5. _Steps to reproduce?_ — _(infer options)_ 6. _Error messages or logs?_ — fixed: "No errors — visual/functional bug", "Console error (will specify in body)", "Build or type error (will specify in body)" 7. _Dependencies?_ — fixed: "No dependencies", "Depends on another open issue (specify in body)"

---

### `hotfix` — 1 round (4 questions)

1. _User/business impact?_ — _(infer options)_
2. _Suspected root cause?_ — _(infer options)_
3. _Temporary workaround available?_ — fixed: "No workaround", "Workaround exists (will describe in body)"
4. _Which area?_ — fixed: "area/product", "area/engineering", "area/data", "area/architecture"

_(priority auto-set to p0)_

---

### `chore` — 2 rounds

**Round 1** (4 questions):

1. _What tasks need to be done?_ — _(infer options)_
2. _Breaking changes?_ — fixed: "No breaking changes", "Breaking changes (will describe in body)"
3. _Which area?_ — fixed: "area/engineering", "area/product", "area/workflow", "area/data"
4. _Priority?_ — fixed: "priority/p2 (low)", "priority/p1 (high)", "priority/p0 (critical)"

**Round 2** (1 question): 5. _Expected outcome?_ — _(infer options)_

---

### `docs` — 2 rounds

**Round 1** (4 questions):

1. _What needs to be documented?_ — _(infer options)_
2. _Target audience?_ — fixed: "Developers on the project", "Future Claude Code agents", "External contributors", "End users"
3. _Which area?_ — fixed: "area/docs", "area/engineering", "area/architecture", "area/workflow"
4. _Priority?_ — fixed: "priority/p2 (low)", "priority/p1 (high)", "priority/p0 (critical)"

**Round 2** (1 question): 5. _Related code changes this depends on?_ — fixed: "No dependencies", "Depends on another issue (specify in body)"

---

### `refactor` — 2 rounds

**Round 1** (4 questions):

1. _Current state?_ — _(infer options)_
2. _Target state?_ — _(infer options)_
3. _Which area?_ — fixed: "area/engineering", "area/architecture", "area/product", "area/data"
4. _Priority?_ — fixed: "priority/p2 (low)", "priority/p1 (high)", "priority/p0 (critical)"

**Round 2** (2 questions): 5. _Rationale?_ — _(infer options)_ 6. _Changes externally observable behavior?_ — fixed: "No behavior changes", "Minor behavior changes (will describe in body)"
