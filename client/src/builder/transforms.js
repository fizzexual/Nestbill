/**
 * Parse/serialize for the composite CSS values the Transform and Filter panels
 * edit. translate/rotate/scale use the independent CSS properties; skew lives in
 * the `transform` string (which, in this builder, only ever holds skew). Pure —
 * unit-tested.
 */

/* ---------- translate (CSS `translate: <x> <y>`) ---------- */
export function parseTranslate(value = '') {
  const parts = String(value).trim().split(/\s+/).filter(Boolean);
  const x = parts[0] != null ? parseFloat(parts[0]) : NaN;
  const y = parts[1] != null ? parseFloat(parts[1]) : NaN;
  return { x: Number.isNaN(x) ? '' : x, y: Number.isNaN(y) ? '' : y };
}
export function serializeTranslate(x, y) {
  const nx = x === '' || x == null ? 0 : Number(x);
  const ny = y === '' || y == null ? 0 : Number(y);
  if (nx === 0 && ny === 0) return '';
  return `${nx}px ${ny}px`;
}

/* ---------- skew (lives inside `transform`) ---------- */
export function parseSkew(transform = '') {
  const sx = /skewX\((-?[\d.]+)deg\)/.exec(transform);
  const sy = /skewY\((-?[\d.]+)deg\)/.exec(transform);
  return { x: sx ? Number(sx[1]) : '', y: sy ? Number(sy[1]) : '' };
}
export function serializeSkew(x, y) {
  const parts = [];
  if (x !== '' && x != null && Number(x) !== 0) parts.push(`skewX(${Number(x)}deg)`);
  if (y !== '' && y != null && Number(y) !== 0) parts.push(`skewY(${Number(y)}deg)`);
  return parts.join(' ');
}

/* ---------- filter / backdrop-filter (one shorthand string) ---------- */
// label → { fn, unit, default } for each supported filter function.
export const FILTER_FUNCS = [
  { key: 'blur', fn: 'blur', unit: 'px', def: 0 },
  { key: 'brightness', fn: 'brightness', unit: '%', def: 100 },
  { key: 'contrast', fn: 'contrast', unit: '%', def: 100 },
  { key: 'saturate', fn: 'saturate', unit: '%', def: 100 },
  { key: 'grayscale', fn: 'grayscale', unit: '%', def: 0 },
  { key: 'hue', fn: 'hue-rotate', unit: 'deg', def: 0 },
];

export function parseFilter(value = '') {
  const out = {};
  for (const f of FILTER_FUNCS) {
    const m = new RegExp(`${f.fn}\\((-?[\\d.]+)${f.unit === '%' ? '%' : f.unit}\\)`).exec(value);
    if (m) out[f.key] = Number(m[1]);
  }
  return out;
}
export function serializeFilter(obj = {}) {
  const parts = [];
  for (const f of FILTER_FUNCS) {
    const v = obj[f.key];
    if (v == null || v === '' || Number(v) === f.def) continue;
    parts.push(`${f.fn}(${Number(v)}${f.unit})`);
  }
  return parts.join(' ');
}
