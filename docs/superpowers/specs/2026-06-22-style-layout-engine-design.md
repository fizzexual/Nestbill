# Style/Layout Engine — Framer-grade customization (Milestone 1)

**Date:** 2026-06-22
**Status:** Approved (design), ready to implement
**Goal:** Bring the Prism builder's right-hand panel to Framer's level of control — auto-layout
stacks, mode-based sizing, transforms, blend/opacity, filters, richer position — so users can
build high-quality sites. This is milestone 1 of a multi-milestone push toward Framer parity.

## Non-goals (deferred to later milestones)

- Multi-breakpoint infinite canvas (all devices side-by-side, zoom/pan)
- Components & variables (named reusable components with overrides)
- Scroll / appear animations, overlays, cursor
- Collaboration / publish / branching (hosting infra)

## Guiding principle

The styles store is already **raw, kebab-case CSS** keyed by `id → breakpoint → { 'prop': 'value' }`,
and `generateCss` emits it verbatim for both the editor (`[data-ws-id]`) and export (`.c-<id>`).
Therefore every new control writes plain CSS. The "modes" (Fill/Fit/Fixed/Relative, Stack/Grid)
are a **presentation layer**: pure functions parse a mode *from* the effective CSS and compile a
mode *to* CSS. No schema/migration changes; existing projects and export keep working.

## Architecture

### New pure modules (unit-tested — the builder's first real tests)

- **`layout.js`** — parent-aware sizing + stack helpers. No React.
  - `parentContext(project, id, breakpoint)` → `{ parentId, display, direction }`
    (resolves the flow parent via `findParentId`, reads its effective `display`/`flex-direction`).
  - `axisSizeMode(axis, eff, ctx)` → `{ mode, value }` where `mode ∈ Fill|Fit|Fixed|Relative`.
  - `axisSizeToCss(axis, mode, value, ctx)` → declarations object to apply (and `''` to clear).
  - `alignDecls(ctx, axis, pos)` → declarations for aligning a child within its parent stack
    (cross-axis → `align-self`; main-axis → `margin-*: auto`).
- **`transforms.js`** — composite-shorthand parse/serialize. No React.
  - `parseFilter(str)` / `serializeFilter(obj)` for `filter` and `backdrop-filter`
    (`blur, brightness, contrast, saturate, grayscale, hue-rotate`).
  - `parseSkew(transform)` / `serializeSkew({x,y})` for the skew portion of `transform`.

### Style panel refactor

`StylePanel.jsx` (≈340 lines) is split into a thin composer plus focused sections under
`client/src/builder/panels/`:
`AlignToolbar, ContentSection, LayoutSection, SizeSection, PositionSection, TransformSection,
AppearanceSection, FiltersSection, TypographySection, BackgroundSection, BorderSection,
SpacingSection, ThemePanel`. Each section takes `{ inst, eff, set, setMany, ctx }` and is
independently understandable. `set`/`setMany` wrap `setStyle`/`setStyles` at the active breakpoint.

### New controls in `controls.jsx`

- `Slider` — labeled range + numeric readout (opacity, filter amounts).
- `ModeField` — value input + mode dropdown (the "1fr ▸ Fill" control in the screenshot).
- `AlignGrid` — 3×3 alignment picker for a container's children (align-items × justify-content).
- `IconToggleRow` — small icon button group (alignment toolbar, overflow).

## CSS mapping tables (the crux)

### Size modes (per axis; `main` = width when parent is row / height when column)

| Parent | Axis | Fill | Fit | Fixed | Relative |
|---|---|---|---|---|---|
| flex | main | `flex: 1 1 0%` | `flex: 0 0 auto; <size>: fit-content` | `flex: 0 0 auto; <size>: Npx` | `flex: 0 0 auto; <size>: N%` |
| flex | cross | `align-self: stretch; <size>: auto` | `align-self: flex-start; <size>: auto` | `<size>: Npx` | `<size>: N%` |
| grid | any | `<size>: auto; justify/align-self: stretch` | `<size>: fit-content` | `<size>: Npx` | `<size>: N%` |
| block/other | width | `width: 100%` | `width: fit-content` | `width: Npx` | `width: N%` |
| block/other | height | `height: 100%` | `height: auto` | `height: Npx` | `height: N%` |

`<size>` = `width` or `height`. When switching modes, the compiler also **clears** the props the
new mode doesn't use (e.g. leaving Fill clears `flex`). Min/Max are independent `min-*`/`max-*`
length fields. Parsing is the inverse: presence of `flex-grow:1`/`flex:1*` → Fill; `fit-content`/`auto`
→ Fit; `*px` → Fixed; `*%` → Relative; default → Fit.

### Layout (Stack) — container only

| Control | CSS |
|---|---|
| Mode: Stack | `display: flex` |
| Mode: Grid | `display: grid` |
| Mode: Block | `display: block` |
| Direction (Stack) | `flex-direction: row\|column` |
| Wrap (Stack) | `flex-wrap: wrap\|nowrap` |
| Gap | `gap: Npx` |
| Padding | `padding-{top,right,bottom,left}` |
| Children align (Stack) | `align-items` × `justify-content` via 3×3 grid |
| Grid columns/rows | `grid-template-columns/rows: repeat(N, 1fr)` or custom track string |

(`Free` is not a layout mode — free placement is per-element Position = Absolute, below.)

### Position — element level

| Type | CSS |
|---|---|
| Relative (in-flow) | clear `position,left,top,right,bottom` (default static) |
| Absolute | `position: absolute` + inset; ensure nearest container is `position: relative` |
| Fixed | `position: fixed` + inset |
| Sticky | `position: sticky` + `top` |

Switching to Absolute reuses the existing `makeFree` logic (capture current rect → `left/top/width/height`,
set parent `relative`). Canvas drag/resize (Overlay) continues to work for Absolute/Fixed elements.
Keep `z-index`.

### Transforms — element level

Use the **independent** CSS transform properties (clean, no shorthand parsing); skew via `transform`.

| Control | CSS |
|---|---|
| Translate X/Y | `translate: Xpx Ypx` |
| Rotate | `rotate: Ndeg` |
| Scale | `scale: N` (or `Nx Ny`) |
| Skew X/Y | `transform: skewX(adeg) skewY(bdeg)` |
| Origin | `transform-origin` |

### Appearance — element level

| Control | CSS |
|---|---|
| Opacity | `opacity: 0..1` (slider 0–100; 100 clears) |
| Visible | No → `display: none` |
| Blend | `mix-blend-mode: normal\|multiply\|screen\|overlay\|darken\|lighten\|difference\|exclusion\|hue\|…` |
| Overflow | `overflow: visible\|hidden\|scroll\|auto\|clip` |

### Filters — element level (composite `filter` string)

`blur(px) brightness(n) contrast(n) saturate(n) grayscale(n) hue-rotate(deg)` composed into one
`filter` value; same UI for `backdrop-filter`. Edited via `parseFilter`/`serializeFilter`.

### Alignment toolbar — top of panel

Aligns the **selected element within its parent stack**. Horizontal/vertical buttons map to
`align-self` (cross axis) or `margin-*: auto` (main axis) depending on the parent's direction,
via `alignDecls(ctx, axis, pos)`.

## Implementation phases (each: build + unit tests + live Chrome verify + commit)

1. **Foundation + Size modes** — `layout.js` (+tests), `ModeField`/`Slider`/`AlignGrid` controls,
   split `StylePanel` into `panels/` skeleton, wire **Size** section (W/H mode + min/max).
2. **Layout (Stack)** — container Mode/Direction/Gap/Wrap/Padding + children align (3×3) + grid tracks.
3. **Position** — Type In-flow/Absolute/Fixed/Sticky + inset + z; fold the old Free toggle into Absolute.
4. **Transforms** — translate/rotate/scale/skew/origin (`transforms.js` skew helpers +tests).
5. **Appearance** — Opacity, Visible, Blend, Overflow.
6. **Filters** — `filter` + `backdrop-filter` editor (`transforms.js` filter helpers +tests).
7. **Alignment toolbar** — `alignDecls` (+tests) wired to the top toolbar.
8. **Finalize** — full `npm run build` + `npm test`, export round-trip check, clean console in Chrome,
   then push (auto-deploys to Pages).

## Verification strategy

- **Unit tests** (Vitest) for `layout.js` and `transforms.js`: every mapping-table row and its inverse,
  plus parent-context resolution and edge cases (no parent, grid, block).
- **Live Chrome** (preview_eval at 1440×900) per phase: apply each control, assert the iframe element's
  `getComputedStyle` matches the table, and confirm no console errors.
- **Export round-trip:** render exported HTML in a throwaway iframe and confirm computed styles match
  the editor (guards the `.c-<id>` selector path).

## Risks & mitigations

- **Fill resolution depends on parent layout** → centralized in `parentContext`; tested across flex/grid/block.
- **Independent transform props** (`translate`/`rotate`/`scale`) need modern browsers → acceptable
  (editor is Chromium; export targets evergreen browsers); skew stays in `transform`.
- **Panel refactor regressions** → sections are pure presentational; verified live after the split in phase 1.
