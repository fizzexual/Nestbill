import { useState } from 'react';
import { Plus, Trash2, FileText } from 'lucide-react';
import { useBuilder, useUI } from './store.js';
import { getActivePage } from './model.js';

export default function PagesPanel() {
  const project = useBuilder((s) => s.project);
  const activePageId = useUI((s) => s.activePageId);
  const [renaming, setRenaming] = useState(null);
  if (!project) return null;
  const active = getActivePage(project, activePageId);

  const add = () => {
    const id = useBuilder.getState().addPage(`Page ${project.pages.length + 1}`);
    useUI.getState().setActivePage(id);
  };
  const del = (id, e) => {
    e.stopPropagation();
    const wasActive = id === active.id;
    useBuilder.getState().removePage(id);
    if (wasActive) useUI.getState().setActivePage(useBuilder.getState().project.pages[0].id);
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col p-2">
      <div className="flex items-center justify-between px-1 pb-2">
        <span className="text-[11px] font-semibold uppercase tracking-wide text-neutral-400">Pages</span>
        <button onClick={add} className="grid h-5 w-5 place-items-center rounded text-neutral-400 hover:bg-neutral-100 hover:text-indigo-600" title="Add page">
          <Plus size={13} />
        </button>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto scroll-thin">
        {project.pages.map((p) => (
          <div
            key={p.id}
            onClick={() => useUI.getState().setActivePage(p.id)}
            className={`group flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-xs ${p.id === active.id ? 'bg-indigo-50 text-indigo-700' : 'text-neutral-700 hover:bg-neutral-100'}`}
          >
            <FileText size={13} className="shrink-0 text-neutral-400" />
            {renaming === p.id ? (
              <input
                autoFocus
                defaultValue={p.name}
                onClick={(e) => e.stopPropagation()}
                onBlur={(e) => { useBuilder.getState().renamePage(p.id, e.target.value || 'Page'); setRenaming(null); }}
                onKeyDown={(e) => { if (e.key === 'Enter') e.target.blur(); }}
                className="flex-1 rounded border border-neutral-200 px-1 text-xs"
              />
            ) : (
              <span className="flex-1 truncate" onDoubleClick={(e) => { e.stopPropagation(); setRenaming(p.id); }}>
                {p.name}
              </span>
            )}
            {project.pages.length > 1 && (
              <button onClick={(e) => del(p.id, e)} className="text-neutral-300 opacity-0 hover:text-red-500 group-hover:opacity-100">
                <Trash2 size={12} />
              </button>
            )}
          </div>
        ))}
      </div>
      <p className="px-1 pt-2 text-[10px] leading-relaxed text-neutral-400">Double-click a page to rename it.</p>
    </div>
  );
}
