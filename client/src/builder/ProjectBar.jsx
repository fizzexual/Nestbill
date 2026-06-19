import { useState } from 'react';
import { ChevronDown, Plus, Trash2, Cloud, CloudOff, Loader2, FolderOpen } from 'lucide-react';
import { useBuilder, useUI } from './store.js';
import { defaultProject } from './model.js';
import { listAll, deleteProject, loadLocal, getServerId, isValidProject } from './persist.js';
import { api } from '../lib/api.js';

const STATUS = {
  idle: { icon: Cloud, text: 'Saved', cls: 'text-neutral-400' },
  saving: { icon: Loader2, text: 'Saving…', cls: 'text-neutral-400' },
  cloud: { icon: Cloud, text: 'Saved to cloud', cls: 'text-emerald-500' },
  local: { icon: CloudOff, text: 'Saved locally', cls: 'text-amber-500' },
};

function StatusChip() {
  const status = useUI((s) => s.saveStatus);
  const m = STATUS[status] || STATUS.idle;
  const Icon = m.icon;
  return (
    <span className={`flex items-center gap-1 text-[11px] ${m.cls}`} title={m.text}>
      <Icon size={13} className={status === 'saving' ? 'animate-spin' : ''} />
      {m.text}
    </span>
  );
}

function loadInto(project, serverId) {
  useBuilder.getState().loadProject(project);
  useUI.getState().select(null);
  useUI.getState().setServerId(serverId);
  useUI.getState().setSaveStatus('idle');
}

export default function ProjectBar() {
  const name = useBuilder((s) => s.project?.name || '');
  const [open, setOpen] = useState(false);
  const [list, setList] = useState([]);

  const openMenu = async () => {
    setOpen(true);
    setList(await listAll());
  };
  const newProject = () => {
    loadInto(defaultProject('Untitled'), null);
    setOpen(false);
  };
  const openOne = async (entry) => {
    let proj = null;
    let sid = null;
    if (entry.serverId) {
      try {
        const row = await api.getProject(entry.serverId);
        if (isValidProject(row.document)) { proj = row.document; sid = row.id; }
      } catch { /* fall back to local */ }
    }
    if (!proj) {
      const lp = loadLocal(entry.id);
      if (isValidProject(lp)) { proj = lp; sid = getServerId(entry.id); }
    }
    if (proj) loadInto(proj, sid);
    setOpen(false);
  };
  const removeOne = async (entry, e) => {
    e.stopPropagation();
    await deleteProject(entry);
    setList(await listAll());
  };

  return (
    <div className="relative flex items-center gap-2">
      <input
        value={name}
        onChange={(e) => useBuilder.getState().setName(e.target.value)}
        className="w-40 rounded bg-transparent px-1 py-0.5 text-sm font-medium text-neutral-800 outline-none hover:bg-neutral-100 focus:bg-neutral-100"
      />
      <StatusChip />
      <button onClick={openMenu} className="flex items-center gap-1 rounded-md border border-neutral-200 px-2 py-1 text-xs text-neutral-600 hover:bg-neutral-50">
        <FolderOpen size={13} /> Projects <ChevronDown size={12} />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute left-0 top-9 z-50 w-72 rounded-lg border border-neutral-200 bg-white p-1.5 shadow-xl">
            <button onClick={newProject} className="mb-1 flex w-full items-center gap-2 rounded-md bg-indigo-50 px-2 py-1.5 text-xs font-medium text-indigo-700 hover:bg-indigo-100">
              <Plus size={14} /> New project
            </button>
            <div className="max-h-72 overflow-y-auto scroll-thin">
              {list.length === 0 && <p className="px-2 py-3 text-center text-[11px] text-neutral-400">No saved projects yet.</p>}
              {list.map((entry) => (
                <div key={entry.id} onClick={() => openOne(entry)} className="group flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-xs text-neutral-700 hover:bg-neutral-100">
                  {entry.where === 'cloud' ? <Cloud size={12} className="text-emerald-500" /> : <CloudOff size={12} className="text-amber-500" />}
                  <span className="flex-1 truncate">{entry.name}</span>
                  <button onClick={(e) => removeOne(entry, e)} className="text-neutral-300 opacity-0 hover:text-red-500 group-hover:opacity-100">
                    <Trash2 size={12} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
