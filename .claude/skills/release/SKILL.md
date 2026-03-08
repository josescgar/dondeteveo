# Skill: release

## Invocation

```
/release <pr-number>
```

## Purpose

Validate, version, squash-merge, tag, publish a GitHub Release, close the related issue, and clean up the branch.

---

## Phase 1: Validation

1. **Fetch PR details:**
   ```bash
   gh pr view <pr-number> \
     --repo escobeitor/dondeteveo \
     --json number,title,body,state,mergeable,isDraft,headRefName,commits
   ```

2. **Checks — abort if any fail:**
   - `isDraft` must be `false`
   - `state` must be `OPEN`
   - `mergeable` must be `MERGEABLE`

3. **Parse linked issue** from PR body — look for `Closes #<N>` or `Fixes #<N>`.

4. **Confirm with user** — display PR title, branch, linked issue, and ask to proceed.

---

## Phase 2: Versioning

1. **Get latest release tag:**
   ```bash
   gh release list --repo escobeitor/dondeteveo --limit 1 --json tagName
   ```
   If no releases exist, current version is `0.1.0` and previous tag is `(none)`.

2. **Ask the user** (via `AskUserQuestion`):
   - Show current version and commit list from the PR.
   - Ask: patch, minor, or major? (See `references/semver-guide.md` for rules.)

3. **Compute next version** from the answer.

---

## Phase 3: Release

1. **Squash merge:**
   ```bash
   gh pr merge <pr-number> \
     --repo escobeitor/dondeteveo \
     --squash \
     --delete-branch=false
   ```

2. **Generate changelog** from PR commits and description. Categories:

   | Category   | Commit types                  |
   |------------|-------------------------------|
   | Added      | `feat`                        |
   | Changed    | `refactor`, `perf`, `style`   |
   | Fixed      | `fix`                         |
   | Security   | security-related fixes        |
   | Chore      | `chore`, `build`, `ci`, `deps`|

   See `references/changelog-template.md` for the full format.

3. **Create GitHub Release:**
   ```bash
   gh release create v<version> \
     --repo escobeitor/dondeteveo \
     --title "v<version>" \
     --notes "<changelog>" \
     --latest
   ```

   Append to changelog notes:
   ```
   **Full changelog:** https://github.com/escobeitor/dondeteveo/compare/v<prev>...v<new>
   ```
   If this is the first release, omit the compare link.

4. **Note:** The `release.yml` workflow will trigger automatically on tag push and run the full validation suite: lint, format check, Astro check, unit tests, build, E2E smoke tests, and visual regression tests.

---

## Phase 4: Cleanup

1. **Close the linked issue** with a comment:
   ```bash
   gh issue comment <issue-number> \
     --repo escobeitor/dondeteveo \
     --body "Released in [v<version>](https://github.com/escobeitor/dondeteveo/releases/tag/v<version>)."

   gh issue close <issue-number> \
     --repo escobeitor/dondeteveo \
     --reason completed
   ```

2. **Ask the user** whether to delete the branch.

3. If yes:
   ```bash
   git push --no-verify origin --delete <branch-name>
   ```

4. **Final summary** — output:
   - Release URL
   - Issue URL (closed)
   - Next step: pull `main` locally
   ```bash
   git checkout main && git pull origin main
   ```
