import { Section, Field, SelectField, LengthField, NumberField } from '../controls.jsx';
import { setPositionType } from '../actions.js';

const TYPE_OPTIONS = [
  { value: 'flow', label: 'In Flow' },
  { value: 'absolute', label: 'Absolute' },
  { value: 'fixed', label: 'Fixed' },
  { value: 'sticky', label: 'Sticky' },
];

/**
 * Element placement. Switching to Absolute/Fixed captures the element's current
 * rect (so it doesn't jump) and makes it freely drag/resizable on the canvas;
 * Sticky pins it with a top offset; In Flow returns it to normal layout.
 */
export default function PositionSection({ id, eff, set }) {
  const position = eff.position || '';
  const type = ['absolute', 'fixed', 'sticky'].includes(position) ? position : 'flow';
  const positioned = type !== 'flow';

  return (
    <Section title="Position" defaultOpen={positioned}>
      <Field label="Type">
        <SelectField value={type} onChange={(t) => setPositionType(id, t)} options={TYPE_OPTIONS} />
      </Field>
      {positioned && (
        <div className="grid grid-cols-2 gap-2">
          <Field label="Top"><LengthField value={eff.top ?? ''} onChange={(val) => set('top', val)} /></Field>
          <Field label="Left"><LengthField value={eff.left ?? ''} onChange={(val) => set('left', val)} /></Field>
          <Field label="Right"><LengthField value={eff.right ?? ''} onChange={(val) => set('right', val)} /></Field>
          <Field label="Bottom"><LengthField value={eff.bottom ?? ''} onChange={(val) => set('bottom', val)} /></Field>
        </div>
      )}
      <Field label="Z-index"><NumberField value={eff['z-index'] ?? ''} onChange={(val) => set('z-index', val === '' ? '' : String(val))} /></Field>
    </Section>
  );
}
