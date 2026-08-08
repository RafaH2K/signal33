import { useState } from 'react';
import { uploadsApi } from '../../api/resources.js';

export default function ImageUploadField({ label, value, onChange }) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');

  async function handleFile(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError('');
    setUploading(true);
    try {
      const result = await uploadsApi.upload(file);
      onChange(result.url);
    } catch (err) {
      setError(err.message);
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  }

  return (
    <div className="flex flex-col gap-2 text-left">
      <span className="text-xs uppercase tracking-wide-caps text-mist">{label}</span>
      {value && (
        <div className="aspect-video w-full overflow-hidden bg-white/5">
          {/\.(mp4|webm|mov)(\?|$)/i.test(value) ? (
            <video src={value} className="h-full w-full object-cover" muted />
          ) : (
            <img src={value} alt="" className="h-full w-full object-cover" />
          )}
        </div>
      )}
      <label className="cursor-pointer border border-line-strong px-4 py-3 text-center text-xs uppercase tracking-wide-caps text-mist transition hover:border-paper hover:text-paper">
        {uploading ? 'Subiendo...' : value ? 'Reemplazar imagen' : 'Subir imagen'}
        <input type="file" accept="image/*,video/*" className="hidden" onChange={handleFile} disabled={uploading} />
      </label>
      {error && <p className="text-xs text-signal-glow">{error}</p>}
    </div>
  );
}
