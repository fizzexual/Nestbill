import { useEffect } from 'react';
import { useBuilder, useUI } from './store.js';
import { syncSave } from './persist.js';

/** Debounced autosave: localStorage immediately + best-effort server sync. */
export function useAutosave(delay = 800) {
  useEffect(() => {
    let timer = null;
    let cancelled = false;
    const unsub = useBuilder.subscribe((state, prev) => {
      if (!state.project || state.project === prev.project) return;
      useUI.getState().setSaveStatus('saving');
      clearTimeout(timer);
      timer = setTimeout(async () => {
        const project = useBuilder.getState().project;
        const result = await syncSave(project, useUI.getState().serverId);
        if (cancelled) return;
        if (result.serverId) useUI.getState().setServerId(result.serverId);
        useUI.getState().setSaveStatus(result.status);
      }, delay);
    });
    return () => {
      cancelled = true;
      clearTimeout(timer);
      unsub();
    };
  }, [delay]);
}
