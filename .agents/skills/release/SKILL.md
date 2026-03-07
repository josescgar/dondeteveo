---
name: release
description: Prepare and publish a release from main using SemVer and curated release notes. Use this skill when merged work is ready to be turned into a tag and GitHub Release.
license: Complete terms in LICENSE.txt
---

Use this skill when preparing a release from `main`.

## Inputs

- merged PRs since the last tag
- release policy from `docs/github-workflow.md`
- `AGENTS.md`

## Workflow

- inspect merged PRs since the last tag
- propose the SemVer bump
- draft curated changelog and release notes
- verify the release checklist
- prepare the tag and GitHub Release

## Output

- release recommendation
- release notes draft
- release-ready tag/version

## Stop Conditions

- stop when the version bump, release notes, and release checklist are ready for publication
