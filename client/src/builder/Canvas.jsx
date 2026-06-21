import { useEffect, useRef, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Hand, Minus, Plus, Maximize } from 'lucide-react';
import { useBuilder, useUI } from './store.js';
import { BREAKPOINTS, generateCss } from './cssGen.js';
import { COMPONENTS } from './components.jsx';
import { findParentId, getActivePage } from './model.js';
import { effectiveStyle } from './styleUtils.js';
import { handleShortcut } from './actions.js';
import { InstanceRender } from './InstanceRender.jsx';
import Overlay from './Overlay.jsx';

const RESET = `*,*::before,*::after{box-sizing:border-box}html,body{margin:0;padding:0}body{min-height:100%}img{max-width:100%}`;
const EDIT_HELPERS = `[data-ws-id]:empty{min-height:48px;min-width:48px;outline:1px dashed #cbd5e1;outline-offset:-1px} canvas{pointer-events:none}`;

const DRAG_TYPE = 'text/prism-component';
const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, n));

/** Decide where a dragged component should land. Coords are iframe-viewport relative. */
function computeDrop(e, doc, instances, rootId, excludeId) {
  let el = doc.elementFromPoint(e.clientX, e.clientY);
  el = el && el.closest('[data-ws-id]');
  if (excludeId && el) {
    const dragged = doc.querySelector(`[data-ws-id="${excludeId}"]`);
    if (dragged && dragged.contains(el)) el = dragged.parentElement?.closest('[data-ws-id]') || null;
  }
  if (!el) {
    const r = doc.querySelector(`[data-ws-id="${rootId}"]`)?.getBoundingClientRect();
    return { parentId: rootId, index: instances[rootId].children.length, line: r ? { left: r.left, top: r.bottom - 2, width: r.width } : null };
  }
  const id = el.getAttribute('data-ws-id');
  const inst = instances[id];
  const rect = el.getBoundingClientRect();

  if (COMPONENTS[inst.component]?.container) {
    const childEls = inst.children.map((c) => doc.querySelector(`[data-ws-id="${c}"]`)).filter(Boolean);
    let index = childEls.length;
    for (let i = 0; i < childEls.length; i++) {
      const cr = childEls[i].getBoundingClientRect();
      if (e.clientY < cr.top + cr.height / 2) { index = i; break; }
    }
    let line;
    if (childEls.length === 0) line = { left: rect.left + 8, top: rect.top + rect.height / 2, width: Math.max(0, rect.width - 16) };
    else if (index < childEls.length) { const cr = childEls[index].getBoundingClientRect(); line = { left: cr.left, top: cr.top, width: cr.width }; }
    else { const cr = childEls[childEls.length - 1].getBoundingClientRect(); line = { left: cr.left, top: cr.bottom, width: cr.width }; }
    return { parentId: id, index, line };
  }

  const parentId = findParentId(instances, id);
  if (!parentId) return null;
  const after = e.clientY > rect.top + rect.height / 2;
  const index = instances[parentId].children.indexOf(id) + (after ? 1 : 0);
  return { parentId, index, line: { left: rect.left, top: after ? rect.bottom : rect.top, width: rect.width } };
}

/** Snap a free element's rect to other elements' / page edges & centers. Coords are root-relative. */
function snapFree(rect, others, pageW, pageH, t = 6) {
  const mx = [rect.left, rect.left + rect.width / 2, rect.left + rect.width];
  const my = [rect.top, rect.top + rect.height / 2, rect.top + rect.height];
  const cx = [0, pageW / 2, pageW];
  const cy = [0, pageH / 2, pageH];
  for (const o of others) {
    cx.push(o.left, o.left + o.width / 2, o.left + o.width);
    cy.push(o.top, o.top + o.height / 2, o.top + o.height);
  }
  let dx = 0;
  let dy = 0;
  let guideX = null;
  let guideY = null;
  let bestX = t + 1;
  let bestY = t + 1;
  for (const m of mx) for (const c of cx) { const d = c - m; if (Math.abs(d) <= t && Math.abs(d) < bestX) { bestX = Math.abs(d); dx = d; guideX = c; } }
  for (const m of my) for (const c of cy) { const d = c - m; if (Math.abs(d) <= t && Math.abs(d) < bestY) { bestY = Math.abs(d); dy = d; guideY = c; } }
  return { left: rect.left + dx, top: rect.top + dy, guideX, guideY };
}

export default function Canvas() {
  const project = useBuilder((s) => s.project);
  const styles = project?.styles;
  const breakpoint = useUI((s) => s.breakpoint);
  const previewMode = useUI((s) => s.previewMode);
  const activePageId = useUI((s) => s.activePageId);

  const surfaceRef = useRef(null);
  const iframeRef = useRef(null);
  const wsStyleRef = useRef(null);
  const [mountNode, setMountNode] = useState(null);
  const [dropLine, setDropLine] = useState(null);
  const [guides, setGuides] = useState([]);
  const editingRef = useRef(null);

  // Infinite-canvas view (pan/zoom) + pan tooling.
  const [view, setView] = useState({ z: 1, panX: 0, panY: 0 });
  const [tool, setTool] = useState('select'); // 'select' | 'hand'
  const [spaceDown, setSpaceDown] = useState(false);
  const [grabbing, setGrabbing] = useState(false);
  const panActive = !previewMode && (tool === 'hand' || spaceDown);

  const page = getActivePage(project, activePageId);
  const width = BREAKPOINTS[breakpoint]?.width || 1280;

  const fit = useCallback(() => {
    const s = surfaceRef.current?.getBoundingClientRect();
    if (!s) return;
    const margin = 56;
    const z = clamp((s.width - margin * 2) / width, 0.1, 1);
    setView({ z, panX: (s.width - width * z) / 2, panY: margin });
  }, [width]);

  // Center/fit the frame once the surface is measured.
  useEffect(() => { fit(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, []);

  useEffect(() => {
    const iframe = iframeRef.current;
    if (!iframe) return undefined;
    const doc = iframe.contentDocument;
    doc.open();
    doc.write('<!doctype html><html><head><meta charset="utf-8"><style id="reset"></style><style id="ws"></style><style id="edit"></style></head><body></body></html>');
    doc.close();
    doc.getElementById('reset').textContent = RESET;
    wsStyleRef.current = doc.getElementById('ws');
    setMountNode(doc.body);
    return undefined;
  }, []);

  useEffect(() => {
    if (wsStyleRef.current) wsStyleRef.current.textContent = generateCss(styles || {});
  }, [styles]);

  useEffect(() => {
    const editEl = iframeRef.current?.contentDocument?.getElementById('edit');
    if (editEl) editEl.textContent = previewMode ? '' : EDIT_HELPERS;
  }, [previewMode, mountNode]);

  // Size the iframe to its content so the whole page is visible on the canvas.
  useEffect(() => {
    const iframe = iframeRef.current;
    const doc = iframe?.contentDocument;
    if (!doc) return undefined;
    const update = () => { const h = doc.body?.scrollHeight || 0; iframe.style.height = `${Math.max(h, 400)}px`; };
    const ro = new ResizeObserver(update);
    if (doc.body) ro.observe(doc.body);
    const t = setInterval(update, 250);
    update();
    return () => { ro.disconnect(); clearInterval(t); };
  }, [mountNode]);

  // Zoom (ctrl/⌘+wheel, toward cursor) and pan (wheel/trackpad) on the surface.
  useEffect(() => {
    const surf = surfaceRef.current;
    if (!surf) return undefined;
    const onWheel = (e) => {
      e.preventDefault();
      if (e.ctrlKey || e.metaKey) {
        const r = surf.getBoundingClientRect();
        const cx = e.clientX - r.left;
        const cy = e.clientY - r.top;
        setView((v) => {
          const z2 = clamp(v.z * Math.exp(-e.deltaY * 0.0015), 0.1, 3);
          const wx = (cx - v.panX) / v.z;
          const wy = (cy - v.panY) / v.z;
          return { z: z2, panX: cx - wx * z2, panY: cy - wy * z2 };
        });
      } else {
        setView((v) => ({ ...v, panX: v.panX - e.deltaX, panY: v.panY - e.deltaY }));
      }
    };
    surf.addEventListener('wheel', onWheel, { passive: false });
    return () => surf.removeEventListener('wheel', onWheel);
  }, []);

  // Hold Space to pan (ignored while typing in the editor chrome).
  useEffect(() => {
    const editingField = (t) => t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable);
    const down = (e) => { if (e.code === 'Space' && !editingField(e.target) && !editingRef.current) { setSpaceDown(true); } };
    const up = (e) => { if (e.code === 'Space') setSpaceDown(false); };
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    return () => { window.removeEventListener('keydown', down); window.removeEventListener('keyup', up); };
  }, []);

  const zoomBy = (factor) => {
    const r = surfaceRef.current?.getBoundingClientRect();
    if (!r) return;
    const cx = r.width / 2;
    const cy = r.height / 2;
    setView((v) => {
      const z2 = clamp(v.z * factor, 0.1, 3);
      const wx = (cx - v.panX) / v.z;
      const wy = (cy - v.panY) / v.z;
      return { z: z2, panX: cx - wx * z2, panY: cy - wy * z2 };
    });
  };

  const startPan = (e) => {
    e.preventDefault();
    const start = { x: e.clientX, y: e.clientY, panX: view.panX, panY: view.panY };
    setGrabbing(true);
    const move = (ev) => setView((v) => ({ ...v, panX: start.panX + (ev.clientX - start.x), panY: start.panY + (ev.clientY - start.y) }));
    const up = () => { window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', up); setGrabbing(false); };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
  };

  // select + drag-to-move (free positioning)
  useEffect(() => {
    const doc = iframeRef.current?.contentDocument;
    if (!doc || previewMode) return undefined;
    const idOf = (el) => el?.closest?.('[data-ws-id]')?.getAttribute('data-ws-id') || null;
    const rootId = () => getActivePage(useBuilder.getState().project, useUI.getState().activePageId).rootId;
    const nextZ = () => {
      let max = 0;
      for (const s of Object.values(useBuilder.getState().project.styles)) {
        const z = parseInt(s.base?.['z-index'], 10);
        if (!Number.isNaN(z)) max = Math.max(max, z);
      }
      return max + 1;
    };
    let drag = null;

    const isFree = (id) => {
      const pos = effectiveStyle(useBuilder.getState().project.styles[id] || {}, useUI.getState().breakpoint).position;
      return pos === 'absolute' || pos === 'fixed';
    };
    const onDown = (e) => {
      if (editingRef.current && editingRef.current.el.contains(e.target)) return;
      const el = e.target.closest?.('[data-ws-id]');
      const id = idOf(el);
      if (!id) { useUI.getState().select(null); return; }
      useUI.getState().select(id);
      if (id === rootId()) return;
      if (isFree(id)) {
        const er = el.getBoundingClientRect();
        const rr = doc.querySelector(`[data-ws-id="${rootId()}"]`).getBoundingClientRect();
        drag = { type: 'move', id, el, sx: e.clientX, sy: e.clientY, left: Math.round(er.left - rr.left), top: Math.round(er.top - rr.top), w: Math.round(er.width), h: Math.round(er.height), moved: false };
      } else {
        drag = { type: 'reorder', id, el, sx: e.clientX, sy: e.clientY, moved: false, drop: null };
      }
      try { el.setPointerCapture(e.pointerId); } catch { /* ignore */ }
      e.preventDefault();
    };
    const onMove = (e) => {
      if (!drag) { useUI.getState().hover(idOf(e.target.closest?.('[data-ws-id]'))); return; }
      const dx = e.clientX - drag.sx;
      const dy = e.clientY - drag.sy;
      if (!drag.moved && Math.hypot(dx, dy) < 4) return;
      drag.moved = true;
      if (drag.type === 'move') {
        const rr = doc.querySelector(`[data-ws-id="${rootId()}"]`).getBoundingClientRect();
        const rid = rootId();
        const others = [...doc.querySelectorAll('[data-ws-id]')]
          .filter((n) => n !== drag.el && n.getAttribute('data-ws-id') !== rid && !drag.el.contains(n) && !n.contains(drag.el))
          .map((n) => { const r = n.getBoundingClientRect(); return { left: r.left - rr.left, top: r.top - rr.top, width: r.width, height: r.height }; });
        const snapped = snapFree({ left: drag.left + dx, top: drag.top + dy, width: drag.w, height: drag.h }, others, rr.width, rr.height);
        drag.el.style.left = `${Math.round(snapped.left)}px`;
        drag.el.style.top = `${Math.round(snapped.top)}px`;
        const gs = [];
        if (snapped.guideX != null) gs.push({ axis: 'x', pos: snapped.guideX });
        if (snapped.guideY != null) gs.push({ axis: 'y', pos: snapped.guideY });
        setGuides(gs);
      } else {
        drag.el.style.opacity = '0.4';
        drag.drop = computeDrop(e, doc, useBuilder.getState().project.instances, rootId(), drag.id);
        setDropLine(drag.drop ? drag.drop.line : null);
      }
    };
    const onUp = () => {
      if (drag) {
        if (drag.type === 'move' && drag.moved) {
          const { id, el } = drag;
          useBuilder.getState().setStyles(id, useUI.getState().breakpoint, { left: el.style.left, top: el.style.top, 'z-index': String(nextZ()) });
          requestAnimationFrame(() => { el.style.left = ''; el.style.top = ''; });
        } else if (drag.type === 'reorder') {
          drag.el.style.opacity = '';
          const t = drag.drop;
          if (drag.moved && t) {
            const instances = useBuilder.getState().project.instances;
            let index = t.index;
            const oldParent = findParentId(instances, drag.id);
            if (t.parentId === oldParent) {
              const oldIndex = instances[oldParent].children.indexOf(drag.id);
              if (index > oldIndex) index -= 1;
            }
            useBuilder.getState().move(drag.id, t.parentId, index);
          }
          setDropLine(null);
        }
      }
      setGuides([]);
      drag = null;
    };
    const onClick = (e) => e.preventDefault();
    const onLeave = () => useUI.getState().hover(null);
    const onContextMenu = (e) => {
      const el = e.target.closest?.('[data-ws-id]');
      const id = el?.getAttribute('data-ws-id');
      if (!id) return;
      e.preventDefault();
      useUI.getState().select(id);
      const f = iframeRef.current.getBoundingClientRect();
      useUI.getState().setMenu({ x: f.left + e.clientX * view.z, y: f.top + e.clientY * view.z, id });
    };
    const onKey = (e) => { if (!editingRef.current) handleShortcut(e); };

    doc.addEventListener('pointerdown', onDown);
    doc.addEventListener('pointermove', onMove);
    doc.addEventListener('pointerup', onUp);
    doc.addEventListener('click', onClick, true);
    doc.addEventListener('mouseleave', onLeave);
    doc.addEventListener('contextmenu', onContextMenu);
    doc.addEventListener('keydown', onKey);
    return () => {
      doc.removeEventListener('pointerdown', onDown);
      doc.removeEventListener('pointermove', onMove);
      doc.removeEventListener('pointerup', onUp);
      doc.removeEventListener('click', onClick, true);
      doc.removeEventListener('mouseleave', onLeave);
      doc.removeEventListener('contextmenu', onContextMenu);
      doc.removeEventListener('keydown', onKey);
    };
  }, [mountNode, previewMode, view.z]);

  // drag-to-insert
  useEffect(() => {
    const doc = iframeRef.current?.contentDocument;
    if (!doc || previewMode) return undefined;
    const rootId = () => getActivePage(useBuilder.getState().project, useUI.getState().activePageId).rootId;
    const onDragOver = (e) => {
      if (!Array.from(e.dataTransfer.types).includes(DRAG_TYPE)) return;
      e.preventDefault();
      e.dataTransfer.dropEffect = 'copy';
      const t = computeDrop(e, doc, useBuilder.getState().project.instances, rootId());
      setDropLine(t ? t.line : null);
    };
    const onDrop = (e) => {
      if (!Array.from(e.dataTransfer.types).includes(DRAG_TYPE)) return;
      e.preventDefault();
      const comp = e.dataTransfer.getData(DRAG_TYPE);
      const t = computeDrop(e, doc, useBuilder.getState().project.instances, rootId());
      setDropLine(null);
      if (comp && t) { const id = useBuilder.getState().insert(comp, t.parentId, t.index); useUI.getState().select(id); }
    };
    const onLeave = (e) => { if (e.target === doc.documentElement || !e.relatedTarget) setDropLine(null); };
    doc.addEventListener('dragover', onDragOver);
    doc.addEventListener('drop', onDrop);
    doc.addEventListener('dragleave', onLeave);
    return () => { doc.removeEventListener('dragover', onDragOver); doc.removeEventListener('drop', onDrop); doc.removeEventListener('dragleave', onLeave); };
  }, [mountNode, previewMode]);

  // double-click to edit text inline
  useEffect(() => {
    const doc = iframeRef.current?.contentDocument;
    if (!doc || previewMode) return undefined;
    const TEXT = new Set(['Heading', 'Text', 'Button', 'Link', 'Quote']);
    const commit = () => {
      const ed = editingRef.current;
      if (!ed) return;
      editingRef.current = null;
      useBuilder.getState().setProp(ed.id, 'text', ed.el.textContent);
      ed.el.removeAttribute('contenteditable');
    };
    const onDbl = (e) => {
      const el = e.target.closest?.('[data-ws-id]');
      const id = el?.getAttribute('data-ws-id');
      if (!id || !TEXT.has(useBuilder.getState().project.instances[id]?.component)) return;
      e.preventDefault();
      editingRef.current = { el, id };
      el.setAttribute('contenteditable', 'true');
      el.focus();
      const range = doc.createRange();
      range.selectNodeContents(el);
      const sel = doc.getSelection();
      sel.removeAllRanges();
      sel.addRange(range);
    };
    const onKey = (e) => {
      if (!editingRef.current) return;
      if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); editingRef.current.el.blur(); }
      else if (e.key === 'Escape') { editingRef.current.el.blur(); }
      e.stopPropagation();
    };
    const onFocusOut = (e) => { if (editingRef.current && e.target === editingRef.current.el) commit(); };
    doc.addEventListener('dblclick', onDbl);
    doc.addEventListener('keydown', onKey, true);
    doc.addEventListener('focusout', onFocusOut, true);
    return () => {
      doc.removeEventListener('dblclick', onDbl);
      doc.removeEventListener('keydown', onKey, true);
      doc.removeEventListener('focusout', onFocusOut, true);
    };
  }, [mountNode, previewMode]);

  const { z, panX, panY } = view;

  return (
    <div
      ref={surfaceRef}
      className="relative flex-1 overflow-hidden bg-neutral-100 [background-image:radial-gradient(#d6d8de_1px,transparent_1px)] [background-size:18px_18px]"
      style={{ touchAction: 'none' }}
      onPointerDown={(e) => { if (e.target === surfaceRef.current) useUI.getState().select(null); }}
    >
      <div
        className="absolute left-0 top-0 origin-top-left"
        style={{ transform: `translate(${panX}px, ${panY}px) scale(${z})` }}
      >
        <div className="flex shrink-0 flex-col overflow-hidden rounded-xl bg-white shadow-[0_2px_8px_rgba(0,0,0,.06),0_20px_48px_rgba(0,0,0,.12)] ring-1 ring-black/5" style={{ width }}>
          <div className="flex h-9 shrink-0 items-center gap-1.5 border-b border-neutral-100 bg-neutral-50 px-3">
            <span className="h-2.5 w-2.5 rounded-full bg-red-400/60" />
            <span className="h-2.5 w-2.5 rounded-full bg-amber-400/60" />
            <span className="h-2.5 w-2.5 rounded-full bg-emerald-400/60" />
            <div className="mx-auto flex items-center gap-1.5 rounded-md bg-white px-3 py-0.5 text-[10px] text-neutral-400 ring-1 ring-neutral-200">
              {page?.name || 'Page'} · {BREAKPOINTS[breakpoint]?.label} · {width}px
            </div>
          </div>
          {/* eslint-disable-next-line jsx-a11y/iframe-has-title */}
          <iframe ref={iframeRef} title="Canvas" className="block w-full border-0" style={{ minHeight: 400 }} />
        </div>
      </div>

      {/* Pan capture layer: intercepts drags for panning when the Hand tool or Space is active. */}
      {panActive && (
        <div className="absolute inset-0 z-30" style={{ cursor: grabbing ? 'grabbing' : 'grab' }} onPointerDown={startPan} />
      )}

      {mountNode && project && page && createPortal(<InstanceRender id={page.rootId} instances={project.instances} />, mountNode)}
      {!previewMode && <Overlay iframeRef={iframeRef} scale={z} />}
      {!previewMode && dropLine && iframeRef.current && (() => {
        const fr = iframeRef.current.getBoundingClientRect();
        return (
          <div style={{ position: 'fixed', left: fr.left + dropLine.left * z, top: fr.top + (dropLine.top - 1) * z, width: dropLine.width * z, height: 2 * z, background: '#4f46e5', borderRadius: 2, zIndex: 60, pointerEvents: 'none' }} />
        );
      })()}
      {!previewMode && iframeRef.current && guides.map((g, i) => {
        const fr = iframeRef.current.getBoundingClientRect();
        return g.axis === 'x' ? (
          <div key={i} style={{ position: 'fixed', left: fr.left + g.pos * z, top: fr.top, width: 1, height: fr.height, background: '#ec4899', zIndex: 61, pointerEvents: 'none' }} />
        ) : (
          <div key={i} style={{ position: 'fixed', left: fr.left, top: fr.top + g.pos * z, height: 1, width: fr.width, background: '#ec4899', zIndex: 61, pointerEvents: 'none' }} />
        );
      })}

      {/* Zoom / pan control */}
      {!previewMode && (
        <div className="absolute bottom-4 left-1/2 flex -translate-x-1/2 items-center gap-1 rounded-xl bg-white/95 px-2 py-1 shadow-lg ring-1 ring-black/10 backdrop-blur">
          <button onClick={() => setTool((t) => (t === 'hand' ? 'select' : 'hand'))} title="Hand tool (or hold Space)" className={`grid h-7 w-7 place-items-center rounded-md ${tool === 'hand' ? 'bg-indigo-600 text-white' : 'text-neutral-600 hover:bg-neutral-100'}`}>
            <Hand size={15} />
          </button>
          <div className="mx-0.5 h-4 w-px bg-neutral-200" />
          <button onClick={() => zoomBy(1 / 1.2)} title="Zoom out" className="grid h-7 w-7 place-items-center rounded-md text-neutral-600 hover:bg-neutral-100"><Minus size={15} /></button>
          <button onClick={() => zoomBy(1.2)} title="Zoom in" className="grid h-7 w-7 place-items-center rounded-md text-neutral-600 hover:bg-neutral-100"><Plus size={15} /></button>
          <button onClick={fit} className="w-12 rounded-md py-1 text-center text-xs tabular-nums text-neutral-600 hover:bg-neutral-100" title="Fit to screen">{Math.round(z * 100)}%</button>
          <button onClick={fit} title="Fit to screen" className="grid h-7 w-7 place-items-center rounded-md text-neutral-600 hover:bg-neutral-100"><Maximize size={14} /></button>
        </div>
      )}
    </div>
  );
}
