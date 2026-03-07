# ADR 0004: Fragment-Based Share State

## Status
- Accepted

## Context
- MVP should avoid backend persistence while still supporting shareable personalized pages.

## Decision
- Encode share state in the URL fragment.

## Consequences
- MVP avoids backend storage.
- Fragment input must be treated as untrusted and validated carefully.
