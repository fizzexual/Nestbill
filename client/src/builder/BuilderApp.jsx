import { useEffect, useState } from 'react';
import { useStore } from 'zustand';
import { Undo2, Redo2, Monitor, Tablet, Smartphone, Eye, Download, Moon, Sun } from 'lucide-react';
import { downloadHtml } from './exportSite.js';
import { useBuilder, useUI } from './store.js';
import { defaultProject, findParentId, getActivePage } from './model.js';
import { COMPONENTS, COMPONENT_LIST, isContainer } from './components.jsx';
import { BREAKPOINTS } from './cssGen.js';
import Canvas from './Canvas.jsx';
import StylePanel from './StylePanel.jsx';
import Navigator from './Navigator.jsx';
import AssetsPanel from './AssetsPanel.jsx';
import ProjectBar from './ProjectBar.jsx';
import PagesMenu from './PagesMenu.jsx';
import { useAutosave } from './useAutosave.js';
import { getLastId, loadLocal, getServerId, isValidProject } from './persist.js';
import { handleShortcut } from './actions.js';
import ContextMenu from './ContextMenu.jsx';
import { TEMPLATES } from './templates.js';

function addTemplate(tpl) {
  const rootId = getActivePage(useBuilder.getState().project, useUI.getState().activePageId).rootId;
  const id = useBuilder.getState().pasteSnapshot(rootId, undefined, tpl.build());
  if (id) useUI.getState().select(id);
}

const BP_ICONS = { base: Monitor, tablet: Tablet, mobile: Smartphone };

function addComponent(component) {
  const { project } = useBuilder.getState();
  const { selectedId } = useUI.getState();
  const rootId = getActivePage(project, useUI.getState().activePageId).rootId;
  let parentId = rootId;
  let index;
  if (selectedId && project.instances[selectedId]) {
    const sel = project.instances[selectedId];
    if (isContainer(sel.component)) {
      parentId = selectedId;
    } else {
      const pid = findParentId(project.instances, selectedId);
      if (pid) {
        parentId = pid;
        index = project.instances[pid].children.indexOf(selectedId) + 1;
      }
    }
  }
  const id = useBuilder.getState().insert(component, parentId, index);
  useUI.getState().select(id);
}

export default function BuilderApp() {
  const project = useBuilder((s) => s.project);
  const breakpoint = useUI((s) => s.breakpoint);
  const previewMode = useUI((s) => s.previewMode);
  const past = useStore(useBuilder.temporal, (s) => s.pastStates.length);
  const future = useStore(useBuilder.temporal, (s) => s.futureStates.length);
  const [leftTab, setLeftTab] = useState('add');
  const [dark, setDark] = useState(() => { try { return localStorage.getItem('prismx:dark') === '1'; } catch { return false; } });
  useAutosave();

  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark);
    try { localStorage.setItem('prismx:dark', dark ? '1' : '0'); } catch { /* ignore */ }
  }, [dark]);

  useEffect(() => {
    if (project) return;
    const lastId = getLastId();
    const restored = lastId ? loadLocal(lastId) : null;
    const doc = restored && isValidProject(restored) ? restored : defaultProject();
    useBuilder.getState().loadProject(doc);
    if (restored && isValidProject(restored)) useUI.getState().setServerId(getServerId(lastId));
    useUI.getState().setActivePage(doc.pages[0].id);
  }, [project]);

  // Keyboard shortcuts (duplicate/copy/paste/delete/undo/redo/z-order/nudge)
  useEffect(() => {
    const onKey = (e) => handleShortcut(e);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  if (!project) return null;
  const temporal = useBuilder.temporal.getState();

  return (
    <div className="flex h-full flex-col bg-neutral-100 text-neutral-900">
      <header className="flex h-12 shrink-0 items-center gap-3 border-b border-neutral-200 bg-white px-3">
        <div className="flex shrink-0 items-center gap-2 pr-1">
          <div className="h-5 w-5 rounded bg-gradient-to-br from-indigo-500 to-fuchsia-500" />
        </div>
        <ProjectBar />
        <PagesMenu />
        <div className="flex items-center gap-0.5">
          <button disabled={!past} onClick={() => temporal.undo()} className="grid h-8 w-8 place-items-center rounded-md text-neutral-600 hover:bg-neutral-100 disabled:opacity-30" title="Undo">
            <Undo2 size={16} />
          </button>
          <button disabled={!future} onClick={() => temporal.redo()} className="grid h-8 w-8 place-items-center rounded-md text-neutral-600 hover:bg-neutral-100 disabled:opacity-30" title="Redo">
            <Redo2 size={16} />
          </button>
        </div>
        <div className="mx-auto flex items-center gap-0.5 rounded-lg bg-neutral-100 p-0.5">
          {Object.entries(BREAKPOINTS).map(([key, bp]) => {
            const Icon = BP_ICONS[key];
            return (
              <button key={key} onClick={() => useUI.getState().setBreakpoint(key)} title={`${bp.label} (${bp.width}px)`}
                className={`flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs ${breakpoint === key ? 'bg-white text-indigo-600 shadow-sm' : 'text-neutral-500 hover:text-neutral-800'}`}>
                <Icon size={14} />
              </button>
            );
          })}
        </div>
        <button onClick={() => setDark((d) => !d)} className="toolbtn" title="Toggle dark theme">
          {dark ? <Sun size={16} /> : <Moon size={16} />}
        </button>
        <button onClick={() => useUI.getState().setPreview(!previewMode)}
          className={`flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium ${previewMode ? 'bg-indigo-600 text-white' : 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200'}`}>
          <Eye size={14} /> Preview
        </button>
        <button onClick={() => downloadHtml(useBuilder.getState().project)}
          className="flex items-center gap-1.5 rounded-md bg-neutral-900 px-2.5 py-1.5 text-xs font-medium text-white hover:bg-neutral-700">
          <Download size={14} /> Export
        </button>
      </header>

      <div className="flex min-h-0 flex-1">
        {!previewMode && (
          <aside className="flex w-56 shrink-0 flex-col border-r border-neutral-200 bg-white">
            <div className="flex shrink-0 border-b border-neutral-200">
              {['add', 'layers', 'assets'].map((t) => (
                <button
                  key={t}
                  onClick={() => setLeftTab(t)}
                  className={`flex-1 py-2 text-[11px] font-medium capitalize ${leftTab === t ? 'border-b-2 border-indigo-500 text-indigo-600' : 'text-neutral-500 hover:text-neutral-800'}`}
                >
                  {t}
                </button>
              ))}
            </div>
            {leftTab === 'add' && (
              <div className="min-h-0 flex-1 overflow-y-auto scroll-thin">
                <div className="border-b border-neutral-100 p-2">
                  <div className="px-1 pb-2 text-[11px] font-semibold uppercase tracking-wide text-neutral-400">Sections</div>
                  <div className="flex flex-col gap-1">
                    {TEMPLATES.map((t) => (
                      <button
                        key={t.label}
                        onClick={() => addTemplate(t)}
                        className="rounded-md border border-neutral-200 px-2 py-1.5 text-left text-xs text-neutral-700 hover:border-indigo-400 hover:bg-indigo-50 hover:text-indigo-700"
                      >
                        {t.label}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="p-2">
                  <div className="px-1 pb-2 text-[11px] font-semibold uppercase tracking-wide text-neutral-400">Insert</div>
                  <div className="grid grid-cols-2 gap-1.5">
                    {COMPONENT_LIST.map((c) => {
                      const Icon = COMPONENTS[c].icon;
                      return (
                        <button
                          key={c}
                          onClick={() => addComponent(c)}
                          draggable
                          onDragStart={(e) => {
                            e.dataTransfer.setData('text/prism-component', c);
                            e.dataTransfer.effectAllowed = 'copy';
                          }}
                          className="flex cursor-grab flex-col items-center gap-1 rounded-lg border border-neutral-200 bg-neutral-50 py-2 text-[11px] text-neutral-600 hover:border-indigo-400 hover:bg-indigo-50 hover:text-indigo-700 active:cursor-grabbing"
                        >
                          <Icon size={15} />
                          {COMPONENTS[c].label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}
            {leftTab === 'layers' && <Navigator />}
            {leftTab === 'assets' && <AssetsPanel />}
          </aside>
        )}

        <Canvas />

        {!previewMode && (
          <aside className="flex w-72 shrink-0 flex-col border-l border-neutral-200 bg-white">
            <StylePanel />
          </aside>
        )}
      </div>
      <ContextMenu />
    </div>
  );
}
