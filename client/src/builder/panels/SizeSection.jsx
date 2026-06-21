import { Section, Field, ModeField, LengthField } from '../controls.jsx';
import { axisSizeMode, axisSizeToCss, defaultForMode } from '../layout.js';

/**
 * Framer-style sizing: Width/Height each pick a mode (Fill/Fit/Fixed/Relative)
 * that compiles to the right CSS for the element's parent layout, plus Min/Max.
 */
export default function SizeSection({ eff, ctx, set, setMany }) {
  const w = axisSizeMode('width', eff, ctx);
  const h = axisSizeMode('height', eff, ctx);
  const applyMode = (axis, cur, m) => setMany(axisSizeToCss(axis, m, defaultForMode(m, cur.value), ctx));
  const applyValue = (axis, cur, val) => setMany(axisSizeToCss(axis, cur.mode, val, ctx));

  return (
    <Section title="Size">
      <Field label="Width">
        <ModeField mode={w.mode} value={w.value} onMode={(m) => applyMode('width', w, m)} onValue={(val) => applyValue('width', w, val)} />
      </Field>
      <Field label="Height">
        <ModeField mode={h.mode} value={h.value} onMode={(m) => applyMode('height', h, m)} onValue={(val) => applyValue('height', h, val)} />
      </Field>
      <div className="grid grid-cols-2 gap-2">
        <Field label="Min W"><LengthField value={eff['min-width'] ?? ''} onChange={(v) => set('min-width', v)} /></Field>
        <Field label="Max W"><LengthField value={eff['max-width'] ?? ''} onChange={(v) => set('max-width', v)} /></Field>
        <Field label="Min H"><LengthField value={eff['min-height'] ?? ''} onChange={(v) => set('min-height', v)} /></Field>
        <Field label="Max H"><LengthField value={eff['max-height'] ?? ''} onChange={(v) => set('max-height', v)} /></Field>
      </div>
    </Section>
  );
}
