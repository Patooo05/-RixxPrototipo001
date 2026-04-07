# DESIGN.md — Rixx Noir Atelier

> Plain-text design system for AI coding agents.  
> Drop this file into any prompt: "Build a UI that matches this design system."

---

## 1. Visual Theme & Atmosphere

**Name:** Noir Atelier  
**Brand:** Rixx — luxury eyewear  
**Mood:** Cinematic luxury. Editorial darkness. Obsidian cathedral with gold light.

Design philosophy:
- The canvas is pure black (`#0a0a0a`). Everything else is depth.
- Gold (`#D4AF37`) is used sparingly — only for accents, prices, headings, and primary CTAs. Never as a fill color for surfaces.
- Typography carries weight: serif headlines suggest craftsmanship, sans-serif body suggests precision.
- Animations are slow and intentional — never playful. Fade-ins, parallax, soft scale.
- Glassmorphism is reserved for floating panels (modals, nav, drawers). Never for primary content cards.
- Negative space is a design element, not empty space.

---

## 2. Color Palette & Roles

### Primary — Gold

| Token              | Hex       | Role                                       |
|--------------------|-----------|--------------------------------------------|
| `$primary`         | `#D4AF37` | Gold accent — CTAs, prices, headings, links|
| `$primary-fixed`   | `#ffe088` | Bright gold — card titles, highlighted text|
| `$on-primary`      | `#1a1a1a` | Text on gold buttons                       |
| `$gold-soft`       | `rgba(#D4AF37, 0.28)` | Soft gold overlays, borders      |
| `$gold-glow`       | `rgba(#D4AF37, 0.22)` | Box-shadow gold glow              |

### Surfaces — Obsidian Hierarchy

| Token                        | Hex       | Role                                     |
|------------------------------|-----------|------------------------------------------|
| `$background` / `$surface`   | `#0a0a0a` | Page background — true black             |
| `$surface-container-lowest`  | `#050505` | Deepest container (under-banner, footer) |
| `$surface-container-low`     | `#0d0d0d` | Card backgrounds                         |
| `$surface-container`         | `#111111` | Panels, sidebar backgrounds              |
| `$surface-container-high`    | `#1a1a1a` | Hover state cards, modals                |
| `$surface-container-highest` | `#222222` | Elevated modals, dropdowns               |
| `$surface-bright`            | `#1a1a1a` | Bright surface alias                     |

### Text

| Token                 | Hex       | Role                              |
|-----------------------|-----------|-----------------------------------|
| `$on-surface`         | `#e5e2e1` | Primary body text — warm off-white|
| `$on-surface-variant` | `#99907c` | Muted text, labels, captions      |

### Semantic

| Token             | Hex       | Role                   |
|-------------------|-----------|------------------------|
| `$outline`        | `#4d4635` | Ghost border base      |
| `$outline-variant`| `#353534` | Subtle dividers        |
| `$error`          | `#ffb4ab` | Error text             |
| `$error-container`| `#93000a` | Error button/badge     |
| `$success`        | `#a5ff6c` | Success states         |

---

## 3. Typography Rules

### Fonts

| Role       | Family                          | Weight(s)        |
|------------|---------------------------------|------------------|
| Headlines  | `Noto Serif` (serif)            | 400, 700, italic |
| Body/UI    | `Manrope` (sans-serif)          | 200, 400, 600, 800 |
| Labels/CTAs| `Manrope` (sans-serif)          | 600, 700         |

**Rule:** Serif = craftsmanship, editorial, emotional. Sans = precision, data, UI controls.

### Type Scale

| Token          | Size      | Use                                 |
|----------------|-----------|-------------------------------------|
| `$display-lg`  | 3.5rem    | Hero titles only                    |
| `$display-md`  | 2.75rem   | Section heroes                      |
| `$display-sm`  | 2.25rem   | Page titles, product names          |
| `$headline-lg` | 2rem      | Section headings                    |
| `$headline-md` | 1.75rem   | Sub-section headings                |
| `$headline-sm` | 1.5rem    | Card headings, modal titles         |
| `$title-lg`    | 1.25rem   | Card names, sidebar titles          |
| `$title-md`    | 1rem      | Prices, UI labels                   |
| `$title-sm`    | 0.875rem  | Cart item names                     |
| `$body-lg`     | 1rem      | Primary body text                   |
| `$body-md`     | 0.875rem  | Secondary descriptions              |
| `$body-sm`     | 0.75rem   | Captions, category tags             |
| `$label-sm`    | 0.625rem  | Badges, tiny-caps labels            |

### Rules

- Headlines: `letter-spacing: -0.02em` — tight, editorial
- Labels/CTAs: `letter-spacing: 0.3–0.4em`, `text-transform: uppercase` — signature spaced caps
- Body: `line-height: 1.6`; headlines: `line-height: 1.1`
- Use `clamp()` for responsive sizes: `clamp($headline-md, 4vw, $display-sm)`

---

## 4. Component Stylings

### Buttons

**Primary (Gold CTA)**
```
background: linear-gradient(135deg, #D4AF37, #D4AF37)
color: #1a1a1a
font: Manrope 700, 0.3em letter-spacing, uppercase
padding: 0.75rem 2rem
border-radius: 0.125rem   ← nearly square, editorial
hover: box-shadow gold glow + scale(1.02)
active: scale(0.98)
```

**Secondary (Ghost)**
```
background: transparent
border: 1px solid rgba(#353534, 0.15)
color: #ffe088
font: Manrope 600, 0.2em letter-spacing, uppercase
hover: border-color rgba(#D4AF37, 0.4), color #D4AF37
```

### Product Cards

```
background: #0d0d0d
border-radius: 0.5rem
hover: background #1a1a1a + ambient shadow + gold glow ring
image hover: scale(1.08) + brightness(1.08)
badge (NEW): gold fill, #1a1a1a text, tiny-caps
badge (SOLD OUT): red container, blur backdrop
entry animation: fadeInCard (translateY + scale from 0.95)
```

### Featured Cards (Parallax 3D)

```
Same base as product card
Mouse-driven: rotateX/rotateY CSS transforms
Spotlight: radial-gradient using --x/--y CSS custom props, gold-tinted
hover image: scale(1.08) over 1000ms crawl ease
```

### Navigation (Navbar)

```
glass-surface(0.9): rgba(#0a0a0a, 0.9) + backdrop-blur(20px)
border-bottom: ghost-border
logo: Noto Serif, gold color
links: Manrope, 0.15em letter-spacing
active link: gold color
cart icon: gold badge counter
intro sequence: orchestrated setTimeout fade-in
```

### Cart Drawer

```
position: fixed right, slides in from right
background: #0d0d0d
top border: 2px solid rgba(#D4AF37, 0.3)   ← gold accent line
header: ghost-border-bottom, h2 gold
items: no dividers — separated by blackspace
quantity buttons: gold fill, #1a1a1a text
remove button: ghost border → red on hover
footer: ghost-border-top, checkout = btn-primary
```

### Inputs & Forms

```
background: #050505
border: none
border-bottom: 2px solid transparent → gold on focus
font: Manrope, body-lg
placeholder: on-surface-variant at 50% opacity
no outline on focus — border-bottom-color is the indicator
```

### Review Cards

```
glass-surface(0.08)
border: ghost-border
hover: translateY(-4px), gold tint background, gold border
::before cinematic-light (top right): gold radial glow on hover
```

### Modal / Login Panel

```
glass-surface(0.95)
background: #111111
border-radius: 0.5rem
ambient-shadow
h2: Noto Serif, gold
inputs: form style above
```

---

## 5. Layout Principles

### Spacing Scale

Use multiples of `0.25rem`:
- Micro gaps: `0.5rem`
- Standard gaps: `1rem`, `1.5rem`
- Section padding: `2rem` horizontal, `4–6rem` vertical
- Max content width: `1200px` (product detail) / `1500px` (grids)

### Grid Systems

- **Featured grid**: `repeat(auto-fit, minmax(270px, 1fr))`, `gap: 2.2rem`
- **Products grid**: `repeat(3, 1fr)` → 2 → 1 at breakpoints
- **Sidebar layout**: 260px fixed sidebar + `flex: 1` content

### Whitespace Philosophy

Generous padding. Let content breathe. The black background amplifies perceived luxury — don't crowd it. Sections have `6rem` vertical padding minimum.

---

## 6. Depth & Elevation

Three-layer shadow system:

| Layer              | Value                                      | Use                    |
|--------------------|--------------------------------------------|------------------------|
| `$shadow-ambient`  | `0px 20px 40px rgba(0,0,0, 0.6)`           | Floating cards, modals |
| `$shadow-gold-glow`| `0 0 40px rgba(#D4AF37, 0.10)`             | Gold ambient on hover  |
| `$shadow-gold-outer`| `0 0 0 1px rgba(#D4AF37, 0.15)`           | Gold ring border       |

### Glassmorphism Rules

`glass-surface($opacity)` = `rgba(#0a0a0a, $opacity) + backdrop-blur(20px)`

| Context     | Opacity |
|-------------|---------|
| Navbar      | 0.90    |
| Modal/Login | 0.95    |
| Drawers     | 1.0 (solid, no blur needed) |
| Review cards| 0.08 (nearly transparent) |
| Banner card | 0.35    |
| Review form | 0.06    |

### Surface Hierarchy (bottom → top)

`$surface-container-lowest` → `$surface-container-low` → `$surface-container` → `$surface-container-high` → `$surface-container-highest`

Elevation is expressed through background lightness, not colored shadows.

---

## 7. Do's and Don'ts

### Do
- Use gold exclusively for accents — headings, prices, active states, primary CTAs
- Apply `letter-spacing: -0.02em` to all headline text
- Use `clamp()` for all major type sizes
- Add `text-shadow: 0 4px 20px rgba(#D4AF37, 0.25)` to gold headings for depth
- Use `transition: right $duration-slow $ease` for drawer animations (slow = luxury)
- Use `border-bottom: 2px solid $primary` as the focus indicator for inputs
- Use `translateY(-4px)` on card hover to suggest levitation
- Always use `cubic-bezier(.22, .61, .36, 1)` as the default ease

### Don't
- Don't hardcode colors — always reference `$primary`, `$background`, etc.
- Don't use `border-radius > 0.5rem` on buttons — keep them angular (editorial)
- Don't use gold as a background fill for large surfaces
- Don't add animations faster than `150ms` — this brand is slow and deliberate
- Don't use colored shadows — only black ambient + gold glow
- Don't use `border-radius: 50%` (circles) on product images — keep them rectangular
- Don't use bright white (`#ffffff`) anywhere — use warm `$on-surface: #e5e2e1`
- Don't use `opacity: 0.5` on buttons for disabled state — use muted background instead

---

## 8. Responsive Behavior

### Breakpoints

| Breakpoint | Width    | Changes                                              |
|------------|----------|------------------------------------------------------|
| Desktop    | > 1024px | 3-column product grid, sidebar visible, full padding |
| Tablet     | ≤ 1024px | 2-column grid, sidebar 220px                         |
| Mobile     | ≤ 768px  | Sidebar collapses to top, 2-col grid, stacked layout |
| Small      | ≤ 480px  | 1-column grid                                        |

### Touch Targets
- Minimum tap target: `44px × 44px`
- Quantity buttons in cart: `25px` (acceptable — desktop-first design)
- Navbar links: full padding ensures ≥ 44px

### Collapsing Strategy
- Sidebar: `position: sticky → position: static`, `width: 260px → 100%`
- Product detail: `flex-row → flex-column`
- Navbar: hamburger menu at `768px`
- Social icons (fixed): move to `bottom: 1rem, centered` on mobile

---

## 9. Agent Prompt Guide

### Quick Color Reference
```
Black background:  #0a0a0a
Gold accent:       #D4AF37
Off-white text:    #e5e2e1
Muted text:        #99907c
Card surface:      #0d0d0d
Card hover:        #1a1a1a
Ghost border:      rgba(#353534, 0.15)
```

### Key Font Pairings
```
Headline: font-family: 'Noto Serif', Georgia, serif; font-weight: 700; letter-spacing: -0.02em;
Label:    font-family: 'Manrope', system-ui, sans-serif; font-weight: 700; letter-spacing: 0.3em; text-transform: uppercase;
Body:     font-family: 'Manrope', system-ui, sans-serif; font-weight: 400; line-height: 1.6;
```

### Ready-to-Use Prompts

**New page section:**
> "Build a section matching the Rixx Noir Atelier DESIGN.md — obsidian background, gold headline (Noto Serif, -0.02em tracking), Manrope body, ghost borders at 15% opacity, gold CTA button with nearly-square border-radius."

**New card component:**
> "Create a product card following Rixx DESIGN.md — #0d0d0d background, gold serif title, gold price, hover: translateY(-8px) + ambient shadow + 1px gold glow ring, image scale(1.08) on hover."

**New form:**
> "Build a form matching Rixx DESIGN.md — #050505 input background, no borders except 2px gold bottom border on focus, Manrope font, ghost-border container panel on #111111 surface."

**Full page:**
> "Design a page using Rixx Noir Atelier: pure black canvas (#0a0a0a), gold accent (#D4AF37) only for headings/prices/CTAs, Noto Serif for headlines, Manrope for body, subtle glassmorphism for floating elements, cinematic radial gold glow behind hero sections."
