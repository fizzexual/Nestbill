import {
  AlignStartVertical, AlignCenterVertical, AlignEndVertical,
  AlignStartHorizontal, AlignCenterHorizontal, AlignEndHorizontal,
} from 'lucide-react';
import { alignDecls } from '../layout.js';

// Horizontal align (left/center/right) and vertical align (top/middle/bottom)
// of the selected element within its parent.
const H = [
  { pos: 'start', Icon: AlignStartVertical, title: 'Align left' },
  { pos: 'center', Icon: AlignCenterVertical, title: 'Align horizontal center' },
  { pos: 'end', Icon: AlignEndVertical, title: 'Align right' },
];
const V = [
  { pos: 'start', Icon: AlignStartHorizontal, title: 'Align top' },
  { pos: 'center', Icon: AlignCenterHorizontal, title: 'Align vertical center' },
  { pos: 'end', Icon: AlignEndHorizontal, title: 'Align bottom' },
];

export default function AlignToolbar({ ctx, setMany }) {
  const Btn = ({ Icon, title, onClick }) => (
    <button onClick={onClick} title={title} className="grid h-7 w-7 place-items-center rounded text-neutral-500 hover:bg-neutral-100 hover:text-indigo-600">
      <Icon size={15} />
    </button>
  );
  return (
    <div className="flex items-center gap-1 border-b border-neutral-100 px-3 py-2">
      <div className="flex gap-0.5">
        {H.map((h) => <Btn key={h.pos} Icon={h.Icon} title={h.title} onClick={() => setMany(alignDecls(ctx, 'horizontal', h.pos))} />)}
      </div>
      <div className="mx-1 h-4 w-px bg-neutral-200" />
      <div className="flex gap-0.5">
        {V.map((vv) => <Btn key={vv.pos} Icon={vv.Icon} title={vv.title} onClick={() => setMany(alignDecls(ctx, 'vertical', vv.pos))} />)}
      </div>
    </div>
  );
}
