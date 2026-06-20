import { Upload, Trash2 } from 'lucide-react';
import { useBuilder, useUI } from './store.js';
import { getActivePage } from './model.js';

function fileToDataUrl(file) {
  return new Promise((res, rej) => {
    const r = new FileReader();
    r.onload = () => res(r.result);
    r.onerror = rej;
    r.readAsDataURL(file);
  });
}

export default function AssetsPanel() {
  const assets = useBuilder((s) => s.project?.assets) || [];

  const onUpload = async (e) => {
    const files = [...(e.target.files || [])];
    for (const f of files) {
      // eslint-disable-next-line no-await-in-loop
      const src = await fileToDataUrl(f);
      useBuilder.getState().addAsset(f.name, src);
    }
    e.target.value = '';
  };

  const insertImage = (asset) => {
    const rootId = getActivePage(useBuilder.getState().project, useUI.getState().activePageId).rootId;
    const id = useBuilder.getState().insert('Image', rootId);
    useBuilder.getState().setProp(id, 'src', asset.src);
    useUI.getState().select(id);
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col p-2">
      <label className="mb-2 flex cursor-pointer items-center justify-center gap-1.5 rounded-md border border-dashed border-neutral-300 px-2 py-2 text-xs text-neutral-600 hover:border-indigo-400 hover:text-indigo-600">
        <Upload size={14} /> Upload images
        <input type="file" accept="image/*" multiple className="hidden" onChange={onUpload} />
      </label>
      <div className="grid min-h-0 flex-1 grid-cols-2 gap-2 overflow-y-auto scroll-thin">
        {assets.length === 0 && (
          <p className="col-span-2 px-1 py-4 text-center text-[11px] text-neutral-400">No assets yet. Upload images to reuse them anywhere.</p>
        )}
        {assets.map((a) => (
          <div key={a.id} className="group relative aspect-square overflow-hidden rounded-md border border-neutral-200">
            <button onClick={() => insertImage(a)} className="h-full w-full" title={`Insert ${a.name}`}>
              <img src={a.src} alt={a.name} className="h-full w-full object-cover" />
            </button>
            <button
              onClick={() => useBuilder.getState().removeAsset(a.id)}
              className="absolute right-1 top-1 hidden h-5 w-5 place-items-center rounded bg-black/60 text-white group-hover:grid"
              title="Remove asset"
            >
              <Trash2 size={11} />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
