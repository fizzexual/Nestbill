import { useState } from 'react';
import { ChevronDown, Plus, Trash2, FileText } from 'lucide-react';
import { useBuilder, useUI } from './store.js';
import { getActivePage } from './model.js';

export default function PagesMenu() {
  const project = useBuilder((s) => s.project);
  const activePageId = useUI((s) => s.activePageId);
  const [open, setOpen] = useState(false);
  const [renaming, setRenaming] = useState(null);
  if (!project) return null;
  const active = getActivePage(project, activePageId);

  const addPage = () => {
    const id = useBuilder.getState().addPage(`Page ${project.pages.length + 1}`);
    useUI.getState().setActivePage(id);
    setOpen(false);
  };
  const switchTo = (id) => { useUI.getState().setActivePage(id); setOpen(false); };
  const del = (id, e) => {
    e.stopPropagation();
    const wasActive = id === active.id;
    useBuilder.getState().removePage(id);
    if (wasActive) useUI.getState().setActivePage(useBuilder.getState().project.pages[0].id);
  };

  return (
    <div className="relative">
      <button onClick={() => setOpen((o) => !o)} className="flex items-center gap-1 rounded-md border border-neutral-200 px-2 py-1 text-xs text-neutral-600 hover:bg-neutral-50">
        <FileText size={13} /> {active?.name || 'Page'} <ChevronDown size={12} />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute left-0 top-9 z-50 w-56 rounded-lg border border-neutral-200 bg-white p-1.5 shadow-xl">
            {project.pages.map((p) => (
              <div
                key={p.id}
                onClick={() => switchTo(p.id)}
                className={`group flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-xs ${p.id === active.id ? 'bg-indigo-50 text-indigo-700' : 'text-neutral-700 hover:bg-neutral-100'}`}
              >
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
                  <span className="flex-1 truncate" onDoubleClick={(e) => { e.stopPropagation(); setRenaming(p.id); }}>{p.name}</span>
                )}
                {project.pages.length > 1 && (
                  <button onClick={(e) => del(p.id, e)} className="text-neutral-300 opacity-0 hover:text-red-500 group-hover:opacity-100">
                    <Trash2 size={12} />
                  </button>
                )}
              </div>
            ))}
            <button onClick={addPage} className="mt-1 flex w-full items-center gap-2 rounded-md bg-indigo-50 px-2 py-1.5 text-xs font-medium text-indigo-700 hover:bg-indigo-100">
              <Plus size={14} /> Add page
            </button>
          </div>
        </>
      )}
    </div>
  );
}
