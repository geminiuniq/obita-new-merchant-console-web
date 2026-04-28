# Obita Merchant Portal — Design System

A reference for the visual language, tokens, and recurring component
patterns used in the merchant portal SPA. Source files: `styles.css` for
tokens & global classes, `app.js` for component HTML composed inline.

---

## 1. Design Principles

1. **Editorial, not dashboard.** Treat the portal like a financial weekly:
   measured spacing, generous whitespace, brass eyebrow rules, and one
   confident hero per page. Reject heat-map dashboards.
2. **Restraint with colour.** Brand blue for action, brass for editorial
   identity, status colours used **only** for status. Red is reserved for
   compliance and destructive flows; never for decoration.
3. **Mono for the machine, Clash for the moment.** JetBrains Mono carries
   IDs, timestamps, eyebrows, and pills. Clash Display elevates page
   titles and amounts. Inter does the body work.
4. **Hierarchy through scale and weight, not borders.** A heavy 1px outline
   everywhere flattens the page. Use hairlines and surface ladders.
5. **One primary action per surface.** Secondary actions are ghost or
   text. Side panels stay informational.

Anti-patterns we avoid: bouncy easings, neon-blue gradients, all-caps
headings, "alarm-coloured" cards, redundant icon tiles inside narrow
sidebars, full-width photo banners on a portal sidebar.

---

## 2. Token Layer

All tokens live in `:root` at the top of [`styles.css`](styles.css). New
code should consume tokens; bare hex is grandfathered in legacy paths.

### 2.1 Brand

| Token | Value | Use |
|---|---|---|
| `--clr-brand-ink` | `#060B24` | Hero canvas (login, group overview) |
| `--clr-brand-ink-2` / `-3` | `#0F1B3D` / `#1C2A5E` | Layered depth on ink surfaces |
| `--clr-brand-electric` | `#1E3AFF` | Reserved for brand moments only |
| `--clr-brand-brass` | `#C9A449` | Eyebrow rules, editorial accent |
| `--clr-brand-brass-2` | `#E8D18A` | Soft brass highlight |
| `--clr-brand-paper` | `#F4EEDD` | Cream highlight on ink |

> Brand tokens are **opt-in** — only hero moments touch them. Standard UI
> uses the surface and ink ladders below.

### 2.2 Surface ladder

```
--surface-base    #FFFFFF   card body, inputs
--surface-soft    #FCFDFE   sub-header strips, hover-on-card
--surface-quiet   #F8FAFC   page background, group heads
--surface-overlay #F1F5F9   hover, faint dividers, chip backgrounds
```

Existing aliases that map to the same values: `--clr-main-bg` (=
`--surface-quiet`), `--clr-sidebar-hover` (= `--surface-overlay`).

### 2.3 Ink ladder

```
--ink-strong  #0F172A   page titles, hero amounts
--ink-base    #1E293B   body text  (alias: --clr-text-main)
--ink-mid     #475569   secondary text, sidebar text
--ink-mute    #64748B   tertiary text, captions  (alias: --clr-text-muted)
--ink-quiet   #94A3B8   labels, hairlines on light bg
```

### 2.4 Lines

```
--line-soft   #F1F5F9   hairlines within a section
--line-base   #E2E8F0   card border, table dividers  (alias: --clr-border)
```

### 2.5 Status — paired (5 swatches per severity)

Each severity ships five swatches. Pick by intent:

| Suffix | Use |
|---|---|
| `-fg` | Readable text on light surfaces |
| `-strong` | Saturated icon / bar / dot fill |
| `-bg` | Filled chip or pill background |
| `-soft-bg` | Whisper background for entire rows |
| `-border` | Chip / pill outline |

Severities: `success`, `info`, `warn`, `danger`.

```
--status-success-{fg|strong|bg|soft-bg|border}
  #15803D / #16A34A / #DCFCE7 / #ECFDF5 / #86EFAC

--status-info-{fg|strong|bg|soft-bg|border}
  #1D4ED8 / #2563EB / #DBEAFE / #EFF6FF / #BFDBFE

--status-warn-{fg|strong|bg|soft-bg|border}
  #B45309 / #D97706 / #FEF3C7 / #FFFBEB / #FDE68A

--status-danger-{fg|strong|bg|soft-bg|border}
  #B91C1C / #DC2626 / #FEE2E2 / #FEF2F2 / #FECACA
```

Existing alias: `--clr-accent` (= `--status-info-strong`, `#2563EB`).

**Do not invent a fifth severity.** Ambiguous states (e.g. *Pending
Approval*) reuse `info`. Compliance / *Info Required* reuses `danger`
because regulatory blocks need the strongest colour cue.

### 2.6 Spacing scale (4 px base)

```
--space-1   4px
--space-2   8px
--space-3  12px
--space-4  16px
--space-5  20px
--space-6  24px
--space-7  28px
--space-8  32px
```

Common pairings: card body padding `var(--space-5) var(--space-6)`,
sub-header `var(--space-4) var(--space-5)`, hero card padding
`var(--space-6) var(--space-7)`. Avoid odd values (13 px, 17 px); they
break the optical rhythm.

### 2.7 Radius

```
--radius-sm    6px    pills inside a chip, copy buttons
--radius-md    8px    standard buttons, small cards
--radius-lg   12px    cards, image thumbnails
--radius-pill 999px   status pills, badges, brass eyebrow chip
```

### 2.8 Shadows

```
--shadow-sm    soft 1px lift, e.g. button hover
--shadow-md    elevated card / floating
--shadow-hero  reserved for hero moments on dark canvases
```

### 2.9 Typography stack

```
--font-sans     Inter — body, controls
--font-display  Clash Display — page titles, amounts, sub-card titles
--font-mono     JetBrains Mono — IDs, timestamps, eyebrows, pills, KPI labels
```

Sizes commonly used:

| Role | Size | Weight | Family |
|---|---|---|---|
| Page title | 30–34 px | 500 | Clash |
| Hero amount | 30–34 px | 600 | Clash |
| Sub-card title | 14–16 px | 600–700 | Clash |
| Body | 13–14 px | 500 | Inter |
| Secondary | 12 px | 500 | Inter |
| Eyebrow / pill / mono caption | 9.5–11 px | 600–700, letter-spacing 0.18–0.22 em, uppercase | Mono |
| ID / timestamp | 11–13 px | 600–700, letter-spacing 0.02–0.04 em | Mono |

---

## 3. Recurring Component Patterns

These aren't shared components (this is a vanilla JS SPA composing HTML
inline) — they're **patterns** you should reproduce verbatim so the
portal reads as one product. Reach for the closest existing instance and
match it.

### 3.1 Editorial header card

Used on every list page (Invoice Orders, Payout Orders, Stablecoin Vault,
etc.) and detail page (order details, bank account detail, member
profile, …).

```
┌──────────────────────────────────────────────────────────┐
│ ── 3px brass gradient hairline ──                         │
│ ← Back to …                                              │
│ ─── BRASS · MODE · ENTITY               [STATUS PILL]    │
│ Page Title in Clash Display                              │
│ Sub-line in Inter — one sentence                         │
│                                          [Primary CTA]   │
└──────────────────────────────────────────────────────────┘
```

Anatomy:
1. **3 px gradient bar** at the very top: `linear-gradient(90deg, #C9A449, #C9A44966)`
2. **Brass eyebrow** in mono caps with a 14 px hairline lead, e.g.
   `TCSP · TREASURY PAYOUT` or `MSO · INVOICE ORDER`.
3. **Status pill** (mono pill, 10 px, uppercase, letter-spacing 0.1 em).
4. **Title** in Clash Display (`var(--font-display)`), weight 500–600.
5. **Order ID + timestamp** in mono on the bottom-left; **amount** in
   Clash Display on the bottom-right of detail headers.

### 3.2 Section card with mono index pill

Within a detail page, each major section is a card whose header contains
a **mono `01` / `02` / `03` index pill** + Clash Display section title.

```
┌────────────────────────────────────────┐
│ 01  Order Information                  │
├────────────────────────────────────────┤
│ … grid of fields …                     │
│                                        │
│ ── 1 px line-soft (sub-section) ──     │
│ JETBRAINS MONO MICRO LABEL             │
│ … sub-content …                        │
└────────────────────────────────────────┘
```

The index pill style:

```html
<span style="font-family: var(--font-mono); font-size: 9.5px;
             font-weight: 700; padding: 3px 8px;
             border: 1px solid var(--clr-border); background: var(--surface-base);
             color: var(--ink-mute); border-radius: var(--radius-sm);
             letter-spacing: 0.18em;">01</span>
```

Used on: Stablecoin / Fiat / Payout / Invoice / Checkout order detail
pages.

### 3.3 KPI strip

Four-column horizontal strip used on list-page heroes (Invoice Orders,
Payout Orders) and on Overview summary sub-cards. Pattern: hero tile
(left, brand-tinted) + three peer tiles (each with a status dot).

The dots are filled circles in `var(--status-X-bg)` with the SVG icon in
`var(--status-X-strong)`. Labels in mono uppercase. Numbers in Clash
Display, tabular-nums.

When fewer than 4 metrics are needed, drop the hero variant and use four
peer tiles (Overview summary sub-cards do this for a lighter feel).

### 3.4 Status pill / chip

Compact pill that lives next to titles or in tables. Always:
- Mono uppercase, letter-spacing 0.08–0.1 em
- 10–11 px font, weight 700–800
- Padding `3px 9px`, `border-radius: var(--radius-pill)`
- Foreground/background pulled from a status pair

```html
<span style="background: var(--status-success-bg);
             color: var(--status-success-fg);
             border-radius: var(--radius-pill);
             font-family: var(--font-mono); font-size: 10px;
             font-weight: 700; padding: 3px 9px;
             letter-spacing: 0.1em; text-transform: uppercase;">
  Settled
</span>
```

For order-status badges, use the helper `renderUnifiedStatusBadge(status,
compact)` in `app.js` which calls `getOrderReportStatusPill(status)` to
normalise wording (Approved / Completed / In Progress / Failed / etc.).

### 3.5 Severity row (Exceptions & Tasks pattern)

A row whose left edge carries a **2–4 px severity bar** and whose body
shows a category chip + title + meta + CTA. Used in the Overview
Exceptions & Tasks card; can be reused for any task queue.

Bar widths: `2px` for awareness, `3px` for action, `4px` for compliance.
Background per severity uses `--status-X-soft-bg` (or `--surface-base`
for awareness).

### 3.6 Brass eyebrow

Mono caps + 14 px hairline lead in `var(--clr-brand-brass)`:

```html
<span style="display: inline-flex; align-items: center; gap: 8px;
             font-family: var(--font-mono); font-size: 10px;
             font-weight: 600; letter-spacing: 0.22em;
             text-transform: uppercase; color: var(--clr-brand-brass);">
  <span style="width: 14px; height: 1px; background: var(--clr-brand-brass);"></span>
  TCSP · INVOICE ORDER
</span>
```

Used in editorial headers and on summary sub-cards (when the page allows
the heavier treatment — see Overview rule below).

### 3.7 Time selector

A small horizontal segmented control: `1d / 1w / 1m / 6m / 1y`. The
active option uses `--surface-overlay` background and ink-strong text;
inactive use `--ink-mute`. Reach for the existing `.time-selector`
class — don't reinvent it.

### 3.8 Editorial summary sub-card *(lighter variant)*

Used on Overview page only. Same ingredients as the editorial header
**minus** the brass top hairline and the brass eyebrow — those are saved
for the page hero. Title at 14 px Clash, time selector on the right,
4-tile KPI strip beneath.

This is the rule: **at most one editorial flourish per page**. A page
hero gets brass; sub-cards get plain hairlines.

### 3.9 Obita News card

Sidebar card with a square thumbnail (92 px, `--radius-lg`) on the left
and metadata on the right. Title clamped to 3 lines via
`-webkit-line-clamp`. Eyebrow uses dark ink tile; "Latest" pill uses
status-info soft-bg.

---

## 4. Interaction Conventions

- **Hover**: subtle background shift to one step lighter on the surface
  ladder (e.g. `--surface-base` → `--surface-soft`). Never a colour
  change on text-heavy rows; reserve colour change for links.
- **Focus**: keep the browser default outline unless replaced by a
  visible ring. Never set `outline: none` without a replacement.
- **Transitions**: 120–200 ms, `ease`, applied to `background`, `color`,
  and `gap`. Never animate `width`/`height`/`box-shadow` on hover.
- **Loading state**: avoid spinners for sub-second operations — use
  optimistic UI plus a status pill change. Drawers fade in 200 ms.
- **Disabled buttons**: `--surface-quiet` background, `--ink-quiet`
  text, `cursor: not-allowed`, opacity 0.75. Show a `title` tooltip
  explaining why if non-obvious.

---

## 5. Layout & Spacing Conventions

- **Page max-width**: 980 px for detail views, 1240 px for list views.
- **Card gap**: `var(--space-4)` (16 px) between stacked cards;
  `var(--space-6)` (24 px) for a clear page-section break.
- **Grid columns**: 2-fr text + 1-fr side panel for hero+payer layouts;
  use `minmax(280px, 0.9fr)` so the side panel doesn't crush.
- **Field grids**: `repeat(2, 1fr)` with `gap: 18px 28px` — the asymmetric
  vertical-vs-horizontal gap is intentional.
- **Touch targets**: minimum 36 px height; 44 px on mobile for taps.

Breakpoints (informal — the portal is desktop-first):
- ≤ 720 px: KPI strips collapse to 2×2; side panels stack below hero.
- ≤ 480 px: untested. Treat as out-of-scope.

---

## 6. Modes & Conditional UI

Two licence modes alter the UI:

| Mode | `body` class | Stablecoin features | Fiat features |
|---|---|---|---|
| **TCSP** | `tcsp-only` shown | ✓ | ✓ |
| **MSO** | `mso-only` shown | ✗ (filtered out) | ✓ |

Toggle via `window.toggleLicenseMode()`. Mode-specific copy uses inline
ternaries on `window.currentLicenseMode`. Never hard-code "Stablecoin"
or "Treasury" wording without a mode check on a shared surface.

---

## 7. Data Conventions

- **Order IDs / TxIDs**: mono, monospace, letter-spacing 0.02–0.04 em.
- **Amounts**: `font-variant-numeric: tabular-nums` always; Clash
  Display for hero amounts, Inter or mono for table cells.
- **Wallet / bank addresses**: render as `first6····last4` mask in lists
  and tables. The full value reveals on click in detail pages
  (`window.toggleOrderAddrReveal`).
- **Currency suffix**: USD/HKD/EUR/BRL = fiat; USDT/USDC = stablecoin.
  Always render with one space between number and currency code.
- **Timestamps**: prefer absolute ("Apr 5, 2026 11:24") over relative
  ("3h ago") for transaction data.

---

## 8. Hard-coded Hex → Token Mapping (legacy migration cheatsheet)

When polishing an older surface, replace these in CSS-context positions
(do not touch JS chart-color literals):

| Hex | Token |
|---|---|
| `#0F172A` | `var(--ink-strong)` |
| `#1E293B` | `var(--clr-text-main)` |
| `#475569` | `var(--ink-mid)` |
| `#64748B` | `var(--clr-text-muted)` |
| `#94A3B8` | `var(--ink-quiet)` |
| `#E2E8F0` | `var(--clr-border)` |
| `#F1F5F9` | `var(--line-soft)` |
| `#F8FAFC` | `var(--clr-main-bg)` |
| `#FCFDFE` | `var(--surface-soft)` |
| `#FFFBEB` | `var(--status-warn-soft-bg)` |
| `#FEF3C7` | `var(--status-warn-bg)` |
| `#FDE68A` | `var(--status-warn-border)` |
| `#B45309` | `var(--status-warn-fg)` |
| `#D97706` | `var(--status-warn-strong)` |
| `#FEF2F2` | `var(--status-danger-soft-bg)` |
| `#FEE2E2` | `var(--status-danger-bg)` |
| `#FECACA` | `var(--status-danger-border)` |
| `#DC2626` | `var(--status-danger-strong)` |
| `#B91C1C` | `var(--status-danger-fg)` |
| `#ECFDF5` | `var(--status-success-soft-bg)` |
| `#DCFCE7` | `var(--status-success-bg)` |
| `#86EFAC` | `var(--status-success-border)` |
| `#16A34A` | `var(--status-success-strong)` |
| `#15803D` | `var(--status-success-fg)` |
| `#EFF6FF` | `var(--status-info-soft-bg)` |
| `#DBEAFE` | `var(--status-info-bg)` |
| `#BFDBFE` | `var(--status-info-border)` |
| `#2563EB` | `var(--status-info-strong)` *(or `--clr-accent`)* |
| `#1D4ED8` | `var(--status-info-fg)` |
| `#C9A449` | `var(--clr-brand-brass)` |

Hexes intentionally **not migrated** in bulk:
- `#FFFFFF`, `#CBD5E1` — context-dependent
- All hexes inside JS string literals (`'#XXX'`, `"#XXX"`) — chart and
  accent maps that may not parse `var()`

---

## 9. When Adding a New Page

Follow this order:

1. **Hero** — editorial header (§3.1). Pick a brass eyebrow that names
   the licence mode + page kind.
2. **Primary action** — single brand-blue button in the hero top-right.
   Secondary actions are ghost or text.
3. **Sections** — index-pill cards (§3.2). Number them in reading order.
4. **Status surfaces** — use status pills (§3.4); never custom colours.
5. **Empty / loading / error** — hand-design these. Don't ship an empty
   table without an empty-state row.
6. **Polish** — run `/polish` to align spacing, typography, contrast,
   and token consumption.
7. **Document** — add component-specific notes here if you introduced a
   pattern likely to be reused.

---

## 10. Anti-patterns & Gotchas

- **Don't put gray text on a coloured background.** Tint the gray toward
  the background colour or reduce opacity instead.
- **Don't use red for emphasis.** Red is *only* danger / compliance /
  destructive. An emphasised positive number is brand blue or success.
- **Don't stack two primary buttons.** If a page seems to need two,
  split them into primary + ghost (see Invoice Orders hero plan).
- **Don't use brass on small UI elements.** Brass is editorial — it
  belongs to eyebrows and hairlines, not chips or buttons.
- **Don't paint the whole card red on a single critical row.** Use the
  severity bar (§3.5). Card-level red is noise.
- **Don't use `<h1>` inside a sidebar card** — the hero already owns
  `<h1>`. Sidebar cards use `<h2>` or unstyled `<div>` titles.
- **Don't replace a hex inside a JS string literal during a token
  migration** — those go to chart libraries that don't parse `var()`.

---

*Last updated: 2026-04-28 — alongside the Overview polish + portal
normalization pass.*
