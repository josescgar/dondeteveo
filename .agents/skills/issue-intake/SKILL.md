---
name: issue-intake
description: Prepare a GitHub task to be agent-ready before implementation starts. Use this skill when beginning work from a task issue so scope, acceptance criteria, validations, docs impact, and blockers are explicit.
license: Complete terms in LICENSE.txt
---

Use this skill at the start of a task when the issue needs to be turned into an implementation-ready unit of work.

## Inputs

- the GitHub issue
- `AGENTS.md`
- only the minimum relevant docs for the issue area

## Checklist

- restate the goal in plain language
- confirm the locked context that matters for this task
- confirm acceptance criteria are specific enough to implement
- identify the minimum relevant docs
- identify validation expectations
- identify docs impact or `no docs needed`
- identify blockers or dependencies

## Output

- concise implementation-ready summary
- explicit list of files or areas likely to change
- explicit validations to run

## Stop Conditions

- stop once the issue is clear enough that another agent can begin implementation without reopening broad project planning
