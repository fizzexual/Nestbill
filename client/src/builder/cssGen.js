/**
 * Generate real CSS from the styles map. Breakpoints use max-width media
 * queries so they cascade correctly inside the sized iframe: at a narrow width,
 * base + tablet + mobile rules all apply, with the narrowest winning (it comes
 * last). This is the same model Webstudio uses.
 */
export const BREAKPOINTS = {
  base: { label: 'Desktop', width: 1280, media: null },
  tablet: { label: 'Tablet', width: 768, media: '(max-width: 768px)' },
  mobile: { label: 'Mobile', width: 390, media: '(max-width: 479px)' },
};

const ORDER = ['base', 'tablet', 'mobile'];

export function declarationsToCss(decls = {}) {
  return Object.entries(decls)
    .filter(([, v]) => v !== '' && v != null)
    .map(([k, v]) => `${k}: ${v};`)
    .join(' ');
}

/**
 * styles: { [instanceId]: { base?: {...}, tablet?: {...}, mobile?: {...} } }
 * selector(id) lets callers choose the rule selector (editor uses data-ws-id,
 * export uses a clean class).
 */
export function generateCss(styles = {}, selector = (id) => `[data-ws-id="${id}"]`) {
  const byBp = { base: [], tablet: [], mobile: [] };
  for (const [id, perBp] of Object.entries(styles)) {
    for (const bp of ORDER) {
      const decls = perBp?.[bp];
      if (decls && Object.keys(decls).length) {
        const body = declarationsToCss(decls);
        if (body) byBp[bp].push(`${selector(id)} { ${body} }`);
      }
    }
  }
  const parts = [byBp.base.join('\n')];
  if (byBp.tablet.length) parts.push(`@media ${BREAKPOINTS.tablet.media} {\n${byBp.tablet.join('\n')}\n}`);
  if (byBp.mobile.length) parts.push(`@media ${BREAKPOINTS.mobile.media} {\n${byBp.mobile.join('\n')}\n}`);
  return parts.filter(Boolean).join('\n\n');
}
