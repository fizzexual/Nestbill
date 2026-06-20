import { COMPONENTS } from './components.jsx';
import { generateCss } from './cssGen.js';

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const escAttr = (s) => String(s).replace(/"/g, '&quot;');
const cls = (id) => `c-${id}`;

function renderNode(instances, id, indent) {
  const inst = instances[id];
  if (!inst) return '';
  const def = COMPONENTS[inst.component];
  const c = cls(id);

  if (inst.component === 'Image') {
    return `${indent}<img class="${c}" src="${escAttr(inst.props.src || '')}" alt="${escAttr(inst.props.alt || '')}" />`;
  }
  if (inst.component === 'Divider') {
    return `${indent}<hr class="${c}" />`;
  }
  if (def.container) {
    const kids = inst.children.map((ch) => renderNode(instances, ch, indent + '  ')).filter(Boolean).join('\n');
    return `${indent}<${def.tag} class="${c}">\n${kids}\n${indent}</${def.tag}>`;
  }
  const attrs = inst.component === 'Link' ? ` href="${escAttr(inst.props.href || '#')}"` : '';
  return `${indent}<${def.tag} class="${c}"${attrs}>${esc(inst.props.text || '')}</${def.tag}>`;
}

const slugify = (s) => String(s || 'site').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'site';

/** Build a self-contained HTML document (CSS inlined) for one page. */
export function exportHtmlForPage(project, page) {
  const body = renderNode(project.instances, page.rootId, '    ');
  const css = `*,*::before,*::after { box-sizing: border-box; }\nbody { margin: 0; }\n${generateCss(project.styles, (id) => `.${cls(id)}`)}`;
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${esc(project.name)} — ${esc(page.name)}</title>
  <style>
${css}
  </style>
</head>
<body>
${body}
</body>
</html>
`;
}

/** Self-contained HTML for the first page (used by tests / single-page export). */
export function exportHtml(project) {
  return exportHtmlForPage(project, project.pages[0]);
}

function triggerDownload(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** Download the site: a single HTML for one page, or a ZIP of all pages. */
export async function downloadHtml(project) {
  const name = slugify(project.name);
  if (project.pages.length <= 1) {
    triggerDownload(new Blob([exportHtml(project)], { type: 'text/html' }), `${name}.html`);
    return;
  }
  const JSZip = (await import('jszip')).default;
  const zip = new JSZip();
  project.pages.forEach((p, i) => {
    const file = i === 0 ? 'index.html' : `${slugify(p.name) || `page-${i}`}.html`;
    zip.file(file, exportHtmlForPage(project, p));
  });
  const blob = await zip.generateAsync({ type: 'blob' });
  triggerDownload(blob, `${name}.zip`);
}
