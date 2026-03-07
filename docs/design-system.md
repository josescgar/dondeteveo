# Design System

## Brand Personality

**Sporty but human.** Warm and community-first — friendly, location-forward, "See you at km 10!" energy. Inspired by Strava and Nike Run Club but prioritising spectator warmth over performance aggression. Not cold, corporate, or generic SaaS.

Colors and logo are drawn from the brand mark: a location pin split between a rich medium blue and an energetic orange, with a white runner silhouette.

## Color Tokens

```css
--color-bg: #f4f7fb /* light blue-tinted off-white — page background */
  --color-surface: #ffffff /* card / panel surface */
  --color-surface-raised: #e6eff7 /* elevated elements, badges */
  --color-accent: #1e6fa0 /* primary brand blue — logo blue */
  --color-accent-dim: rgba(30, 111, 160, 0.15) /* muted blue tint */
  --color-coral: #f26419 /* CTA / action buttons — logo orange */
  --color-coral-deep: #d6560e /* CTA hover state */ --color-text: #1a2e3b
  /* primary text (rich dark navy) */ --color-muted: #6b7e8c
  /* secondary / label text */ --color-line: rgba(30, 111, 160, 0.14)
  /* borders/dividers (blue-tinted) */ --color-line-solid: #ccd8e4
  /* neutral light structural borders */ --shadow-sm: 0 1px 4px
  rgba(30, 111, 160, 0.08) --shadow-md: 0 4px 16px rgba(30, 111, 160, 0.12);
```

### Color Roles

- **Accent (blue `#1e6fa0`)** — race names, section headings, data labels, accent bars, eyebrow highlights, nav wordmark. Primary structural brand color.
- **Coral (orange `#f26419`)** — CTA buttons, predicted arrival times, action links. Use sparingly so it retains impact.
- **Muted** — eyebrow labels, secondary metadata, distance/pace labels, filter controls.
- **Surface** — white card backgrounds; `surface-raised` for badges and inline highlights.

## Typography

```css
--font-display:
  "Barlow Condensed", "Arial Narrow", sans-serif --font-mono: "IBM Plex Mono",
  "Courier New", monospace;
```

Google Fonts `<link rel="stylesheet">` (loaded in `BaseLayout.astro` head — not `@import`):

```
Barlow+Condensed:wght@700;800
IBM+Plex+Mono:wght@400;500
```

`html { font-family: var(--font-mono); color: var(--color-text); }`

### Usage

- `font-display` (Barlow Condensed) — race names, section headings, large predicted times, nav brand wordmark. Compressed and athletic.
- `font-mono` (IBM Plex Mono) — all body copy, labels, metadata, inputs, buttons. Tabular and precise — dashboard aesthetic.

### Scale (px)

9 / 10 / 12 / 13 / 14 / 16 / 20 / 24 / 32 / 48+clamp

### Eyebrow Labels

Small uppercase labels preceding headings: `font-mono text-[10px] tracking-[0.3em] uppercase`, colored `--color-muted`, prefixed with `//` (code-comment aesthetic).

```html
<div
  class="font-mono text-[10px] tracking-[0.3em] uppercase"
  style="color: var(--color-muted);"
>
  // Race discovery
</div>
```

## Radius

Sharp rectangles on all major containers. No `rounded-xl` / `rounded-lg` on cards, panels, or buttons.

```
inputs/selects: border-bottom only (no box)
badges:         no radius (sharp)
CTA buttons:    no radius (sharp)
map container:  no radius (sharp)
```

## Shadows

Shadows are replaced by `1px solid var(--color-line)` borders on all containers. `--shadow-sm` / `--shadow-md` tokens are defined but used only where elevation is semantically meaningful (e.g. Leaflet map popups).

## Motion

```css
--duration-fast: 150ms --duration-base: 250ms --duration-slow: 400ms
  --ease-out: cubic-bezier(0.16, 1, 0.3, 1);
```

### Keyframes

```css
@keyframes raceReveal   /* opacity 0→1, Y 10px→0, used on .fade-in and .race-row */
@keyframes boardFlip; /* scaleY 0.85→1 + Y -4px→0, transform-origin: top — used on .timing-card */
```

### Animation Classes

| Class          | Keyframe     | Duration | Used on                |
| -------------- | ------------ | -------- | ---------------------- |
| `.fade-in`     | `raceReveal` | 450ms    | `<main>` in BaseLayout |
| `.race-row`    | `raceReveal` | 320ms    | Discovery list rows    |
| `.timing-card` | `boardFlip`  | 280ms    | Share timing cards     |

Stagger: `.race-row` 0.04s per child (9 entries); `.timing-card` 0.05s per child (6 entries).

`@media (prefers-reduced-motion: reduce)` disables all animations.

## Spacing

Standard 4px grid: 4 / 8 / 12 / 16 / 20 / 24 / 32 / 40 / 48 / 64px

## Background Pattern

`body` uses a dot-grid radial gradient with brand-blue tint at 26×26px:

```css
background-image: radial-gradient(
  circle,
  rgba(30, 111, 160, 0.06) 1px,
  transparent 1px
);
background-size: 26px 26px;
```

## Component Patterns

### Race Rows (DiscoveryListIsland)

Full-width table-style rows, no cards:

- `border-bottom: 1px solid var(--color-line)`, hover bg → `--color-surface`
- Left: 2px vertical bar — `--color-accent` if upcoming, `--color-line-solid` if past
- Race name: `font-display text-xl font-bold uppercase`, `--color-text`
- City: `font-mono text-xs`, `--color-muted`
- Right: status badge on `--color-surface-raised`, date (hidden md:), distance (hidden lg:), year, accent `→`
- Stagger animation via `.race-row` class

### Filter Bar

- Bottom-border-only inputs (`border-b bg-transparent`)
- Focus: border flips to `--color-accent` (blue); blur: `--color-line-solid`
- Label: `font-mono text-[10px] tracking-[0.26em] uppercase`, `--color-muted`

### Share Planner Panel

Surface panel with `border: 1px solid var(--color-line)`:

- Eyebrow: `--color-accent` (blue)
- Inputs: bottom-border only, focus → `--color-accent`
- CTA button: `--color-coral` bg, `--color-text` color, no rounded corners

### Predicted Arrival Cards (ShareExperienceIsland)

Hero section — timing cards come **first**, map is secondary.

Layout:

1. Runner header band: `--color-surface` bg, `border: 1px solid var(--color-line)`, race name in `--color-text` with year in `--color-accent`
2. Timing cards grid (`sm:grid-cols-2 xl:grid-cols-4`, `gap-3`): each card has kind label (muted), location name (`font-display text-xl`, `--color-text`), distance (xs muted), predicted time (`font-mono font-medium`, `clamp(2.8rem…4rem)`, **`--color-coral`**, `letter-spacing: -0.02em`, `boardFlip` entrance)
3. Map below the fold

### CTA Buttons

`px-5 py-2.5 font-mono text-sm uppercase tracking-[0.18em]` — no `rounded-*`.
Background: `--color-coral`, text: `--color-text`. Hover background: `--color-coral-deep`.

### Info Row (Race Detail Page)

Inline horizontal data row with amber-tinted top/bottom borders and `border-left` separators between items. Labels inline in `--color-accent`, values in `--color-text` monospace.

### Header

White (`--color-surface`) background, `border-bottom: 1px solid var(--color-line)`. Logo PNG + "DONDETEVEO" wordmark in `--color-accent` (blue). Nav links `font-mono text-xs tracking-[0.18em] uppercase --color-muted`, hover → `--color-accent`.

## Accessibility Baseline

- Semantic HTML first (`article`, `h1-h4`, `nav`, `label`)
- Visible focus states: `--color-accent` border on inputs when focused
- Clear `label` elements for all form controls
- Keyboard-friendly controls throughout
- Do not rely on color alone for meaning (upcoming vs past race also uses left bar color + status badge)
- Minimum contrast: 4.5:1 for body text, 3:1 for large text and UI components

## Time UX Rules

- **Show only race local time.** Never show viewer local time.
- Always label timezone clearly near predicted times.
- Never display ambiguous bare times without timezone context.
- Predicted arrival times are the **primary information** on share pages — they must be large, immediately glanceable, and above the fold on mobile.
