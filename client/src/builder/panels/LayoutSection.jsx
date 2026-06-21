import { ArrowRight, ArrowDown } from 'lucide-react';
import { Section, Field, Segmented, LengthField, NumberField, ToggleField, AlignGrid } from '../controls.jsx';
import { stackAlign, stackAlignToCss } from '../layout.js';

/**
 * Container layout (Framer "Stack"): choose Block / Stack(flex) / Grid, then the
 * arrangement of children (direction, gap, wrap, 3x3 align, grid columns).
 * Only rendered for container components.
 */
export default function LayoutSection({ eff, set, setMany }) {
  const display = eff.display || 'block';
  const mode = display === 'flex' || display === 'inline-flex' ? 'flex' : display === 'grid' ? 'grid' : 'block';
  const direction = eff['flex-direction'] || 'row';
  const align = stackAlign(eff, direction);
  const cols = (() => {
    const m = /repeat\((\d+),/.exec(eff['grid-template-columns'] || '');
    return m ? Number(m[1]) : '';
  })();

  const setMode = (m) => {
    if (m === 'flex') setMany({ display: 'flex', 'flex-direction': direction || 'row', 'grid-template-columns': '' });
    else if (m === 'grid') setMany({ display: 'grid', 'grid-template-columns': eff['grid-template-columns'] || 'repeat(2, 1fr)', 'flex-direction': '', 'align-items': '', 'justify-content': '' });
    else setMany({ display: 'block', 'flex-direction': '', 'grid-template-columns': '', gap: '', 'align-items': '', 'justify-content': '', 'flex-wrap': '' });
  };

  return (
    <Section title="Layout">
      <Field label="Type">
        <Segmented
          value={mode}
          onChange={(m) => { if (m) setMode(m); }}
          options={[
            { value: 'block', label: 'Block' },
            { value: 'flex', label: 'Stack' },
            { value: 'grid', label: 'Grid' },
          ]}
        />
      </Field>

      {mode === 'flex' && (
        <>
          <Field label="Direction">
            <Segmented
              value={direction}
              onChange={(val) => set('flex-direction', val || 'row')}
              options={[
                { value: 'row', icon: ArrowRight, title: 'Row' },
                { value: 'column', icon: ArrowDown, title: 'Column' },
              ]}
            />
          </Field>
          <Field label="Align">
            <AlignGrid value={align} onChange={({ h, v }) => setMany(stackAlignToCss(h, v, direction))} />
          </Field>
          <Field label="Gap"><LengthField value={eff.gap ?? ''} onChange={(val) => set('gap', val)} /></Field>
          <ToggleField label="Wrap" checked={eff['flex-wrap'] === 'wrap'} onChange={(on) => set('flex-wrap', on ? 'wrap' : '')} />
        </>
      )}

      {mode === 'grid' && (
        <>
          <Field label="Columns">
            <NumberField value={cols} min={1} max={12} onChange={(n) => set('grid-template-columns', n ? `repeat(${n}, 1fr)` : '')} />
          </Field>
          <Field label="Gap"><LengthField value={eff.gap ?? ''} onChange={(val) => set('gap', val)} /></Field>
        </>
      )}
    </Section>
  );
}
