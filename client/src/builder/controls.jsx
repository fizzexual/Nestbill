import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { HexColorPicker } from 'react-colorful';
import { parseLength } from './styleUtils.js';
import { useBuilder } from './store.js';

const inputCls =
  'w-full rounded-md border border-neutral-200 bg-white px-2 py-1 text-xs text-neutral-800 outline-none focus:border-indigo-400';

export function Section({ title, children, defaultOpen = true }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border-b border-neutral-100">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between px-3 py-2 text-[11px] font-semibold uppercase tracking-wide text-neutral-500 hover:text-neutral-800"
      >
        {title}
        <ChevronDown size={13} className={`transition-transform ${open ? '' : '-rotate-90'}`} />
      </button>
      {open && <div className="flex flex-col gap-2 px-3 pb-3">{children}</div>}
    </div>
  );
}

export function Field({ label, children }) {
  return (
    <label className="flex items-center gap-2">
      {label != null && <span className="w-16 shrink-0 text-[11px] text-neutral-400">{label}</span>}
      <div className="min-w-0 flex-1">{children}</div>
    </label>
  );
}

export function TextField({ value, onChange, placeholder }) {
  return (
    <input
      type="text"
      value={value ?? ''}
      placeholder={placeholder}
      onChange={(e) => onChange(e.target.value)}
      className={inputCls}
    />
  );
}

export function TextAreaField({ value, onChange, placeholder }) {
  return (
    <textarea
      value={value ?? ''}
      placeholder={placeholder}
      rows={3}
      onChange={(e) => onChange(e.target.value)}
      className={`${inputCls} resize-none`}
    />
  );
}

export function NumberField({ value, onChange, step = 1, min, max }) {
  return (
    <input
      type="number"
      value={value ?? ''}
      step={step}
      min={min}
      max={max}
      onChange={(e) => onChange(e.target.value === '' ? '' : Number(e.target.value))}
      className={inputCls}
    />
  );
}

export function SelectField({ value, onChange, options }) {
  return (
    <select value={value ?? ''} onChange={(e) => onChange(e.target.value)} className={inputCls}>
      {options.map((o) => {
        const val = typeof o === 'string' ? o : o.value;
        const label = typeof o === 'string' ? o : o.label;
        return (
          <option key={val} value={val}>
            {label}
          </option>
        );
      })}
    </select>
  );
}

const LEN_UNITS = ['px', '%', 'rem', 'em', 'vh', 'vw', 'auto'];

/** Number + unit input for CSS lengths. Stores a full CSS value string. */
export function LengthField({ value, onChange, units = LEN_UNITS }) {
  const { num, unit } = parseLength(value);
  const commit = (n, u) => {
    if (u === 'auto') return onChange('auto');
    if (n === '' || n == null) return onChange('');
    return onChange(`${n}${u || 'px'}`);
  };
  return (
    <div className="flex gap-1">
      <input
        type="number"
        value={num}
        disabled={unit === 'auto'}
        onChange={(e) => commit(e.target.value, unit === 'auto' ? 'px' : unit)}
        className={`${inputCls} disabled:bg-neutral-50 disabled:text-neutral-300`}
      />
      <select
        value={unit || 'px'}
        onChange={(e) => commit(num, e.target.value)}
        className="w-16 shrink-0 rounded-md border border-neutral-200 bg-white px-1 py-1 text-xs text-neutral-600 outline-none focus:border-indigo-400"
      >
        {units.map((u) => (
          <option key={u} value={u}>
            {u}
          </option>
        ))}
      </select>
    </div>
  );
}

/** px-only number, stores "Npx" (used for the box model). */
export function PxField({ value, onChange }) {
  const { num } = parseLength(value);
  return (
    <input
      type="number"
      value={num}
      placeholder="0"
      onChange={(e) => onChange(e.target.value === '' ? '' : `${e.target.value}px`)}
      className="w-full rounded-md border border-neutral-200 bg-white px-1.5 py-1 text-center text-xs text-neutral-800 outline-none focus:border-indigo-400"
    />
  );
}

/** Segmented button group. options: [{value, label|icon}]. */
export function Segmented({ value, onChange, options }) {
  return (
    <div className="flex rounded-md bg-neutral-100 p-0.5">
      {options.map((o) => {
        const active = value === o.value;
        return (
          <button
            key={o.value}
            title={o.title || o.value}
            onClick={() => onChange(active ? '' : o.value)}
            className={`flex flex-1 items-center justify-center rounded px-1.5 py-1 text-[11px] ${
              active ? 'bg-white text-indigo-600 shadow-sm' : 'text-neutral-500 hover:text-neutral-800'
            }`}
          >
            {o.icon ? <o.icon size={13} /> : o.label}
          </button>
        );
      })}
    </div>
  );
}

/** Value + mode dropdown (the "240 ▸ Fixed" control). Value disabled for Fill/Fit. */
export function ModeField({ mode, value, onMode, onValue, modes = ['Fill', 'Fit', 'Fixed', 'Relative'] }) {
  const showValue = mode === 'Fixed' || mode === 'Relative';
  return (
    <div className="flex gap-1">
      <input
        type="number"
        disabled={!showValue}
        value={showValue ? (value ?? '') : ''}
        placeholder={mode === 'Fill' ? 'Fill' : mode === 'Fit' ? 'Auto' : '0'}
        onChange={(e) => onValue(e.target.value === '' ? '' : Number(e.target.value))}
        className={`${inputCls} disabled:bg-neutral-50 disabled:text-neutral-300`}
      />
      <select
        value={mode}
        onChange={(e) => onMode(e.target.value)}
        className="w-[5.5rem] shrink-0 rounded-md border border-neutral-200 bg-white px-1 py-1 text-xs text-neutral-600 outline-none focus:border-indigo-400"
      >
        {modes.map((m) => (
          <option key={m} value={m}>{m}</option>
        ))}
      </select>
    </div>
  );
}

/** Range slider with a numeric readout. */
export function Slider({ value, onChange, min = 0, max = 100, step = 1, suffix = '' }) {
  return (
    <div className="flex items-center gap-2">
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="h-1 flex-1 accent-indigo-600"
      />
      <span className="w-9 shrink-0 text-right text-[11px] tabular-nums text-neutral-500">{value}{suffix}</span>
    </div>
  );
}

export function ToggleField({ label, checked, onChange }) {
  return (
    <label className="flex cursor-pointer items-center justify-between gap-2">
      <span className="text-[11px] text-neutral-500">{label}</span>
      <button
        type="button"
        onClick={() => onChange(!checked)}
        className={`relative h-5 w-9 shrink-0 rounded-full transition-colors ${checked ? 'bg-indigo-600' : 'bg-neutral-300'}`}
      >
        <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-all ${checked ? 'left-[18px]' : 'left-0.5'}`} />
      </button>
    </label>
  );
}

export function ColorField({ value, onChange }) {
  const [open, setOpen] = useState(false);
  const swatches = useBuilder((s) => s.project?.tokens?.colors) || [];
  const color = value || '';
  return (
    <div className="relative flex items-center gap-1.5">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="h-6 w-6 shrink-0 rounded border border-neutral-300"
        style={{
          background: color || 'repeating-conic-gradient(#ddd 0% 25%, #fff 0% 50%) 50% / 8px 8px',
        }}
        title="Pick color"
      />
      <input
        value={color}
        placeholder="—"
        onChange={(e) => onChange(e.target.value)}
        className={inputCls}
      />
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-8 z-50 rounded-lg bg-white p-2 shadow-xl ring-1 ring-black/10">
            <HexColorPicker color={color || '#000000'} onChange={onChange} />
            {swatches.length > 0 && (
              <div className="mt-2 flex w-[200px] flex-wrap gap-1">
                {swatches.map((c) => (
                  <button key={c} type="button" onClick={() => onChange(c)} title={c} style={{ background: c }} className="h-5 w-5 rounded border border-neutral-300" />
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
