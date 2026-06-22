# Components & Variables (Milestone 3)

**Date:** 2026-06-22
**Status:** Approved direction (user said "go"); building phase-by-phase
**Goal:** Framer's reusable components — define once, place many instances, edit the master to
update them all, and override exposed variables (text / color / font…) per instance. This is the
"Text_Color_Letters" system from the reference screenshot.

## The enabling idea: decouple style from identity

Today every node carries `data-ws-id` used for BOTH styling (`generateCss` emits
`[data-ws-id="id"]`) and selection. Components need N instances that **share one master's styles**
but remain **individually selectable**. So we split the two concerns:

- **Styling → class.** `generateCss` default selector becomes `.s-<id>`; every rendered node gets
  `class="s-<styleId>"`. For a normal node `styleId = ownId`. For a node rendered inside a component
  instance, `styleId = masterNodeId` — so it inherits the master's styles for free.
- **Identity/selection → `data-ws-id` (unchanged).** Normal node: `data-ws-id = ownId`. Instance-
  expanded node: `data-ws-id = "<instanceId>/<masterId>"` (unique), so selection/drag/overlay code
  (all keyed on `data-ws-id`) is untouched.

This keeps the entire canvas interaction layer (Canvas, DeviceFrame, Overlay, computeDrop)
unchanged. Only `cssGen` (one line) and `InstanceRender` (add className + instance expansion) change.
Export already uses `.c-<id>` classes, so it's conceptually aligned.

## Data model additions

```
project.components = {
  [compId]: { id, name, rootId, variables: [ { id, name, type, default } ] }
}
```
- The master subtree lives in `project.instances` / `project.styles` like a page tree, but is
  attached to a component instead of a page.
- **Variable types:** `text | color | number` (covers the screenshot; extensible later).
- **Binding (on a master node):** `instances[nodeId].bindings = { [prop]: varId }`. Supported props
  this milestone: `text` (content) and the style props `color`, `background-color`, `font-size`,
  `font-family` (bound via a per-node `styleBindings` resolved at render into the instance's class).
- **Instance node:** a normal instance whose `component === 'Instance'`, with
  `props: { componentId, overrides: { [varId]: value } }` and no children of its own.

## Rendering an instance (InstanceRender)

When it hits an `Instance` node, it renders the component's master subtree, passing down
`instancePath = instanceId` and a `resolve(varId)` (overrides[varId] ?? variable.default). Each
master node renders with `data-ws-id="<instanceId>/<masterId>"`, `class="s-<masterId>"`, and any
bound prop replaced by the resolved variable value. Editing the master re-renders every instance
automatically (they read the master live) — that IS the sync.

Selection inside an instance resolves to the **instance node** (you edit the instance's exposed
variables, not the master structure). Double-click / "Edit component" enters the master to edit
structure (master is editable as its own tree).

## Export

`exportSite.renderNode` gains the same instance expansion (emit the master's HTML with overrides
applied and `class="c-<masterId>"`), so exported sites are plain self-contained HTML.

## Phases (each: build + unit tests where pure + live Chrome verify + commit)

1. **Class-based styling (enabler).** `generateCss` default → `.s-<id>`; `InstanceRender` adds
   `class="s-<id>"` (keep `data-ws-id`). No behavior change. Verify all M1/M2 interactions + styles
   still work and console clean. (Pure: cssGen selector test.)
2. **Components + instances + sync.** Data model; `Instance` node + master expansion in
   InstanceRender (composite ids); "Create Component from selection" action; a **Components** left-
   panel tab to drop instances; export expansion. Verify: create a component, place 2 instances,
   edit the master → both update; select an instance.
3. **Variables & overrides.** Define variables on a component; bind master text/color/font to them;
   instance StylePanel shows the variable editors (Text / Font / Color, per the screenshot);
   resolution = override ?? default. Verify: override one instance's text+color, the other stays;
   master structure edits still propagate.
4. **Polish + finalize.** Component rename/list, safe delete (block deleting a component in use or
   detach instances), full build + 84+ tests, export round-trip with instances, merge, deploy, live verify.

## Non-goals (later)

Variable types beyond text/color/number (image/boolean/link), nested components inside components,
component props that change structure (slots), responsive variable values. Scroll animations remain M4.

## Risks & mitigations

- **Class refactor touches all styling** → isolated to cssGen + InstanceRender; phase 1 verifies the
  whole app renders/edits identically before any component work.
- **Duplicate ids across instances** → composite `data-ws-id` guarantees uniqueness; styles shared via class.
- **Sync correctness** → instances render from the master live (no copy), so sync is automatic;
  overrides are resolved at render, never written into the master.
- **Existing projects** → no `components` key needed to load; absence is treated as `{}`.
