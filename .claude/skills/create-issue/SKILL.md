# Skill: create-issue

## Invocation

```
/create-issue <type> <title>
```

## Purpose

Create a GitHub issue on `escobeitor/dondeteveo` with the correct labels, structured body, and branch/commit guidance.

## Type Configuration

| Type       | Label            | Branch Prefix | Commit Type | Use Case               |
|------------|------------------|---------------|-------------|------------------------|
| `feature`  | `type/feature`   | `feature/`    | `feat`      | New functionality      |
| `fix`      | `type/fix`       | `fix/`        | `fix`       | Bug fixes              |
| `hotfix`   | `type/hotfix`    | `fix/`        | `fix`       | Urgent production bugs |
| `chore`    | `type/chore`     | `chore/`      | `chore`     | Maintenance tasks      |
| `docs`     | `type/docs`      | `docs/`       | `docs`      | Documentation updates  |
| `refactor` | `type/refactor`  | `refactor/`   | `refactor`  | Code restructuring     |

- `hotfix` automatically gets `priority/p0`.
- All issues get `status/planned`.

## Additional Labels (interactive)

- **Area** (pick one): `area/docs`, `area/product`, `area/architecture`, `area/data`, `area/engineering`, `area/workflow`, `area/security`
- **Priority** (pick one): `priority/p0`, `priority/p1`, `priority/p2` — hotfix defaults to `priority/p0`

## Clarifying Questions by Type

### `feature`
1. What problem does this solve or what opportunity does it address?
2. What is the expected output or deliverable?
3. What are the acceptance criteria?
4. Which area label applies?
5. What priority? (p0/p1/p2)
6. Are there dependencies on other issues?
7. Does this require docs updates?

### `fix`
1. What is the expected behavior?
2. What is the actual (broken) behavior?
3. Steps to reproduce?
4. Any error messages or logs?
5. Which area label applies?
6. What priority? (p0/p1/p2)
7. Are there dependencies on other issues?

### `hotfix`
1. What is the user or business impact?
2. What is the suspected root cause?
3. Is there a temporary workaround available?
4. Which area label applies? (priority defaults to p0)

### `chore`
1. What tasks need to be done?
2. Are there any breaking changes?
3. What is the expected outcome?
4. Which area label applies?
5. What priority? (p0/p1/p2)

### `docs`
1. What needs to be documented?
2. Who is the target audience?
3. Are there related code changes this docs work depends on?
4. Which area label applies?
5. What priority? (p0/p1/p2)

### `refactor`
1. What is the current state of the code?
2. What is the target state?
3. What is the rationale for refactoring?
4. Does this change any externally observable behavior?
5. Which area label applies?
6. What priority? (p0/p1/p2)

## Steps

1. **Validate** — confirm `<type>` is one of: feature, fix, hotfix, chore, docs, refactor. Confirm `<title>` is present.
2. **Ask clarifying questions** — use `AskUserQuestion` to gather type-specific context.
3. **Ensure labels exist** — for each label to be applied:
   ```bash
   gh label create "<label>" --repo escobeitor/dondeteveo 2>/dev/null || true
   ```
4. **Generate issue body** — use the matching template from `references/issue-templates.md`, filled with answers.
5. **Create the issue**:
   ```bash
   gh issue create \
     --repo escobeitor/dondeteveo \
     --title "<title>" \
     --body "<body>" \
     --label "type/<type>,area/<area>,priority/<priority>,status/planned"
   ```
6. **Report** — output the issue URL and remind the user:
   > Start working on it with `/implementation <issue-number>`
