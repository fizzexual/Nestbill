import { useBuilder, useUI, clipboard } from './store.js';
import { effectiveStyle } from './styleUtils.js';
import { findParentId, snapshotSubtree, getActivePage } from './model.js';
import { isContainer } from './components.jsx';

const project = () => useBuilder.getState().project;
const bp = () => useUI.getState().breakpoint;
const activePage = () => getActivePage(project(), useUI.getState().activePageId);

const nextZ = () => {
  let m = 0;
  for (const s of Object.values(project().styles)) {
    const z = parseInt(s.base?.['z-index'], 10);
    if (!Number.isNaN(z)) m = Math.max(m, z);
  }
  return m + 1;
};

export const isFree = (id) => ['absolute', 'fixed'].includes(effectiveStyle(project().styles[id] || {}, bp()).position);

const isRoot = (id) => id === activePage().rootId;

/** Where should a pasted/inserted sibling go relative to the current selection? */
function dropTarget(selId) {
  const p = project();
  const rootId = activePage().rootId;
  if (!selId || !p.instances[selId]) return { parentId: rootId, index: undefined };
  if (isContainer(p.instances[selId].component)) return { parentId: selId, index: undefined };
  const pid = findParentId(p.instances, selId);
  if (!pid) return { parentId: rootId, index: undefined };
  return { parentId: pid, index: p.instances[pid].children.indexOf(selId) + 1 };
}

export function copy(id) {
  const target = id || useUI.getState().selectedId;
  if (!target) return;
  clipboard.set(snapshotSubtree(project(), target));
}

export function paste() {
  const snap = clipboard.get();
  if (!snap) return;
  const { parentId, index } = dropTarget(useUI.getState().selectedId);
  const newId = useBuilder.getState().pasteSnapshot(parentId, index, snap);
  if (newId) useUI.getState().select(newId);
}

export function duplicateSel(id) {
  const target = id || useUI.getState().selectedId;
  if (!target || isRoot(target)) return;
  const nid = useBuilder.getState().duplicate(target);
  if (nid) useUI.getState().select(nid);
}

export function deleteSel(id) {
  const target = id || useUI.getState().selectedId;
  if (!target || isRoot(target)) return;
  useBuilder.getState().remove(target);
  useUI.getState().select(null);
}

export function bringToFront(id) {
  const target = id || useUI.getState().selectedId;
  if (!target || isRoot(target)) return;
  if (isFree(target)) {
    useBuilder.getState().setStyle(target, bp(), 'z-index', String(nextZ()));
  } else {
    const pid = findParentId(project().instances, target);
    if (pid) useBuilder.getState().move(target, pid, project().instances[pid].children.length);
  }
}

export function sendToBack(id) {
  const target = id || useUI.getState().selectedId;
  if (!target || isRoot(target)) return;
  if (isFree(target)) {
    useBuilder.getState().setStyle(target, bp(), 'z-index', '0');
  } else {
    const pid = findParentId(project().instances, target);
    if (pid) useBuilder.getState().move(target, pid, 0);
  }
}

function makeFree(id, position = 'absolute') {
  const p = project();
  const rootId = activePage().rootId;
  const doc = document.querySelector('iframe')?.contentDocument;
  const el = doc?.querySelector(`[data-ws-id="${id}"]`);
  const rootEl = doc?.querySelector(`[data-ws-id="${rootId}"]`);
  const decls = { position, margin: '0px', 'z-index': String(nextZ()) };
  if (el && rootEl) {
    const er = el.getBoundingClientRect();
    const rr = rootEl.getBoundingClientRect();
    decls.left = `${Math.round(er.left - rr.left)}px`;
    decls.top = `${Math.round(er.top - rr.top)}px`;
    decls.width = `${Math.round(er.width)}px`;
    decls.height = `${Math.round(er.height)}px`;
  }
  if ((p.styles[rootId]?.base || {}).position !== 'relative') useBuilder.getState().setStyle(rootId, 'base', 'position', 'relative');
  useBuilder.getState().setStyles(id, bp(), decls);
}

function makeFlow(id) {
  useBuilder.getState().setStyles(id, bp(), { position: '', left: '', top: '', 'z-index': '', margin: '' });
}

export function toggleFree(id) {
  const target = id || useUI.getState().selectedId;
  if (!target || isRoot(target)) return;
  if (isFree(target)) makeFlow(target);
  else makeFree(target);
}

/** Set an element's position type (flow | absolute | fixed | sticky). */
export function setPositionType(id, type) {
  const target = id || useUI.getState().selectedId;
  if (!target || isRoot(target)) return;
  if (type === 'sticky') {
    const st = effectiveStyle(project().styles[target] || {}, bp());
    useBuilder.getState().setStyles(target, bp(), { position: 'sticky', top: st.top || '0px', left: '', right: '', bottom: '', margin: '' });
    return;
  }
  if (type === 'absolute' || type === 'fixed') { makeFree(target, type); return; }
  makeFlow(target);
}

const ARROWS = { arrowleft: [-1, 0], arrowright: [1, 0], arrowup: [0, -1], arrowdown: [0, 1] };

/** Handle an editor keyboard shortcut. Returns true if handled. */
export function handleShortcut(e) {
  const t = e.target;
  if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)) return false;
  const meta = e.ctrlKey || e.metaKey;
  const k = e.key.toLowerCase();
  const temporal = useBuilder.temporal.getState();

  if (meta && k === 'z') { e.preventDefault(); if (e.shiftKey) temporal.redo(); else temporal.undo(); return true; }
  if (meta && k === 'y') { e.preventDefault(); temporal.redo(); return true; }
  if (meta && k === 'd') { e.preventDefault(); duplicateSel(); return true; }
  if (meta && k === 'c') { e.preventDefault(); copy(); return true; }
  if (meta && k === 'v') { e.preventDefault(); paste(); return true; }

  const sel = useUI.getState().selectedId;
  if (!sel) return false;
  if (k === 'delete' || k === 'backspace') { e.preventDefault(); deleteSel(); return true; }
  if (k === ']') { bringToFront(); return true; }
  if (k === '[') { sendToBack(); return true; }

  if (ARROWS[k] && isFree(sel)) {
    e.preventDefault();
    const [nx, ny] = ARROWS[k];
    const step = e.shiftKey ? 10 : 1;
    const st = effectiveStyle(project().styles[sel] || {}, bp());
    const left = parseFloat(st.left) || 0;
    const top = parseFloat(st.top) || 0;
    useBuilder.getState().setStyles(sel, bp(), { left: `${left + nx * step}px`, top: `${top + ny * step}px` });
    return true;
  }
  return false;
}
