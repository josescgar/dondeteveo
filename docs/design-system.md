# Design System

## Brand Personality

**Sporty but human.** Warm and community-first — friendly, location-forward, "See you at km 10!" energy. Inspired by Strava and Nike Run Club but prioritising spectator warmth over performance aggression. Not cold, corporate, or generic SaaS.

## Color Tokens

```css
--color-bg: #f5f1eb /* warm sand — page background */ --color-surface: #ffffff
  /* card / panel surface */ --color-navy: #0d3b5e /* primary brand navy */
  --color-navy-dark: #082a44 /* header background */ --color-orange: #f26419
  /* accent, CTAs, upcoming highlights */ --color-orange-deep: #d6560e
  /* hover state for orange */ --color-amber: #fff3e0
  /* warm highlight tint — year badges, info panels */ --color-text: #1a2e3b
  /* rich dark body text (not pure navy) */ --color-muted: #7a8e99
  /* secondary / label text */ --color-line: rgba(13, 59, 94, 0.1) /* borders */;
```

### Color Roles

- **Orange** — primary CTA buttons, key data (predicted arrival times), upcoming race highlights, active focus rings. Use sparingly so it retains impact.
- **Navy** — headings, race names, prominent data labels, card borders.
- **Amber** — warm tint for year badges and info sub-panels. Never for text-heavy content.
- **Muted** — eyebrow labels, secondary metadata, distance/pace labels, filter dropdowns. Keeps hierarchy clear so orange CTAs stand out.
- **Navy Dark** — site header only.

## Typography

```css
--font-display:
  "Oswald", "Arial Narrow", sans-serif --font-body: "Lato", "Helvetica Neue",
  Helvetica, Arial, sans-serif;
```

Google Fonts load string:

```
Oswald:wght@500;600;700
Lato:ital,wght@0,400;0,700;1,400
```

### Usage

- `font-display` (Oswald) — race names, section headings, large predicted times, nav brand name. Condensed, sporty.
- `font-body` (Lato) — all body copy, labels, metadata. Humanist, warm, excellent mobile legibility.

### Scale (px)

11 / 13 / 14 / 16 / 18 / 20 / 24 / 30 / 36 / 48 / 60

### Eyebrow Labels

Small uppercase labels preceding headings: `text-[10px] font-bold tracking-[0.3em] uppercase`, colored `--color-muted`. Do **not** use orange for eyebrows — orange is reserved for CTAs and key data only. Exception: eyebrows inside dark navy panels may use orange for contrast.

## Radius

```
--radius-sm:   6px     tags, chips
--radius-md:   10px    inputs, small cards
--radius-lg:   16px    main cards
--radius-xl:   24px    panels, map container
--radius-full: 9999px  pills
```

In Tailwind terms: `rounded` (6px), `rounded-lg` (10px), `rounded-xl` (16px).

## Shadows

```css
--shadow-sm: 0 1px 4px rgba(13, 59, 94, 0.06) /* default cards */ --shadow-md: 0
  4px 16px rgba(13, 59, 94, 0.1) /* hover state, timing cards */ --shadow-lg: 0
  12px 40px rgba(13, 59, 94, 0.14) /* elevated panels */;
```

## Motion

```css
--duration-fast: 150ms --duration-base: 250ms --duration-slow: 400ms
  --ease-out: cubic-bezier(0.16, 1, 0.3, 1);
```

Race card stagger animation: `slideUp 0.38s ease` with per-child delays from 0.04s to 0.36s.

## Spacing

Standard 4px grid: 4 / 8 / 12 / 16 / 20 / 24 / 32 / 40 / 48 / 64px

## Component Patterns

### Race Cards (DiscoveryListIsland)

- White surface, `shadow-sm`, left border 4px: orange for upcoming, muted rgba for past
- Year badge: amber tint bg (`--color-amber`) with navy text — warm, not harsh
- Race name: `font-display text-2xl font-bold`, navy
- Metadata row: `text-xs`, muted
- Hover: `hover:-translate-y-0.5 hover:shadow-md`
- Stagger animation via `.race-card` class

### Filter Bar

- White surface, border `--color-line`, `shadow-sm`
- Input focus: border flips to `--color-orange`
- Label: `text-[10px] font-bold tracking-[0.26em] uppercase`, muted

### Share Planner Panel

Dark navy panel (`--color-navy`) with:

- Orange eyebrow label (exception to muted rule — on dark bg for contrast)
- Input fields: semi-transparent white border, white text
- CTA button: orange bg, navy text, `--color-orange-deep` on hover

### Predicted Arrival Cards (ShareExperienceIsland)

Hero section — timing cards come **first**, map is secondary.

Layout:

1. Runner header band (full width, navy bg): race name · year, optional runner name in amber pill, start time
2. Timing cards grid (`md:grid-cols-2 xl:grid-cols-4`): each card has kind label (muted), location name (Oswald xl, navy), distance (xs muted), predicted time (**Oswald text-5xl, orange**)
3. Map below the fold

### Year Badges

`rounded px-2 py-0.5 text-[10px] font-bold tracking-wider` with `background-color: var(--color-amber); color: var(--color-navy)`.

Never dark navy with white text — amber tint is warmer.

### CTA Buttons

`rounded-lg px-5 py-2.5 text-sm font-bold uppercase tracking-wider`
Background: `--color-orange`, text: `--color-navy`. Hover background: `--color-orange-deep`.

### Info DL (Race Detail Page)

`dt` labels: `text-[10px] font-bold tracking-[0.26em] uppercase`, orange — data labels within an info panel use orange to draw the eye to key facts.

## Background Pattern

`body` uses a dot-grid radial gradient (`rgba(13,59,94,0.07)` on `--color-bg`) at 26×26px, giving a subtle athletic texture without being distracting.

## Accessibility Baseline

- Semantic HTML first (`article`, `h1-h4`, `dl/dt/dd`, `nav`, `label`)
- Visible focus states: orange border on inputs when focused
- Clear `label` elements for all form controls
- Keyboard-friendly controls throughout
- Do not rely on color alone for meaning (upcoming vs past race also uses left border thickness)
- Minimum contrast: 4.5:1 for body text, 3:1 for large text and UI components

## Time UX Rules

- **Show only race local time.** Never show viewer local time.
- Always label timezone clearly near predicted times.
- Never display ambiguous bare times without timezone context.
- Predicted arrival times are the **primary information** on share pages — they must be large, immediately glanceable, and above the fold on mobile.
