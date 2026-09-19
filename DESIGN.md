---
name: UG Attend
description: UG Attend — University of Ghana blue and navy brand with gold accent, cream surfaces, campus check-in
colors:
  canvas: "oklch(0.96 0.018 85)"
  surface: "oklch(0.99 0.008 85)"
  surface-muted: "oklch(0.94 0.02 85)"
  foreground: "oklch(0.28 0.07 265)"
  foreground-muted: "oklch(0.45 0.05 265)"
  foreground-subtle: "oklch(0.58 0.04 265)"
  border: "oklch(0.88 0.02 265)"
  border-strong: "oklch(0.78 0.03 265)"
  primary: "oklch(0.335 0.111 255.5)"
  primary-hover: "oklch(0.285 0.105 255.5)"
  primary-active: "oklch(0.24 0.095 255.5)"
  on-primary: "oklch(0.99 0.008 85)"
  primary-subtle: "oklch(0.94 0.03 255.5)"
  gold: "oklch(0.789 0.102 84.2)"
  sidebar: "oklch(0.26 0.07 265)"
  sidebar-foreground: "oklch(0.96 0.01 85)"
  danger: "oklch(0.48 0.16 25)"
  danger-subtle: "oklch(0.96 0.03 25)"
  warning: "oklch(0.45 0.12 75)"
  warning-subtle: "oklch(0.96 0.04 75)"
  info-subtle: "oklch(0.95 0.03 230)"
typography:
  title:
    fontFamily: "var(--font-geist-sans), system-ui, sans-serif"
    fontSize: "1.5rem"
    fontWeight: 700
    lineHeight: 1.25
    letterSpacing: "-0.02em"
  section:
    fontFamily: "var(--font-geist-sans), system-ui, sans-serif"
    fontSize: "1rem"
    fontWeight: 700
    lineHeight: 1.35
  body:
    fontFamily: "var(--font-geist-sans), system-ui, sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.5
  label:
    fontFamily: "var(--font-geist-sans), system-ui, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 500
    lineHeight: 1.4
  mono:
    fontFamily: "var(--font-geist-mono), ui-monospace, monospace"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.4
rounded:
  sm: "0.5rem"
  md: "0.75rem"
  lg: "1rem"
  xl: "1.25rem"
spacing:
  xs: "0.25rem"
  sm: "0.5rem"
  md: "1rem"
  lg: "1.25rem"
  xl: "1.5rem"
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.on-primary}"
    rounded: "{rounded.md}"
    padding: "0 1rem"
    height: "3rem"
  button-primary-hover:
    backgroundColor: "{colors.primary-hover}"
    textColor: "{colors.on-primary}"
    rounded: "{rounded.md}"
  button-secondary:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.foreground}"
    rounded: "{rounded.md}"
    padding: "0 1rem"
    height: "3rem"
  input:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.foreground}"
    rounded: "{rounded.md}"
    padding: "0 1rem"
    height: "3rem"
  card:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.foreground}"
    rounded: "{rounded.xl}"
    padding: "1.25rem"
---

## Overview

**Creative north star: The Campus Clipboard**

UG Attend should feel like a dependable field tool: quiet paper, clear stamps for in/out, no spectacle. Students check in outdoors in daylight; admins work through setup and review without visual noise.

**Register:** product (UI serves attendance tasks, not marketing spectacle).

**Layout:** Mobile-first student shell (header + bottom tabs, max-width content). Admin uses a tinted sidebar on desktop and horizontal nav on small screens. Spacing uses a 4/8/12/16/20px rhythm via tokenized padding on cards and sections.

**Motion:** 150–250ms ease-out transitions; state feedback only. Respect `prefers-reduced-motion` (animations disabled in `globals.css`).

Implementation lives in `app/globals.css` as `--ella-*` CSS variables and `ella-*` utility classes.

## Colors

**Strategy:** Restrained. **UG navy** (`oklch` hue ~255, sampled from the official logo) for primary actions and status, with a **gold** accent (hue ~84, from the logo) reserved for the brand mark. **Navy** (hue ~265) for text and admin sidebar. **Cream** (hue ~85) for canvas and surfaces. Never pure `#000` / `#fff`.

| Role | Token | Usage |
|------|-------|--------|
| Canvas | `--ella-bg` | Page background, subtle radial wash on mobile |
| Surface | `--ella-surface` | Cards, header, tab bar |
| Muted surface | `--ella-surface-muted` | Panels, disabled fills, admin page bg |
| Text | `--ella-fg` / muted / subtle | Hierarchy |
| Border | `--ella-border` | Dividers, inputs |
| Primary | `--ella-accent` | Buttons, active nav |
| Sidebar | `--ella-sidebar` | Admin navigation |
| Semantic | danger, warning, info-subtle | Alerts and badges |

Student theme is **light** (outdoor readability). Admin content surface stays light; sidebar is a darker neutral, not black.

## Typography

**Families:** Geist Sans (`--font-geist-sans`) for UI; Geist Mono for student IDs and codes.

**Scale (product, fixed rem):**

| Role | Size | Weight |
|------|------|--------|
| Page title | 1.5rem | 700 |
| Section | 1rem | 700 |
| Body | 1rem | 400 |
| Label | 0.875rem | 500 |
| Caption / badge | 0.6875–0.75rem | 500–600 |

Hierarchy via weight and size, not display fonts. Prose max ~65–75ch where paragraphs run long.

**Classes:** `ella-heading-page`, `ella-heading-section`, `ella-text-muted`, `ella-label`.

## Elevation

Mostly **flat + border**. Cards use a 1px border and a light shadow (`0 1px 3px` at low opacity). No glassmorphism on chrome. Admin stat row uses border segmentation instead of floating metric tiles.

Focus rings: 3px primary at 18% opacity on inputs (`ella-input`, `ella-select`).

## Components

Use shared classes from `app/globals.css` — do not introduce parallel `slate-*` / `emerald-*` on touched screens.

| Component | Class | Notes |
|-----------|-------|--------|
| Card | `ella-card`, `ella-card-padded` | Rounded xl, bordered |
| Panel | `ella-panel-muted` | Secondary grouping |
| Input | `ella-input` | min-height 48px |
| Select | `ella-select` | min-height 52px |
| Primary button | `ella-btn-primary` | Full-width on auth |
| Secondary button | `ella-btn-secondary` | Check-out, cancel |
| Ghost button | `ella-btn-ghost` | Sign out, refresh |
| Link | `ella-link` | Inline actions |
| Badge | `ella-badge-*` | complete / open / idle |
| Alert | `ella-alert-*` | error, success, warning |
| Info | `ella-info-panel` | Admin help copy |
| Admin nav | `ella-nav-item`, `ella-nav-item-active` | Sidebar |
| Stats | `ella-stat-row`, `ella-stat-cell` | Overview metrics |

Auth re-exports: `mobileInputClass` → `ella-input`, `mobileButtonClass` → `ella-btn-primary`.

**Sidecar (not in YAML):** Tab bar `mobile-tab-bar`; brand mark `ella-brand-mark`; animations `animate-fade-in`, `animate-slide-up`, `animate-page-enter` with `--ella-ease-out` / `--ella-ease-out-expo`.

## Do's and Don'ts

**Do**

- Use `ella-*` tokens and classes for new UI.
- Keep check-in status scannable (time in / time out, site name, badge).
- Explain GPS and schedule errors in plain language.
- Maintain 44px+ touch targets on mobile actions.
- Pair color with text for status (badge + label).

**Don't**

- Gradient hero cards or glass blur headers.
- Side-stripe accent borders on list items.
- Identical four-up metric card grids.
- Decorative page-load choreography.
- Gamified visuals or category-default palettes (healthcare teal, crypto neon).
- Em dashes in UX copy.
