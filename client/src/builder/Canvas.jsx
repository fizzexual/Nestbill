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

  // select / hover
  useEffect(() => {
    const doc = iframeRef.current?.contentDocument;
    if (!doc || previewMode) return undefined;
    const idOf = (e) => e.target.closest?.('[data-ws-id]')?.getAttribute('data-ws-id') || null;
    const onClick = (e) => { e.preventDefault(); e.stopPropagation(); useUI.getState().select(idOf(e)); };
    const onMove = (e) => useUI.getState().hover(idOf(e));
    const onLeave = () => useUI.getState().hover(null);
    doc.addEventListener('click', onClick, true);
    doc.addEventListener('mousemove', onMove);
    doc.addEventListener('mouseleave', onLeave);
    return () => { doc.removeEventListener('click', onClick, true); doc.removeEventListener('mousemove', onMove); doc.removeEventListener('mouseleave', onLeave); };
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
    <div className="relative flex-1 overflow-auto bg-neutral-200/70">
      <div className="flex min-h-full justify-center p-6">
        <div
          className="shrink-0 bg-white shadow-[0_1px_3px_rgba(0,0,0,.1),0_12px_40px_rgba(0,0,0,.08)]"
          style={{ width }}
          onClick={() => useUI.getState().select(null)}
        >
          {/* eslint-disable-next-line jsx-a11y/iframe-has-title */}
          <iframe ref={iframeRef} title="Canvas" className="block h-full w-full border-0" style={{ minHeight: 'calc(100vh - 96px)' }} onClick={(e) => e.stopPropagation()} />
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
