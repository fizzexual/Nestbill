import { create } from 'zustand';
import { temporal } from 'zundo';
import { COMPONENTS } from './components.jsx';
import { createInstance, findParentId, collectSubtree, isAncestor } from './model.js';
import { newId } from '../lib/ids.js';

// In-memory clipboard for copy/paste (a serialized subtree snapshot).
let clipboardSnap = null;
export const clipboard = { set: (v) => { clipboardSnap = v; }, get: () => clipboardSnap };

/** Document store (instances + styles). Tracked by undo/redo. */
export const useBuilder = create(
  temporal(
    (set, get) => ({
      project: null,

      loadProject(project) {
        set({ project });
        useBuilder.temporal.getState().clear();
      },

      setName(name) {
        set((s) => (s.project ? { project: { ...s.project, name } } : s));
      },

      /** Insert a new component as a child of parentId at index. Returns the new id. */
      insert(component, parentId, index) {
        const inst = createInstance(component);
        set((s) => {
          if (!s.project) return s;
          const instances = { ...s.project.instances, [inst.id]: inst };
          const parent = { ...instances[parentId] };
          const children = [...parent.children];
          children.splice(index ?? children.length, 0, inst.id);
          parent.children = children;
          instances[parentId] = parent;
          const styles = { ...s.project.styles, [inst.id]: { base: { ...(COMPONENTS[component].defaultStyle || {}) } } };
          return { project: { ...s.project, instances, styles } };
        });
        return inst.id;
      },

      remove(id) {
        set((s) => {
          if (!s.project || s.project.pages.some((p) => p.rootId === id)) return s;
          const ids = collectSubtree(s.project.instances, id);
          const instances = { ...s.project.instances };
          const styles = { ...s.project.styles };
          for (const i of ids) {
            delete instances[i];
            delete styles[i];
          }
          const parentId = findParentId(s.project.instances, id);
          if (parentId && instances[parentId]) {
            instances[parentId] = { ...instances[parentId], children: instances[parentId].children.filter((c) => c !== id) };
          }
          return { project: { ...s.project, instances, styles } };
        });
      },

      /** Move an instance under newParentId at index. No-op if it would create a cycle. */
      move(id, newParentId, index) {
        set((s) => {
          if (!s.project) return s;
          if (id === newParentId || isAncestor(s.project.instances, id, newParentId)) return s;
          const instances = { ...s.project.instances };
          const oldParentId = findParentId(instances, id);
          if (oldParentId) {
            instances[oldParentId] = { ...instances[oldParentId], children: instances[oldParentId].children.filter((c) => c !== id) };
          }
          const np = { ...instances[newParentId] };
          const children = [...np.children];
          const clamped = Math.max(0, Math.min(index ?? children.length, children.length));
          children.splice(clamped, 0, id);
          np.children = children;
          instances[newParentId] = np;
          return { project: { ...s.project, instances } };
        });
      },

      duplicate(id) {
        let newId = null;
        set((s) => {
          if (!s.project) return s;
          const parentId = findParentId(s.project.instances, id);
          if (!parentId) return s;
          const instances = { ...s.project.instances };
          const styles = { ...s.project.styles };
          const cloneRec = (srcId) => {
            const src = instances[srcId];
            const copy = createInstance(src.component);
            copy.label = src.label;
            copy.props = { ...src.props };
            styles[copy.id] = JSON.parse(JSON.stringify(styles[srcId] || {}));
            copy.children = src.children.map(cloneRec);
            instances[copy.id] = copy;
            return copy.id;
          };
          const cloneId = cloneRec(id);
          newId = cloneId;
          const parent = { ...instances[parentId] };
          const idx = parent.children.indexOf(id);
          const children = [...parent.children];
          children.splice(idx + 1, 0, cloneId);
          parent.children = children;
          instances[parentId] = parent;
          return { project: { ...s.project, instances, styles } };
        });
        return newId;
      },

      /** Insert a snapshot subtree (with fresh ids) under parentId. Returns the new root id. */
      pasteSnapshot(parentId, index, snap) {
        let newRootId = null;
        set((s) => {
          if (!s.project || !snap) return s;
          const map = {};
          for (const oldId of Object.keys(snap.instances)) map[oldId] = newId('i');
          const instances = { ...s.project.instances };
          const styles = { ...s.project.styles };
          for (const oldId of Object.keys(snap.instances)) {
            const src = snap.instances[oldId];
            const nid = map[oldId];
            instances[nid] = { ...src, id: nid, props: { ...src.props }, children: src.children.map((c) => map[c]) };
            styles[nid] = JSON.parse(JSON.stringify(snap.styles[oldId] || {}));
          }
          newRootId = map[snap.rootId];
          const parent = { ...instances[parentId] };
          const kids = [...parent.children];
          kids.splice(index ?? kids.length, 0, newRootId);
          parent.children = kids;
          instances[parentId] = parent;
          return { project: { ...s.project, instances, styles } };
        });
        return newRootId;
      },

      rename(id, label) {
        set((s) => {
          if (!s.project) return s;
          const instances = { ...s.project.instances, [id]: { ...s.project.instances[id], label } };
          return { project: { ...s.project, instances } };
        });
      },

      setProp(id, prop, value) {
        set((s) => {
          if (!s.project) return s;
          const inst = { ...s.project.instances[id], props: { ...s.project.instances[id].props, [prop]: value } };
          return { project: { ...s.project, instances: { ...s.project.instances, [id]: inst } } };
        });
      },

      /** Set/clear several CSS declarations in one undo step (used by move/resize). */
      setStyles(id, breakpoint, decls) {
        set((s) => {
          if (!s.project) return s;
          const styles = { ...s.project.styles };
          const cur = { ...(styles[id] || {}) };
          const bp = { ...(cur[breakpoint] || {}) };
          for (const [k, val] of Object.entries(decls)) {
            if (val === '' || val == null) delete bp[k];
            else bp[k] = val;
          }
          cur[breakpoint] = bp;
          styles[id] = cur;
          return { project: { ...s.project, styles } };
        });
      },

      /** Set or clear one CSS declaration for an instance at a breakpoint. */
      setStyle(id, breakpoint, prop, value) {
        set((s) => {
          if (!s.project) return s;
          const styles = { ...s.project.styles };
          const cur = { ...(styles[id] || {}) };
          const bp = { ...(cur[breakpoint] || {}) };
          if (value === '' || value == null) delete bp[prop];
          else bp[prop] = value;
          cur[breakpoint] = bp;
          styles[id] = cur;
          return { project: { ...s.project, styles } };
        });
      },
    }),
    { limit: 100, partialize: (s) => ({ project: s.project }) },
  ),
);

/** UI store (selection, hover, breakpoint, preview). Not tracked by undo. */
export const useUI = create((set) => ({
  selectedId: null,
  hoveredId: null,
  breakpoint: 'base',
  previewMode: false,
  serverId: null,
  saveStatus: 'idle', // 'idle' | 'saving' | 'cloud' | 'local'
  menu: null, // { x, y, id } context menu
  select: (id) => set({ selectedId: id }),
  hover: (id) => set({ hoveredId: id }),
  setBreakpoint: (breakpoint) => set({ breakpoint }),
  setPreview: (previewMode) => set({ previewMode }),
  setServerId: (serverId) => set({ serverId }),
  setSaveStatus: (saveStatus) => set({ saveStatus }),
  setMenu: (menu) => set({ menu }),
}));
