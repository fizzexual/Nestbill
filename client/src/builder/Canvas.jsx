import { useEffect, useRef, useState, useCallback } from 'react';
import { Hand, Minus, Plus, Maximize } from 'lucide-react';
import { useBuilder, useUI } from './store.js';
import { BREAKPOINTS } from './cssGen.js';
import DeviceFrame from './DeviceFrame.jsx';

const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, n));
const BP_ORDER = ['base', 'tablet', 'mobile'];
const FRAME_GAP = 72;

export default function Canvas() {
  const project = useBuilder((s) => s.project);
  const breakpoint = useUI((s) => s.breakpoint);
  const previewMode = useUI((s) => s.previewMode);

  const surfaceRef = useRef(null);
  const [overlayLayer, setOverlayLayer] = useState(null);
  const [view, setView] = useState({ z: 1, panX: 0, panY: 0 });
  const [tool, setTool] = useState('select');
  const [spaceDown, setSpaceDown] = useState(false);
  const [grabbing, setGrabbing] = useState(false);
  const panActive = !previewMode && (tool === 'hand' || spaceDown);

  const frames = previewMode ? [breakpoint] : BP_ORDER;
  const contentWidth = frames.reduce((w, bp) => w + (BREAKPOINTS[bp]?.width || 0), 0) + FRAME_GAP * (frames.length - 1);

  const fit = useCallback(() => {
    const s = surfaceRef.current?.getBoundingClientRect();
    if (!s) return;
    const margin = 56;
    const z = clamp((s.width - margin * 2) / contentWidth, 0.1, 1);
    setView({ z, panX: (s.width - contentWidth * z) / 2, panY: margin });
  }, [contentWidth]);

  // Fit on mount and whenever the set of frames changes (preview toggle).
  useEffect(() => { fit(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [previewMode]);

  // Zoom (ctrl/⌘+wheel toward cursor) and pan (wheel/trackpad).
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
    const down = (e) => { if (e.code === 'Space' && !editingField(e.target)) setSpaceDown(true); };
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

  const { z, panX, panY } = view;

  return (
    <div
      ref={surfaceRef}
      className="relative flex-1 overflow-hidden bg-neutral-100 [background-image:radial-gradient(#d6d8de_1px,transparent_1px)] [background-size:18px_18px]"
      style={{ touchAction: 'none' }}
      onPointerDown={(e) => { if (e.target === surfaceRef.current) useUI.getState().select(null); }}
    >
      <div className="absolute left-0 top-0 origin-top-left" style={{ transform: `translate(${panX}px, ${panY}px) scale(${z})` }}>
        <div className="flex items-start" style={{ gap: FRAME_GAP }}>
          {project && frames.map((bp) => (
            <DeviceFrame key={bp} breakpoint={bp} scale={z} isActive={!previewMode && bp === breakpoint} overlayLayer={overlayLayer} />
          ))}
        </div>
      </div>

      {/* Decoration layer (selection/handles/guides) — outside the transform so position:fixed stays in screen px. */}
      <div ref={setOverlayLayer} className="pointer-events-none absolute inset-0" />

      {/* Pan capture layer. */}
      {panActive && (
        <div className="absolute inset-0 z-30" style={{ cursor: grabbing ? 'grabbing' : 'grab' }} onPointerDown={startPan} />
      )}

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
