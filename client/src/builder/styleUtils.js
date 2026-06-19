// Cascade order for each breakpoint (max-width model: narrower wins, applied last).
const CASCADE = {
  base: ['base'],
  tablet: ['base', 'tablet'],
  mobile: ['base', 'tablet', 'mobile'],
};

/** Effective (cascaded) declarations for an instance at a breakpoint. */
export function effectiveStyle(perId = {}, breakpoint = 'base') {
  const out = {};
  for (const bp of CASCADE[breakpoint] || ['base']) Object.assign(out, perId[bp] || {});
  return out;
}

/** Is `prop` explicitly set at this exact breakpoint (i.e. an override)? */
export function isSetAt(perId = {}, breakpoint, prop) {
  return Boolean(perId[breakpoint] && prop in perId[breakpoint]);
}

const LEN_RE = /^(-?[\d.]+)(px|%|rem|em|vh|vw)$/;

/** Parse a CSS length into { num, unit }. Keywords like 'auto' return unit:'auto'. */
export function parseLength(value) {
  if (value == null || value === '') return { num: '', unit: 'px' };
  if (value === 'auto') return { num: '', unit: 'auto' };
  const m = String(value).match(LEN_RE);
  if (m) return { num: m[1], unit: m[2] };
  return { num: String(value), unit: '' };
}
