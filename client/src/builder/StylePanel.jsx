import { AlignLeft, AlignCenter, AlignRight, AlignJustify, ArrowRight, ArrowDown, Copy, Trash2 } from 'lucide-react';
import { useBuilder, useUI } from './store.js';
import { getActivePage } from './model.js';
import { ICON_SET } from './components.jsx';
import { effectiveStyle, isSetAt } from './styleUtils.js';
import { parentContext } from './layout.js';
import SizeSection from './panels/SizeSection.jsx';
import { Section, Field, LengthField, PxField, NumberField, SelectField, Segmented, ColorField, TextField, TextAreaField, ToggleField } from './controls.jsx';

function fileToDataUrl(file) {
  return new Promise((res, rej) => {
    const r = new FileReader();
    r.onload = () => res(r.result);
    r.onerror = rej;
    r.readAsDataURL(file);
  });
}

function ContentSection({ inst }) {
  const setProp = (prop, value) => useBuilder.getState().setProp(inst.id, prop, value);
  const c = inst.component;

  if (c === 'Image') {
    return (
      <Section title="Content">
        <Field label="Source"><TextField value={inst.props.src} onChange={(v) => setProp('src', v)} placeholder="https://… or upload" /></Field>
        <label className="flex cursor-pointer items-center justify-center gap-1.5 rounded-md border border-dashed border-neutral-300 px-2 py-1.5 text-xs text-neutral-600 hover:border-indigo-400 hover:text-indigo-600">
          Upload image
          <input
            type="file"
            accept="image/*"
            className="hidden"
            onChange={async (e) => {
              const f = e.target.files?.[0];
              if (f) { const src = await fileToDataUrl(f); useBuilder.getState().addAsset(f.name, src); setProp('src', src); }
              e.target.value = '';
            }}
          />
        </label>
        <Field label="Alt"><TextField value={inst.props.alt} onChange={(v) => setProp('alt', v)} /></Field>
      </Section>
    );
  }
  if (c === 'Link') {
    return (
      <Section title="Content">
        <Field label="Text"><TextField value={inst.props.text} onChange={(v) => setProp('text', v)} /></Field>
        <Field label="URL"><TextField value={inst.props.href} onChange={(v) => setProp('href', v)} placeholder="https://…" /></Field>
      </Section>
    );
  }
  if (c === 'Heading' || c === 'Text' || c === 'Button' || c === 'Quote') {
    return (
      <Section title="Content">
        <TextAreaField value={inst.props.text} onChange={(v) => setProp('text', v)} placeholder="Text…" />
      </Section>
    );
  }
  if (c === 'Input' || c === 'Textarea') {
    return (
      <Section title="Content">
        <Field label="Placeholder"><TextField value={inst.props.placeholder} onChange={(v) => setProp('placeholder', v)} /></Field>
      </Section>
    );
  }
  if (c === 'Icon') {
    return (
      <Section title="Content">
        <Field label="Icon"><SelectField value={inst.props.iconName} onChange={(v) => setProp('iconName', v)} options={Object.keys(ICON_SET)} /></Field>
      </Section>
    );
  }
  if (c === '3D') {
    return (
      <Section title="3D Object">
        <Field label="Shape"><SelectField value={inst.props.shape} onChange={(v) => setProp('shape', v)} options={['cube', 'sphere', 'torus', 'cone', 'torusKnot']} /></Field>
        <Field label="Color"><ColorField value={inst.props.color} onChange={(v) => setProp('color', v)} /></Field>
        <ToggleField label="Auto-rotate" checked={inst.props.autoRotate !== false} onChange={(v) => setProp('autoRotate', v)} />
        <ToggleField label="Wireframe" checked={!!inst.props.wireframe} onChange={(v) => setProp('wireframe', v)} />
        <div>
          <div className="flex justify-between text-[11px] text-neutral-400"><span>Metalness</span><span>{Number(inst.props.metalness ?? 0.4).toFixed(2)}</span></div>
          <input type="range" min="0" max="1" step="0.05" value={inst.props.metalness ?? 0.4} onChange={(e) => setProp('metalness', Number(e.target.value))} className="w-full" />
        </div>
        <div>
          <div className="flex justify-between text-[11px] text-neutral-400"><span>Roughness</span><span>{Number(inst.props.roughness ?? 0.35).toFixed(2)}</span></div>
          <input type="range" min="0" max="1" step="0.05" value={inst.props.roughness ?? 0.35} onChange={(e) => setProp('roughness', Number(e.target.value))} className="w-full" />
        </div>
      </Section>
    );
  }
  return null;
}

const FONT_FAMILIES = [
  { value: '', label: 'Default' },
  { value: 'system-ui, -apple-system, "Segoe UI", sans-serif', label: 'Sans' },
  { value: 'ui-serif, Georgia, "Times New Roman", serif', label: 'Serif' },
  { value: 'ui-monospace, Menlo, Consolas, monospace', label: 'Mono' },
];
const WEIGHTS = ['', '300', '400', '500', '600', '700', '800'];
const SHADOWS = [
  { value: '', label: 'None' },
  { value: '0 1px 2px rgba(0,0,0,0.10)', label: 'Small' },
  { value: '0 6px 18px rgba(0,0,0,0.15)', label: 'Medium' },
  { value: '0 16px 40px rgba(0,0,0,0.22)', label: 'Large' },
];

function FourSides({ label, prefix, v, set }) {
  const sides = ['top', 'right', 'bottom', 'left'];
  const initials = { top: 'T', right: 'R', bottom: 'B', left: 'L' };
  return (
    <div>
      <div className="mb-1 text-[11px] text-neutral-400">{label}</div>
      <div className="grid grid-cols-4 gap-1">
        {sides.map((s) => (
          <div key={s} className="flex flex-col items-center gap-0.5">
            <PxField value={v(`${prefix}-${s}`)} onChange={(val) => set(`${prefix}-${s}`, val)} />
            <span className="text-[9px] text-neutral-300">{initials[s]}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function ThemePanel({ project }) {
  const colors = project.tokens?.colors || [];
  const setColors = (c) => useBuilder.getState().setColorTokens(c);
  return (
    <div className="p-3">
      <div className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-neutral-400">Theme colors</div>
      <div className="grid grid-cols-6 gap-2">
        {colors.map((c, i) => (
          <div key={i} className="group relative">
            <input
              type="color"
              value={c}
              onChange={(e) => { const n = [...colors]; n[i] = e.target.value; setColors(n); }}
              className="h-8 w-full cursor-pointer rounded border border-neutral-200 bg-white p-0"
              title={c}
            />
            <button
              onClick={() => setColors(colors.filter((_, j) => j !== i))}
              className="absolute -right-1 -top-1 hidden h-4 w-4 place-items-center rounded-full bg-neutral-700 text-[10px] leading-none text-white group-hover:grid"
            >
              ×
            </button>
          </div>
        ))}
        <button
          onClick={() => setColors([...colors, '#000000'])}
          className="grid h-8 place-items-center rounded border border-dashed border-neutral-300 text-neutral-400 hover:border-indigo-400 hover:text-indigo-500"
        >
          +
        </button>
      </div>
      <p className="mt-5 text-center text-[11px] leading-relaxed text-neutral-400">
        Select an element on the canvas to edit it. These colors appear as swatches in every color picker.
      </p>
    </div>
  );
}

export default function StylePanel() {
  const project = useBuilder((s) => s.project);
  const selectedId = useUI((s) => s.selectedId);
  const breakpoint = useUI((s) => s.breakpoint);
  const activePageId = useUI((s) => s.activePageId);

  if (!project) return null;
  if (!selectedId || !project.instances[selectedId]) {
    return <ThemePanel project={project} />;
  }

  const inst = project.instances[selectedId];
  const perId = project.styles[selectedId] || {};
  const eff = effectiveStyle(perId, breakpoint);
  const v = (prop) => eff[prop] ?? '';
  const set = (prop, value) => useBuilder.getState().setStyle(selectedId, breakpoint, prop, value);
  const setMany = (decls) => useBuilder.getState().setStyles(selectedId, breakpoint, decls);
  const ctx = parentContext(project, selectedId, breakpoint);
  const overridden = (prop) => isSetAt(perId, breakpoint, prop);

  const display = v('display');
  const isFlex = display === 'flex' || display === 'inline-flex';
  const position = v('position');
  const opacityPct = v('opacity') === '' ? 100 : Math.round(Number(v('opacity')) * 100);

  const rootId = getActivePage(project, activePageId).rootId;
  const isRoot = selectedId === rootId;
  const isFree = position === 'absolute' || position === 'fixed';
  const nextZ = () => {
    let m = 0;
    for (const st of Object.values(project.styles)) {
      const z = parseInt(st.base?.['z-index'], 10);
      if (!Number.isNaN(z)) m = Math.max(m, z);
    }
    return m + 1;
  };
  const makeFree = () => {
    const doc = document.querySelector('iframe')?.contentDocument;
    const el = doc?.querySelector(`[data-ws-id="${selectedId}"]`);
    const rootEl = doc?.querySelector(`[data-ws-id="${rootId}"]`);
    const decls = { position: 'absolute', margin: '0px', 'z-index': String(nextZ()) };
    if (el && rootEl) {
      const er = el.getBoundingClientRect();
      const rr = rootEl.getBoundingClientRect();
      decls.left = `${Math.round(er.left - rr.left)}px`;
      decls.top = `${Math.round(er.top - rr.top)}px`;
      decls.width = `${Math.round(er.width)}px`;
      decls.height = `${Math.round(er.height)}px`;
    }
    if ((project.styles[rootId]?.base || {}).position !== 'relative') useBuilder.getState().setStyle(rootId, 'base', 'position', 'relative');
    useBuilder.getState().setStyles(selectedId, breakpoint, decls);
  };
  const makeFlow = () => useBuilder.getState().setStyles(selectedId, breakpoint, { position: '', left: '', top: '', 'z-index': '', margin: '' });

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b border-neutral-100 px-3 py-2">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-neutral-800">{inst.label}</span>
          {breakpoint !== 'base' && <span className="rounded bg-amber-100 px-1.5 text-[10px] text-amber-700">{breakpoint}</span>}
        </div>
        <div className="flex gap-1">
          <button
            onClick={() => { const id = useBuilder.getState().duplicate(selectedId); if (id) useUI.getState().select(id); }}
            className="grid h-6 w-6 place-items-center rounded text-neutral-500 hover:bg-neutral-100" title="Duplicate"
          >
            <Copy size={13} />
          </button>
          <button
            onClick={() => { useBuilder.getState().remove(selectedId); useUI.getState().select(null); }}
            className="grid h-6 w-6 place-items-center rounded text-red-500 hover:bg-red-50" title="Delete"
          >
            <Trash2 size={13} />
          </button>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto scroll-thin">
        {!isRoot && (
          <div className="flex items-center justify-between border-b border-neutral-100 px-3 py-2.5">
            <div>
              <div className="text-xs font-medium text-neutral-700">Free position</div>
              <div className="text-[10px] text-neutral-400">{isFree ? 'Drag & resize on canvas' : 'Flows in the layout'}</div>
            </div>
            <button
              onClick={() => (isFree ? makeFlow() : makeFree())}
              title="Toggle free positioning"
              className={`relative h-5 w-9 shrink-0 rounded-full transition-colors ${isFree ? 'bg-indigo-600' : 'bg-neutral-300'}`}
            >
              <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-all ${isFree ? 'left-[18px]' : 'left-0.5'}`} />
            </button>
          </div>
        )}
        <ContentSection inst={inst} />
        <Section title="Layout">
          <Field label="Display">
            <SelectField value={display} onChange={(val) => set('display', val)} options={['', 'block', 'flex', 'inline-flex', 'inline-block', 'grid', 'none']} />
          </Field>
          {isFlex && (
            <>
              <Field label="Direction">
                <Segmented value={v('flex-direction')} onChange={(val) => set('flex-direction', val)} options={[
                  { value: 'row', icon: ArrowRight, title: 'Row' },
                  { value: 'column', icon: ArrowDown, title: 'Column' },
                ]} />
              </Field>
              <Field label="Align">
                <SelectField value={v('align-items')} onChange={(val) => set('align-items', val)} options={['', 'stretch', 'flex-start', 'center', 'flex-end', 'baseline']} />
              </Field>
              <Field label="Justify">
                <SelectField value={v('justify-content')} onChange={(val) => set('justify-content', val)} options={['', 'flex-start', 'center', 'flex-end', 'space-between', 'space-around', 'space-evenly']} />
              </Field>
              <Field label="Wrap">
                <SelectField value={v('flex-wrap')} onChange={(val) => set('flex-wrap', val)} options={['', 'nowrap', 'wrap']} />
              </Field>
            </>
          )}
          {(isFlex || display === 'grid') && (
            <Field label="Gap"><LengthField value={v('gap')} onChange={(val) => set('gap', val)} /></Field>
          )}
        </Section>

        <Section title="Spacing">
          <FourSides label="Padding" prefix="padding" v={v} set={set} />
          <FourSides label="Margin" prefix="margin" v={v} set={set} />
        </Section>

        <SizeSection eff={eff} ctx={ctx} set={set} setMany={setMany} />

        <Section title="Typography">
          <Field label="Color"><ColorField value={v('color')} onChange={(val) => set('color', val)} /></Field>
          <Field label="Size"><LengthField value={v('font-size')} onChange={(val) => set('font-size', val)} /></Field>
          <Field label="Weight"><SelectField value={v('font-weight')} onChange={(val) => set('font-weight', val)} options={WEIGHTS.map((w) => ({ value: w, label: w || 'Default' }))} /></Field>
          <Field label="Line H"><TextField value={v('line-height')} onChange={(val) => set('line-height', val)} placeholder="1.5" /></Field>
          <Field label="Align">
            <Segmented value={v('text-align')} onChange={(val) => set('text-align', val)} options={[
              { value: 'left', icon: AlignLeft }, { value: 'center', icon: AlignCenter }, { value: 'right', icon: AlignRight }, { value: 'justify', icon: AlignJustify },
            ]} />
          </Field>
          <Field label="Font"><SelectField value={v('font-family')} onChange={(val) => set('font-family', val)} options={FONT_FAMILIES} /></Field>
        </Section>

        <Section title="Background">
          <Field label="Color"><ColorField value={v('background-color')} onChange={(val) => set('background-color', val)} /></Field>
        </Section>

        <Section title="Border">
          <Field label="Radius"><LengthField value={v('border-radius')} onChange={(val) => set('border-radius', val)} /></Field>
          <Field label="Width"><LengthField value={v('border-width')} onChange={(val) => set('border-width', val)} /></Field>
          <Field label="Style"><SelectField value={v('border-style')} onChange={(val) => set('border-style', val)} options={['', 'none', 'solid', 'dashed', 'dotted']} /></Field>
          <Field label="Color"><ColorField value={v('border-color')} onChange={(val) => set('border-color', val)} /></Field>
        </Section>

        <Section title="Effects" defaultOpen={false}>
          <Field label="Opacity">
            <input type="range" min="0" max="100" step="5" value={opacityPct}
              onChange={(e) => set('opacity', Number(e.target.value) === 100 ? '' : String(Number(e.target.value) / 100))}
              className="w-full" />
          </Field>
          <Field label="Shadow"><SelectField value={v('box-shadow')} onChange={(val) => set('box-shadow', val)} options={SHADOWS} /></Field>
        </Section>

        <Section title="Position" defaultOpen={false}>
          <Field label="Type"><SelectField value={position} onChange={(val) => set('position', val)} options={['', 'static', 'relative', 'absolute', 'fixed', 'sticky']} /></Field>
          {position && position !== 'static' && (
            <>
              <Field label="Top"><LengthField value={v('top')} onChange={(val) => set('top', val)} /></Field>
              <Field label="Left"><LengthField value={v('left')} onChange={(val) => set('left', val)} /></Field>
              <Field label="Right"><LengthField value={v('right')} onChange={(val) => set('right', val)} /></Field>
              <Field label="Bottom"><LengthField value={v('bottom')} onChange={(val) => set('bottom', val)} /></Field>
            </>
          )}
          <Field label="Z-index"><NumberField value={v('z-index')} onChange={(val) => set('z-index', val === '' ? '' : String(val))} /></Field>
        </Section>
      </div>
    </div>
  );
}
