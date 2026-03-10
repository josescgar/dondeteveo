# Product

## Summary

- `Dondeteveo` helps amateur runners share a link so family and friends know where and approximately when to cheer.

## Primary User

- Amateur runner

## Secondary Audience

- Family and friends following the runner, often on mobile and non-technical

## Job To Be Done

- Choose a race
- Enter target pace or finish time
- Generate a shareable link
- Let spectators quickly understand where and when to see the runner

## MVP In Scope

- Curated catalog of races
- Race discovery through browse, text search, and filters
- Spain-first initial catalog
- English and Spanish from day one
- SEO-friendly race edition pages
- Read-only share page with route, splits, cheer points, and predicted times
- Optional runner nickname
- About/Contact page
- Privacy Policy page

## Explicitly Out Of Scope

- GPS or live tracking
- Accounts or roles
- User-generated race routes
- Race results ingestion
- Social features
- Payments

## Discovery Model

- Discovery is part of MVP, not a later add-on.
- Optimize primarily for runners who already know the race they want.
- Primary homepage action is direct race search.
- Support browse and filters as secondary entry points.

## Core Flows

- Runner: discover race -> open race page -> enter target pace or finish time -> generate share link
- Spectator: open share link -> view route, splits, cheer points, and race-local predicted times

## UX Principles

- Mobile-first
- Fresh, clear, sport-oriented
- Easy for non-technical spectators
- Low friction from landing page to share result
- Prefer clarity over feature density

## Glossary

- `race`: recurring event brand represented by a globally unique public slug
- `race slug`: the public URL identifier for a race or distance variant; public URLs do not include the country code
- `race edition`: one specific yearly instance of one race slug and one distance
- `edition`: shorthand for `race edition`
- `race page`: canonical SEO page for a race edition under `/[locale]/races/<race>/<year>`
- `share planner`: the race-page flow where a runner enters a target pace or finish time and generates a link
- `share state`: the untrusted runner plan encoded in the share-page URL fragment
- `share page`: non-indexed spectator page generated from a race edition plus share state
- `split`: official timing point shown in the prediction cards and on the map
- `cheer point`: curated spectator-friendly point on the route shown alongside splits on share pages
