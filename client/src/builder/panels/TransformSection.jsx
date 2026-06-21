import { Section, Field, NumberField, SelectField } from '../controls.jsx';
import { parseTranslate, serializeTranslate, parseSkew, serializeSkew } from '../transforms.js';

const ORIGINS = ['', 'center', 'top', 'bottom', 'left', 'right', 'top left', 'top right', 'bottom left', 'bottom right'];

/**
 * Transforms via the independent CSS properties (translate/rotate/scale) plus
 * skew (which we keep in `transform`), and transform-origin.
 */
export default function TransformSection({ eff, set }) {
  const t = parseTranslate(eff.translate);
  const sk = parseSkew(eff.transform);
  const rotate = eff.rotate ? parseFloat(eff.rotate) : '';
  const scale = eff.scale != null && eff.scale !== '' ? parseFloat(eff.scale) : '';

  return (
    <Section title="Transform" defaultOpen={false}>
      <div className="text-[10px] text-neutral-400">Move (px)</div>
      <div className="grid grid-cols-2 gap-2">
        <Field label="X"><NumberField value={t.x} onChange={(n) => set('translate', serializeTranslate(n, t.y))} /></Field>
        <Field label="Y"><NumberField value={t.y} onChange={(n) => set('translate', serializeTranslate(t.x, n))} /></Field>
      </div>
      <Field label="Rotate"><NumberField value={rotate} onChange={(n) => set('rotate', n === '' ? '' : `${n}deg`)} /></Field>
      <Field label="Scale"><NumberField step={0.1} value={scale} onChange={(n) => set('scale', n === '' ? '' : String(n))} /></Field>
      <div className="text-[10px] text-neutral-400">Skew (deg)</div>
      <div className="grid grid-cols-2 gap-2">
        <Field label="X"><NumberField value={sk.x} onChange={(n) => set('transform', serializeSkew(n, sk.y))} /></Field>
        <Field label="Y"><NumberField value={sk.y} onChange={(n) => set('transform', serializeSkew(sk.x, n))} /></Field>
      </div>
      <Field label="Origin">
        <SelectField value={eff['transform-origin'] ?? ''} onChange={(val) => set('transform-origin', val)} options={ORIGINS.map((o) => ({ value: o, label: o || 'default' }))} />
      </Field>
    </Section>
  );
}
