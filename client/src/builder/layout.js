/**
 * Parent-aware sizing engine. Framer-style size *modes* (Fill / Fit / Fixed /
 * Relative) are a presentation layer over plain CSS: we parse a mode FROM the
 * effective CSS and compile a mode TO CSS, using the parent's layout as context.
 * Pure functions only — no React, no store — so they're trivially unit-tested.
 */
import { findParentId } from './model.js';
import { effectiveStyle } from './styleUtils.js';

export const SIZE_MODES = ['Fill', 'Fit', 'Fixed', 'Relative'];

const isFlexDisplay = (d) => d === 'flex' || d === 'inline-flex';
const isGridDisplay = (d) => d === 'grid' || d === 'inline-grid';

/** Resolve the flow parent's layout so sizing can choose the right CSS. */
export function parentContext(project, id, breakpoint = 'base') {
  const parentId = project ? findParentId(project.instances, id) : null;
  if (!parentId) return { parentId: null, display: 'block', direction: 'row' };
  const eff = effectiveStyle(project.styles?.[parentId] || {}, breakpoint);
  return {
    parentId,
    display: eff.display || 'block',
    direction: eff['flex-direction'] || 'row',
  };
}

/** For a flex parent, is this axis the main or cross axis? */
function flexRole(axis, ctx) {
  const isRow = ctx.direction !== 'column' && ctx.direction !== 'column-reverse';
  if (axis === 'width') return isRow ? 'main' : 'cross';
  return isRow ? 'cross' : 'main';
}

const numOf = (v) => {
  const n = parseFloat(v);
  return Number.isNaN(n) ? '' : n;
};
const withUnit = (v, unit) => {
  if (v === '' || v == null) return '';
  return /[a-z%]/i.test(String(v)) ? String(v) : `${v}${unit}`;
};
const px = (v) => withUnit(v, 'px');
const pct = (v) => withUnit(v, '%');

/** Is a CSS length an explicit px or % value? Returns 'Fixed' | 'Relative' | null. */
function unitMode(v) {
  if (v == null || v === '') return null;
  if (/^-?[\d.]+px$/.test(String(v))) return 'Fixed';
  if (/^-?[\d.]+%$/.test(String(v))) return 'Relative';
  return null;
}

/**
 * Compile a size mode to a declarations object (values to set; '' means clear).
 * Pass the result to setStyles(), which deletes '' keys.
 */
export function axisSizeToCss(axis, mode, value, ctx) {
  const size = axis; // 'width' | 'height'
  const out = { [size]: '' };
  const flex = isFlexDisplay(ctx.display);
  const grid = isGridDisplay(ctx.display);
  const role = flex ? flexRole(axis, ctx) : null;
  const gridSelf = axis === 'width' ? 'justify-self' : 'align-self';

  // Reset the auxiliary prop this axis owns, so mode switches don't leave residue.
  if (flex && role === 'main') out.flex = '';
  if (flex && role === 'cross') out['align-self'] = '';
  if (grid) out[gridSelf] = '';

  if (flex && role === 'main') {
    if (mode === 'Fill') out.flex = '1 1 0%';
    else if (mode === 'Fit') out.flex = '0 0 auto';
    else if (mode === 'Fixed') { out.flex = '0 0 auto'; out[size] = px(value); }
    else if (mode === 'Relative') { out.flex = '0 0 auto'; out[size] = pct(value); }
  } else if (flex && role === 'cross') {
    if (mode === 'Fill') out['align-self'] = 'stretch';
    else if (mode === 'Fit') out['align-self'] = 'flex-start';
    else if (mode === 'Fixed') out[size] = px(value);
    else if (mode === 'Relative') out[size] = pct(value);
  } else if (grid) {
    if (mode === 'Fill') out[gridSelf] = 'stretch';
    else if (mode === 'Fit') out[gridSelf] = 'start';
    else if (mode === 'Fixed') out[size] = px(value);
    else if (mode === 'Relative') out[size] = pct(value);
  } else {
    if (mode === 'Fill') out[size] = '100%';
    else if (mode === 'Fit') out[size] = axis === 'width' ? 'fit-content' : 'auto';
    else if (mode === 'Fixed') out[size] = px(value);
    else if (mode === 'Relative') out[size] = pct(value);
  }
  return out;
}

/** Parse the current size mode + numeric value for an axis from effective CSS. */
export function axisSizeMode(axis, eff = {}, ctx = { display: 'block', direction: 'row' }) {
  const size = axis;
  const sizeVal = eff[size] || '';
  const um = unitMode(sizeVal);
  const flex = isFlexDisplay(ctx.display);
  const grid = isGridDisplay(ctx.display);
  const role = flex ? flexRole(axis, ctx) : null;

  if (flex && role === 'main') {
    const grow = parseFloat(eff.flex);
    if (!Number.isNaN(grow) && grow >= 1) return { mode: 'Fill', value: '' };
    if (um) return { mode: um, value: numOf(sizeVal) };
    return { mode: 'Fit', value: '' };
  }
  if (flex && role === 'cross') {
    if ((eff['align-self'] || '') === 'stretch') return { mode: 'Fill', value: '' };
    if (um) return { mode: um, value: numOf(sizeVal) };
    return { mode: 'Fit', value: '' };
  }
  if (grid) {
    const self = axis === 'width' ? eff['justify-self'] : eff['align-self'];
    if ((self || '') === 'stretch') return { mode: 'Fill', value: '' };
    if (um) return { mode: um, value: numOf(sizeVal) };
    return { mode: 'Fit', value: '' };
  }
  if (sizeVal === '100%') return { mode: 'Fill', value: '' };
  if (um === 'Fixed') return { mode: 'Fixed', value: numOf(sizeVal) };
  if (um === 'Relative') return { mode: 'Relative', value: numOf(sizeVal) };
  return { mode: 'Fit', value: '' };
}

/** A sensible default value when switching INTO a mode that needs one. */
export function defaultForMode(mode, current) {
  if (mode === 'Fixed') return current || 100;
  if (mode === 'Relative') return current || 100;
  return '';
}
