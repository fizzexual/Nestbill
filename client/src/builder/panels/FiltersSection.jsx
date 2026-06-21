import { Section, Field, Slider } from '../controls.jsx';
import { FILTER_FUNCS, parseFilter, serializeFilter } from '../transforms.js';

const RANGES = { blur: [0, 50], brightness: [0, 200], contrast: [0, 200], saturate: [0, 200], grayscale: [0, 100], hue: [0, 360] };
const LABELS = { blur: 'Blur', brightness: 'Bright', contrast: 'Contr.', saturate: 'Sat.', grayscale: 'Gray', hue: 'Hue' };
const suffixFor = (unit) => (unit === 'deg' ? '°' : unit);

function FilterGroup({ prop, eff, set }) {
  const obj = parseFilter(eff[prop]);
  const change = (key, val) => set(prop, serializeFilter({ ...obj, [key]: val }));
  return FILTER_FUNCS.map((f) => {
    const [min, max] = RANGES[f.key];
    return (
      <Field key={f.key} label={LABELS[f.key]}>
        <Slider value={obj[f.key] ?? f.def} min={min} max={max} step={1} suffix={suffixFor(f.unit)} onChange={(n) => change(f.key, n)} />
      </Field>
    );
  });
}

/** filter and backdrop-filter, edited as a set of sliders composed into one shorthand each. */
export default function FiltersSection({ eff, set }) {
  return (
    <Section title="Filters" defaultOpen={false}>
      <div className="text-[10px] font-medium text-neutral-400">Filter</div>
      <FilterGroup prop="filter" eff={eff} set={set} />
      <div className="mt-1 text-[10px] font-medium text-neutral-400">Backdrop</div>
      <FilterGroup prop="backdrop-filter" eff={eff} set={set} />
    </Section>
  );
}
