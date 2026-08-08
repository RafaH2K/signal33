import { useEffect, useState } from 'react';
import { ArrowDown, ArrowUp } from '@phosphor-icons/react';
import { galleryApi } from '../../api/resources.js';
import Field from '../../components/Field.jsx';
import Modal from '../../components/admin/Modal.jsx';
import ImageUploadField from '../../components/admin/ImageUploadField.jsx';

const EMPTY_FORM = { type: 'IMAGE', url: '', title: '', isActive: true };

export default function AdminGallery() {
  const [items, setItems] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  function load() {
    galleryApi
      .list('?includeInactive=true')
      .then(setItems)
      .catch(() => setItems([]));
  }

  useEffect(load, []);

  function openCreate() {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setError('');
    setModalOpen(true);
  }

  function openEdit(item) {
    setEditingId(item.id);
    setForm({ type: item.type, url: item.url, title: item.title ?? '', isActive: item.is_active });
    setError('');
    setModalOpen(true);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setSaving(true);
    const payload = { type: form.type, url: form.url, title: form.title || undefined, isActive: form.isActive };
    try {
      if (editingId) await galleryApi.update(editingId, payload);
      else await galleryApi.create(payload);
      setModalOpen(false);
      load();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive(item) {
    await galleryApi.update(item.id, { isActive: !item.is_active });
    load();
  }

  async function handleDelete(item) {
    if (!confirm(`¿Eliminar "${item.title || item.type}"?`)) return;
    await galleryApi.remove(item.id);
    load();
  }

  async function move(index, direction) {
    const next = [...items];
    const target = index + direction;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target], next[index]];
    setItems(next);
    await galleryApi.reorder(next.map((item, i) => ({ id: item.id, sortOrder: i })));
  }

  return (
    <div>
      <div className="mb-10 flex items-center justify-between">
        <h1 className="font-display text-xl uppercase tracking-wide-caps">Galería</h1>
        <button
          type="button"
          onClick={openCreate}
          className="bg-paper px-5 py-2.5 font-display text-xs uppercase tracking-wide-caps text-ink transition hover:opacity-90"
        >
          Nuevo elemento
        </button>
      </div>

      {items === null ? (
        <p className="text-sm text-mist">Cargando...</p>
      ) : items.length === 0 ? (
        <p className="text-sm text-mist">Todavía no hay elementos en la galería.</p>
      ) : (
        <ul className="divide-y divide-line">
          {items.map((item, i) => (
            <li key={item.id} className="flex items-center gap-4 py-3">
              <div className="flex flex-col">
                <button type="button" onClick={() => move(i, -1)} disabled={i === 0} className="text-mist transition hover:text-paper disabled:opacity-20">
                  <ArrowUp size={14} />
                </button>
                <button type="button" onClick={() => move(i, 1)} disabled={i === items.length - 1} className="text-mist transition hover:text-paper disabled:opacity-20">
                  <ArrowDown size={14} />
                </button>
              </div>
              <div className="h-14 w-14 shrink-0 overflow-hidden bg-white/5">
                {item.type === 'IMAGE' ? (
                  <img src={item.url} alt="" className="h-full w-full object-cover" />
                ) : (
                  <video src={item.url} className="h-full w-full object-cover" muted />
                )}
              </div>
              <div className="flex-1">
                <p className="text-sm">{item.title || `${item.type} sin título`}</p>
                <p className="text-xs text-mist-dim">{item.type}</p>
              </div>
              <button
                type="button"
                onClick={() => toggleActive(item)}
                className={`text-xs uppercase tracking-wide-caps transition ${item.is_active ? 'text-signal-glow' : 'text-mist-dim'}`}
              >
                {item.is_active ? 'Activo' : 'Inactivo'}
              </button>
              <button type="button" onClick={() => openEdit(item)} className="text-xs uppercase tracking-wide-caps text-mist transition hover:text-paper">
                Editar
              </button>
              <button type="button" onClick={() => handleDelete(item)} className="text-xs uppercase tracking-wide-caps text-mist transition hover:text-signal-glow">
                Eliminar
              </button>
            </li>
          ))}
        </ul>
      )}

      <Modal open={modalOpen} title={editingId ? 'Editar elemento' : 'Nuevo elemento'} onClose={() => setModalOpen(false)}>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <label className="flex flex-col gap-2 text-left">
            <span className="text-xs uppercase tracking-wide-caps text-mist">Tipo</span>
            <select
              value={form.type}
              onChange={(e) => setForm({ ...form, type: e.target.value })}
              className="border border-line-strong bg-ink px-4 py-3 text-sm text-paper outline-none focus:border-signal"
            >
              <option value="IMAGE">Imagen</option>
              <option value="VIDEO">Video</option>
            </select>
          </label>
          <ImageUploadField label={form.type === 'IMAGE' ? 'Imagen' : 'Video'} value={form.url} onChange={(url) => setForm({ ...form, url })} />
          <Field label="Título (opcional)" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
          <label className="flex items-center gap-2 text-xs uppercase tracking-wide-caps text-mist">
            <input type="checkbox" checked={form.isActive} onChange={(e) => setForm({ ...form, isActive: e.target.checked })} />
            Activo (visible en el sitio)
          </label>
          {error && <p className="text-xs text-signal-glow">{error}</p>}
          <button
            type="submit"
            disabled={saving || !form.url}
            className="mt-2 bg-paper py-3.5 font-display text-sm uppercase tracking-wide-caps text-ink transition hover:opacity-90 disabled:opacity-50"
          >
            {saving ? 'Guardando...' : 'Guardar'}
          </button>
        </form>
      </Modal>
    </div>
  );
}
