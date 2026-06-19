import { useState } from 'react';
import { ChevronRight, ChevronDown } from 'lucide-react';
import { useBuilder, useUI } from './store.js';
import { COMPONENTS } from './components.jsx';

function NavNode({ id, depth, collapsed, toggle }) {
  const inst = useBuilder((s) => s.project.instances[id]);
  const selectedId = useUI((s) => s.selectedId);
  const hoveredId = useUI((s) => s.hoveredId);
  if (!inst) return null;
  const Icon = COMPONENTS[inst.component]?.icon;
  const hasChildren = inst.children.length > 0;
  const isExpanded = !collapsed.has(id);
  const selected = selectedId === id;
  const hovered = hoveredId === id;

  return (
    <div>
      <div
        onClick={() => useUI.getState().select(id)}
        onMouseEnter={() => useUI.getState().hover(id)}
        onMouseLeave={() => useUI.getState().hover(null)}
        className={`group flex cursor-pointer items-center gap-1 rounded py-1 pr-1 text-xs ${
          selected ? 'bg-indigo-50 text-indigo-700' : hovered ? 'bg-neutral-100 text-neutral-700' : 'text-neutral-600 hover:bg-neutral-100'
        }`}
        style={{ paddingLeft: 4 + depth * 12 }}
      >
        {hasChildren ? (
          <button onClick={(e) => { e.stopPropagation(); toggle(id); }} className="grid h-4 w-4 place-items-center text-neutral-400 hover:text-neutral-700">
            {isExpanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
          </button>
        ) : (
          <span className="inline-block h-4 w-4" />
        )}
        {Icon && <Icon size={13} className="shrink-0 text-neutral-400" />}
        <span className="truncate">{inst.label}</span>
      </div>
      {hasChildren && isExpanded && inst.children.map((childId) => (
        <NavNode key={childId} id={childId} depth={depth + 1} collapsed={collapsed} toggle={toggle} />
      ))}
    </div>
  );
}

export default function Navigator() {
  const rootId = useBuilder((s) => s.project?.pages?.[0]?.rootId);
  const [collapsed, setCollapsed] = useState(() => new Set());
  const toggle = (id) =>
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  if (!rootId) return null;

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="px-3 py-2 text-[11px] font-semibold uppercase tracking-wide text-neutral-400">Navigator</div>
      <div className="min-h-0 flex-1 overflow-y-auto scroll-thin px-1 pb-2">
        <NavNode id={rootId} depth={0} collapsed={collapsed} toggle={toggle} />
      </div>
    </div>
  );
}
