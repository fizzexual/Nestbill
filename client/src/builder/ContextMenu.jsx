import { Files, Copy, ClipboardPaste, Trash2, ArrowUpToLine, ArrowDownToLine, Move } from 'lucide-react';
import { useUI, clipboard } from './store.js';
import { copy, paste, duplicateSel, deleteSel, bringToFront, sendToBack, toggleFree, isFree } from './actions.js';

function Item({ icon: Icon, label, onClick, danger, disabled, hint }) {
  return (
    <button
      disabled={disabled}
      onClick={onClick}
      className={`flex w-full items-center gap-2 px-2.5 py-1.5 text-left text-xs disabled:opacity-40 ${
        danger ? 'text-red-600 hover:bg-red-50' : 'text-neutral-700 hover:bg-neutral-100'
      }`}
    >
      <Icon size={13} className="shrink-0" />
      <span className="flex-1">{label}</span>
      {hint && <span className="text-[10px] text-neutral-400">{hint}</span>}
    </button>
  );
}

export default function ContextMenu() {
  const menu = useUI((s) => s.menu);
  if (!menu) return null;
  const { id } = menu;
  const close = () => useUI.getState().setMenu(null);
  const run = (fn) => () => { fn(id); close(); };
  const x = Math.min(menu.x, window.innerWidth - 188);
  const y = Math.min(menu.y, window.innerHeight - 240);

  return (
    <>
      <div className="fixed inset-0 z-[90]" onClick={close} onContextMenu={(e) => { e.preventDefault(); close(); }} />
      <div className="fixed z-[91] w-44 overflow-hidden rounded-lg border border-neutral-200 bg-white py-1 shadow-xl" style={{ left: x, top: y }}>
        <Item icon={Files} label="Duplicate" hint="Ctrl D" onClick={run(duplicateSel)} />
        <Item icon={Copy} label="Copy" hint="Ctrl C" onClick={run(copy)} />
        <Item icon={ClipboardPaste} label="Paste" hint="Ctrl V" disabled={!clipboard.get()} onClick={run(paste)} />
        <div className="my-1 border-t border-neutral-100" />
        <Item icon={Move} label={isFree(id) ? 'Unset free' : 'Free position'} onClick={run(toggleFree)} />
        <Item icon={ArrowUpToLine} label="Bring to front" onClick={run(bringToFront)} />
        <Item icon={ArrowDownToLine} label="Send to back" onClick={run(sendToBack)} />
        <div className="my-1 border-t border-neutral-100" />
        <Item icon={Trash2} label="Delete" hint="Del" danger onClick={run(deleteSel)} />
      </div>
    </>
  );
}
