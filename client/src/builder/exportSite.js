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

/** Build a self-contained HTML document (CSS inlined) for the first page. */
export function exportHtml(project) {
  const page = project.pages[0];
  const body = renderNode(project.instances, page.rootId, '    ');
  const css = `*,*::before,*::after { box-sizing: border-box; }\nbody { margin: 0; }\n${generateCss(project.styles, (id) => `.${cls(id)}`)}`;
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${esc(project.name)}</title>
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

/** Trigger a browser download of the exported HTML. */
export function downloadHtml(project) {
  const html = exportHtml(project);
  const slug = String(project.name || 'site').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'site';
  const blob = new Blob([html], { type: 'text/html' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${slug}.html`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
