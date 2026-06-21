import { Section, Field, Slider, ToggleField, SelectField } from '../controls.jsx';
import { setVisible } from '../actions.js';

const BLEND = ['', 'normal', 'multiply', 'screen', 'overlay', 'darken', 'lighten', 'color-dodge', 'color-burn', 'hard-light', 'soft-light', 'difference', 'exclusion', 'hue', 'saturation', 'color', 'luminosity'];
const OVERFLOW = ['', 'visible', 'hidden', 'scroll', 'auto', 'clip'];
const SHADOWS = [
  { value: '', label: 'None' },
  { value: '0 1px 2px rgba(0,0,0,0.10)', label: 'Small' },
  { value: '0 6px 18px rgba(0,0,0,0.15)', label: 'Medium' },
  { value: '0 16px 40px rgba(0,0,0,0.22)', label: 'Large' },
];

/** Opacity, visibility, blend mode, overflow, shadow. */
export default function AppearanceSection({ id, eff, set }) {
  const opacityPct = eff.opacity === '' || eff.opacity == null ? 100 : Math.round(Number(eff.opacity) * 100);
  const visible = (eff.display || '') !== 'none';

  return (
    <Section title="Appearance">
      <Field label="Opacity">
        <Slider value={opacityPct} onChange={(n) => set('opacity', n === 100 ? '' : String(n / 100))} suffix="%" />
      </Field>
      <ToggleField label="Visible" checked={visible} onChange={(on) => setVisible(id, on)} />
      <Field label="Blend">
        <SelectField value={eff['mix-blend-mode'] ?? ''} onChange={(v) => set('mix-blend-mode', v)} options={BLEND.map((b) => ({ value: b, label: b || 'normal' }))} />
      </Field>
      <Field label="Overflow">
        <SelectField value={eff.overflow ?? ''} onChange={(v) => set('overflow', v)} options={OVERFLOW.map((o) => ({ value: o, label: o || 'visible' }))} />
      </Field>
      <Field label="Shadow">
        <SelectField value={eff['box-shadow'] ?? ''} onChange={(v) => set('box-shadow', v)} options={SHADOWS} />
      </Field>
    </Section>
  );
}
