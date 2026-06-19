import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useBuilder, useUI } from './store.js';
import { BREAKPOINTS, generateCss } from './cssGen.js';
import { COMPONENTS } from './components.jsx';
import { findParentId } from './model.js';
import { InstanceRender } from './InstanceRender.jsx';
import Overlay from './Overlay.jsx';

const RESET = `*,*::before,*::after{box-sizing:border-box}html,body{margin:0;padding:0}body{min-height:100%}img{max-width:100%}`;
const EDIT_HELPERS = `[data-ws-id]:empty{min-height:48px;min-width:48px;outline:1px dashed #cbd5e1;outline-offset:-1px}`;

const DRAG_TYPE = 'text/prism-component';

/** Decide where a dragged component should land. Coords are iframe-viewport relative. */
function computeDrop(e, doc, instances, rootId) {
  let el = doc.elementFromPoint(e.clientX, e.clientY);
  el = el && el.closest('[data-ws-id]');
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

export default function Canvas() {
  const project = useBuilder((s) => s.project);
  const styles = project?.styles;
  const breakpoint = useUI((s) => s.breakpoint);
  const previewMode = useUI((s) => s.previewMode);

  const iframeRef = useRef(null);
  const wsStyleRef = useRef(null);
  const [mountNode, setMountNode] = useState(null);
  const [dropLine, setDropLine] = useState(null);

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

  // select + drag-to-move (free positioning)
  useEffect(() => {
    const doc = iframeRef.current?.contentDocument;
    if (!doc || previewMode) return undefined;
    const idOf = (el) => el?.closest?.('[data-ws-id]')?.getAttribute('data-ws-id') || null;
    const rootId = () => useBuilder.getState().project.pages[0].rootId;
    const nextZ = () => {
      let max = 0;
      for (const s of Object.values(useBuilder.getState().project.styles)) {
        const z = parseInt(s.base?.['z-index'], 10);
        if (!Number.isNaN(z)) max = Math.max(max, z);
      }
      return max + 1;
    };
    let drag = null;

    const onDown = (e) => {
      const el = e.target.closest?.('[data-ws-id]');
      const id = idOf(el);
      if (!id) { useUI.getState().select(null); return; }
      useUI.getState().select(id);
      if (id === rootId()) return;
      const er = el.getBoundingClientRect();
      const rr = doc.querySelector(`[data-ws-id="${rootId()}"]`).getBoundingClientRect();
      drag = { id, el, sx: e.clientX, sy: e.clientY, left: Math.round(er.left - rr.left), top: Math.round(er.top - rr.top), w: Math.round(er.width), h: Math.round(er.height), moved: false, z: 1 };
      try { el.setPointerCapture(e.pointerId); } catch { /* ignore */ }
      e.preventDefault();
    };
    const onMove = (e) => {
      if (!drag) { useUI.getState().hover(idOf(e.target.closest?.('[data-ws-id]'))); return; }
      const dx = e.clientX - drag.sx;
      const dy = e.clientY - drag.sy;
      if (!drag.moved && Math.hypot(dx, dy) < 4) return;
      if (!drag.moved) { drag.moved = true; drag.z = nextZ(); }
      const s = drag.el.style;
      s.position = 'absolute';
      s.left = `${drag.left + dx}px`;
      s.top = `${drag.top + dy}px`;
      s.width = `${drag.w}px`;
      s.height = `${drag.h}px`;
      s.margin = '0px';
      s.zIndex = String(drag.z);
    };
    const onUp = () => {
      if (drag && drag.moved) {
        const { id, el } = drag;
        const bp = useUI.getState().breakpoint;
        const rid = rootId();
        if ((useBuilder.getState().project.styles[rid]?.base || {}).position !== 'relative') {
          useBuilder.getState().setStyle(rid, 'base', 'position', 'relative');
        }
        useBuilder.getState().setStyles(id, bp, {
          position: 'absolute', left: el.style.left, top: el.style.top, width: el.style.width, height: el.style.height, margin: '0px', 'z-index': el.style.zIndex,
        });
        requestAnimationFrame(() => {
          ['position', 'left', 'top', 'width', 'height', 'margin', 'zIndex'].forEach((p) => { el.style[p] = ''; });
        });
      }
      drag = null;
    };
    const onClick = (e) => e.preventDefault(); // block link/button navigation in edit mode
    const onLeave = () => useUI.getState().hover(null);

    doc.addEventListener('pointerdown', onDown);
    doc.addEventListener('pointermove', onMove);
    doc.addEventListener('pointerup', onUp);
    doc.addEventListener('click', onClick, true);
    doc.addEventListener('mouseleave', onLeave);
    return () => {
      doc.removeEventListener('pointerdown', onDown);
      doc.removeEventListener('pointermove', onMove);
      doc.removeEventListener('pointerup', onUp);
      doc.removeEventListener('click', onClick, true);
      doc.removeEventListener('mouseleave', onLeave);
    };
  }, [mountNode, previewMode]);

  // drag-to-insert
  useEffect(() => {
    const doc = iframeRef.current?.contentDocument;
    if (!doc || previewMode) return undefined;
    const rootId = () => useBuilder.getState().project.pages[0].rootId;
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

  const page = project?.pages?.[0];
  const width = BREAKPOINTS[breakpoint]?.width || 1280;
  const iframe = iframeRef.current;
  const fr = iframe?.getBoundingClientRect();

  return (
    <div className="relative flex-1 overflow-auto bg-neutral-100 [background-image:radial-gradient(#d6d8de_1px,transparent_1px)] [background-size:18px_18px]">
      <div className="flex min-h-full justify-center p-8">
        <div
          className="flex shrink-0 flex-col overflow-hidden rounded-xl bg-white shadow-[0_2px_8px_rgba(0,0,0,.06),0_20px_48px_rgba(0,0,0,.12)] ring-1 ring-black/5"
          style={{ width }}
          onClick={() => useUI.getState().select(null)}
        >
          <div className="flex h-9 shrink-0 items-center gap-1.5 border-b border-neutral-100 bg-neutral-50 px-3">
            <span className="h-2.5 w-2.5 rounded-full bg-red-400/60" />
            <span className="h-2.5 w-2.5 rounded-full bg-amber-400/60" />
            <span className="h-2.5 w-2.5 rounded-full bg-emerald-400/60" />
            <div className="mx-auto flex items-center gap-1.5 rounded-md bg-white px-3 py-0.5 text-[10px] text-neutral-400 ring-1 ring-neutral-200">
              {page?.name || 'Page'} · {width}px
            </div>
          </div>
          {/* eslint-disable-next-line jsx-a11y/iframe-has-title */}
          <iframe ref={iframeRef} title="Canvas" className="block w-full flex-1 border-0" style={{ minHeight: 'calc(100vh - 150px)' }} onClick={(e) => e.stopPropagation()} />
        </div>
      </div>
      {mountNode && project && page && createPortal(<InstanceRender id={page.rootId} instances={project.instances} />, mountNode)}
      {!previewMode && <Overlay iframeRef={iframeRef} />}
      {!previewMode && dropLine && fr && (
        <div
          style={{ position: 'fixed', left: fr.left + dropLine.left, top: fr.top + dropLine.top - 1, width: dropLine.width, height: 2, background: '#4f46e5', borderRadius: 2, zIndex: 60, pointerEvents: 'none' }}
        />
      )}
    </div>
  );
}
