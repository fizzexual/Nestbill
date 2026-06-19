import { useEffect, useRef, useState } from 'react';
import { useUI, useBuilder } from './store.js';

const HANDLES = [
  { k: 'nw', hx: -1, hy: -1, cur: 'nwse-resize' },
  { k: 'n', hx: 0, hy: -1, cur: 'ns-resize' },
  { k: 'ne', hx: 1, hy: -1, cur: 'nesw-resize' },
  { k: 'w', hx: -1, hy: 0, cur: 'ew-resize' },
  { k: 'e', hx: 1, hy: 0, cur: 'ew-resize' },
  { k: 'sw', hx: -1, hy: 1, cur: 'nesw-resize' },
  { k: 's', hx: 0, hy: 1, cur: 'ns-resize' },
  { k: 'se', hx: 1, hy: 1, cur: 'nwse-resize' },
];

export default function Overlay({ iframeRef }) {
  const selectedId = useUI((s) => s.selectedId);
  const hoveredId = useUI((s) => s.hoveredId);
  const instances = useBuilder((s) => s.project?.instances);
  const rootId = useBuilder((s) => s.project?.pages?.[0]?.rootId);
  const [, force] = useState(0);
  const resizing = useRef(null);

  // Follow elements as they move/resize/scroll.
  useEffect(() => {
    const iframe = iframeRef.current;
    const doc = iframe?.contentDocument;
    const rerender = () => force((n) => (n + 1) % 1e6);
    const ro = new ResizeObserver(rerender);
    if (iframe) ro.observe(iframe);
    if (doc?.documentElement) ro.observe(doc.documentElement);
    doc?.addEventListener('scroll', rerender, true);
    window.addEventListener('resize', rerender);
    const interval = setInterval(rerender, 40);
    return () => {
      ro.disconnect();
      doc?.removeEventListener('scroll', rerender, true);
      window.removeEventListener('resize', rerender);
      clearInterval(interval);
    };
  }, [iframeRef]);

  const nodeBox = (id) => {
    const iframe = iframeRef.current;
    const node = iframe?.contentDocument?.querySelector(`[data-ws-id="${id}"]`);
    if (!node) return null;
    const r = node.getBoundingClientRect();
    const f = iframe.getBoundingClientRect();
    return { left: f.left + r.left, top: f.top + r.top, width: r.width, height: r.height };
  };

  const onResizeMove = (e) => {
    const r = resizing.current;
    if (!r) return;
    const dx = e.clientX - r.sx;
    const dy = e.clientY - r.sy;
    let { left, top, w, h } = r;
    if (r.hx === 1) w = Math.max(8, r.w + dx);
    if (r.hx === -1) { w = Math.max(8, r.w - dx); left = r.left + (r.w - w); }
    if (r.hy === 1) h = Math.max(8, r.h + dy);
    if (r.hy === -1) { h = Math.max(8, r.h - dy); top = r.top + (r.h - h); }
    const s = r.el.style;
    s.position = 'absolute';
    s.left = `${left}px`;
    s.top = `${top}px`;
    s.width = `${w}px`;
    s.height = `${h}px`;
    s.margin = '0px';
    force((n) => (n + 1) % 1e6);
  };

  const onResizeUp = () => {
    const r = resizing.current;
    resizing.current = null;
    window.removeEventListener('pointermove', onResizeMove);
    if (!r) return;
    const bp = useUI.getState().breakpoint;
    if ((useBuilder.getState().project.styles[r.rootId]?.base || {}).position !== 'relative') {
      useBuilder.getState().setStyle(r.rootId, 'base', 'position', 'relative');
    }
    useBuilder.getState().setStyles(r.id, bp, {
      position: 'absolute', left: r.el.style.left, top: r.el.style.top, width: r.el.style.width, height: r.el.style.height, margin: '0px',
    });
    requestAnimationFrame(() => {
      ['position', 'left', 'top', 'width', 'height', 'margin'].forEach((p) => { r.el.style[p] = ''; });
    });
  };

  const startResize = (e, dir) => {
    e.preventDefault();
    e.stopPropagation();
    const doc = iframeRef.current?.contentDocument;
    const el = doc?.querySelector(`[data-ws-id="${selectedId}"]`);
    if (!el) return;
    const rEl = doc.querySelector(`[data-ws-id="${rootId}"]`);
    const er = el.getBoundingClientRect();
    const rr = rEl.getBoundingClientRect();
    resizing.current = {
      el, id: selectedId, rootId, hx: dir.hx, hy: dir.hy,
      sx: e.clientX, sy: e.clientY,
      left: Math.round(er.left - rr.left), top: Math.round(er.top - rr.top), w: Math.round(er.width), h: Math.round(er.height),
    };
    window.addEventListener('pointermove', onResizeMove);
    window.addEventListener('pointerup', onResizeUp, { once: true });
  };

  const hoverBox = hoveredId && hoveredId !== selectedId ? nodeBox(hoveredId) : null;
  const selBox = selectedId ? nodeBox(selectedId) : null;

  return (
    <>
      {hoverBox && (
        <div style={{ position: 'fixed', left: hoverBox.left, top: hoverBox.top, width: hoverBox.width, height: hoverBox.height, border: '1px solid #60a5fa', boxSizing: 'border-box', pointerEvents: 'none', zIndex: 50 }} />
      )}
      {selBox && (
        <>
          <div style={{ position: 'fixed', left: selBox.left, top: selBox.top, width: selBox.width, height: selBox.height, border: '1px solid #4f46e5', boxSizing: 'border-box', pointerEvents: 'none', zIndex: 50 }}>
            <span style={{ position: 'absolute', top: -17, left: -1, background: '#4f46e5', color: '#fff', fontSize: 10, lineHeight: '16px', padding: '0 5px', borderRadius: 3, whiteSpace: 'nowrap', fontFamily: 'ui-sans-serif, system-ui, sans-serif' }}>
              {instances?.[selectedId]?.label}
            </span>
          </div>
          {selectedId !== rootId &&
            HANDLES.map((hd) => (
              <div
                key={hd.k}
                onPointerDown={(e) => startResize(e, hd)}
                style={{
                  position: 'fixed',
                  left: selBox.left + ((hd.hx + 1) / 2) * selBox.width - 4,
                  top: selBox.top + ((hd.hy + 1) / 2) * selBox.height - 4,
                  width: 8,
                  height: 8,
                  background: '#fff',
                  border: '1.5px solid #4f46e5',
                  borderRadius: 2,
                  cursor: hd.cur,
                  zIndex: 51,
                }}
              />
            ))}
        </>
      )}
    </>
  );
}
