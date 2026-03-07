# ADR 0001: Astro + Preact Islands

## Status
- Accepted

## Context
- The product is mostly content and navigation with a few interactive widgets.

## Decision
- Use Astro as the default rendering layer.
- Use Preact only for interactive islands.

## Consequences
- Most pages stay lightweight.
- Interactive code stays scoped to clear UI islands.
