# Skill: implement

## Invocation

```
/implement <issue-number>
```

## Purpose

Work on a GitHub issue from setup through implementation to a PR, following the dondeteveo branching and commit conventions.

---

## Phase 1: Setup

1. **Fetch issue:**
   ```bash
   gh issue view <issue-number> --repo escobeitor/dondeteveo
   ```

2. **Assign to self:**
   ```bash
   gh issue edit <issue-number> --add-assignee @me --repo escobeitor/dondeteveo
   ```

3. **Apply `status/in-progress` label:**
   ```bash
   gh issue edit <issue-number> --add-label "status/in-progress" --repo escobeitor/dondeteveo
   ```

4. **Determine branch type** from the issue's `type/*` label:

   | Label           | Branch Prefix | Commit Type |
   |-----------------|---------------|-------------|
   | `type/feature`  | `feature/`    | `feat`      |
   | `type/fix`      | `fix/`        | `fix`       |
   | `type/hotfix`   | `fix/`        | `fix`       |
   | `type/chore`    | `chore/`      | `chore`     |
   | `type/docs`     | `docs/`       | `docs`      |
   | `type/refactor` | `refactor/`   | `refactor`  |

5. **Slugify title:** lowercase, replace spaces/special chars with `-`, strip leading/trailing `-`.

6. **Branch name:** `<prefix>/<issue-number>-<slugified-title>`

7. **Create branch:**
   ```bash
   git checkout main && git pull origin main && git checkout -b <branch-name>
   ```

---

## Phase 2: Planning (MANDATORY — do not skip)

1. Display a summary of the issue (title, type, acceptance criteria).
2. Call `EnterPlanMode`.
3. Explore the codebase to understand the relevant areas.
4. Produce a plan with the following sections:
   - **Files to modify** (with paths and reason)
   - **Commit strategy** (aim for a single commit; split only if two genuinely independent concerns exist)
   - **Implementation steps** (ordered)
   - **Risks and edge cases**
   - **Testing strategy**
5. Call `ExitPlanMode` and wait for user approval before proceeding.

---

## Phase 3: Implementation

- Follow the approved plan exactly. Request permission before deviating.
- Complete all changes, then commit. Use a single commit unless two genuinely independent concerns require separation.
- Commit format (Conventional Commits):
  ```
  <type>(<scope>): <short description>
  ```
  See `references/commit-conventions.md` for scope list.
- Validate before committing:
  ```bash
  npm run lint && npm run format:check && npm run check && npm run test:unit && npm run build
  ```
- Fix any validation failures before committing.

---

## Phase 4: PR Creation

1. **Push branch:**
   ```bash
   git push -u origin <branch-name>
   ```

2. **Create PR:**
   ```bash
   gh pr create \
     --repo escobeitor/dondeteveo \
     --title "<conventional-title>" \
     --body "<body>"
   ```

3. **PR body must include:**

   ```markdown
   ## Summary
   <!-- What this PR does -->

   ## Changes
   <!-- Key changes made -->

   ## Test Plan
   - [ ] `npm run lint` passes (CI)
   - [ ] `npm run format:check` passes (CI)
   - [ ] `npm run check` passes (CI)
   - [ ] `npm run test:unit` passes (CI)
   - [ ] `npm run build` succeeds (CI)
   - [ ] E2E smoke tests pass (CI)
   - [ ] Manual testing completed

   ## Docs Impact
   <!-- "docs updated" or "no docs needed" -->

   Closes #<issue-number>
   ```

4. **Apply `status/in-review` label to the issue:**
   ```bash
   gh issue edit <issue-number> --remove-label "status/in-progress" --add-label "status/in-review" --repo escobeitor/dondeteveo
   ```

5. **Report** the PR URL and remind the user:
   > Merge it with `/release <pr-number>`

---

## Phase 5: Code Review

> **Required** for all PRs that change app code, config, CI/CD, or data logic (see CLAUDE.md).
> Runs in the background so it does not block the user after the PR URL is reported.

1. **Run the code review skill** on the newly created PR using the `Skill` tool,
   invoking `code-review` with the PR number as the argument.
   Launch it with `run_in_background: true` (Agent tool) so the user is not blocked.

2. **The code review must be posted to the PR on GitHub** — not just reported in the conversation.
   Use `gh pr review <pr-number> --repo escobeitor/dondeteveo --comment --body "<review>"` to post the
   overall review summary. Add inline comments via the GitHub API (`gh api`) where relevant.

3. **Review behaviour — act as a team developer peer reviewer:**
   - Focus on: correctness, edge cases, adherence to project conventions (CLAUDE.md, commit-conventions.md),
     security, and code quality.
   - Use a constructive, direct tone. Raise only high-confidence issues.
   - Do NOT approve or request-changes — leave as a `COMMENT` review so the human reviewer decides.
   - Do NOT repeat issues already caught by the CI validation step (lint, typecheck, tests).
