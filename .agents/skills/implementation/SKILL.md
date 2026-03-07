---
name: implementation
description: Execute a task end-to-end in this repository. Use this skill when implementing approved work, including coding, doc sync, validations, PR preparation, and the required separate-agent code review gate.
license: Complete terms in LICENSE.txt
---

Use this skill to execute a task from start to PR-ready handoff.

## Required Reads

- the GitHub issue
- `AGENTS.md`
- only the minimum relevant docs for the task area

## Workflow

1. restate the goal and constraints
2. derive a Conventional Branch name in the format `<type>/<description>`
3. plan the work before editing
4. implement code and docs changes as needed
5. run the required validations
6. decide whether docs changed materially or `no docs needed`
7. prepare the PR summary
8. trigger a separate-agent code review when the PR changes app code, config, CI/CD, or data logic
9. hand off for mandatory human review before merge

## Rules

- keep UI thin and move business logic into co-located logic files
- validate external input at boundaries
- do not read all docs by default
- update long-lived docs only for material changes
- docs-only changes may skip the separate-agent code review step

## Output

- implemented task
- validations run
- docs updated or explicitly not needed
- PR-ready summary
- separate-agent code review completed when required

## Stop Conditions

- stop when the task is implemented, validated, documented appropriately, reviewed by a separate agent when required, and ready for human review
