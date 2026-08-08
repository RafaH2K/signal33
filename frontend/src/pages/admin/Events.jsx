import { useEffect, useState } from 'react';
import { eventsApi } from '../../api/resources.js';
import Field from '../../components/Field.jsx';
import Modal from '../../components/admin/Modal.jsx';
import ImageUploadField from '../../components/admin/ImageUploadField.jsx';

const EMPTY_FORM = { title: '', description: '', eventDate: '', venue: '', coverImageUrl: '', ticketUrl: '', isActive: true };

function toDatetimeLocal(isoString) {
  if (!isoString) return '';
  const date = new Date(isoString);
  const offset = date.getTimezoneOffset();
  return new Date(date.getTime() - offset * 60000).toISOString().slice(0, 16);
}

export default function AdminEvents() {
  const [events, setEvents] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  function load() {
    eventsApi
      .list('?includeInactive=true&pageSize=100')
      .then((data) => setEvents(data.events))
      .catch(() => setEvents([]));
  }

  useEffect(load, []);

  function openCreate() {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setError('');
    setModalOpen(true);
  }

  function openEdit(event) {
    setEditingId(event.id);
    setForm({
      title: event.title,
      description: event.description ?? '',
      eventDate: toDatetimeLocal(event.event_date),
      venue: event.venue,
      coverImageUrl: event.cover_image_url ?? '',
      ticketUrl: event.ticket_url ?? '',
      isActive: event.is_active,
    });
    setError('');
    setModalOpen(true);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setSaving(true);
    const payload = {
      title: form.title,
      description: form.description || undefined,
      // el input datetime-local no lleva timezone: new Date() lo interpreta
      // en la hora local del navegador (la del admin), y toISOString() lo
      // vuelve un instante inequívoco antes de mandarlo al backend.
      eventDate: new Date(form.eventDate).toISOString(),
      venue: form.venue,
      coverImageUrl: form.coverImageUrl || undefined,
      ticketUrl: form.ticketUrl || undefined,
      isActive: form.isActive,
    };
    try {
      if (editingId) await eventsApi.update(editingId, payload);
      else await eventsApi.create(payload);
      setModalOpen(false);
      load();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive(event) {
    await eventsApi.update(event.id, { isActive: !event.is_active });
    load();
  }

  async function handleDelete(event) {
    if (!confirm(`¿Eliminar "${event.title}"?`)) return;
    await eventsApi.remove(event.id);
    load();
  }

  return (
    <div>
      <div className="mb-10 flex items-center justify-between">
        <h1 className="font-display text-xl uppercase tracking-wide-caps">Eventos</h1>
        <button
          type="button"
          onClick={openCreate}
          className="bg-paper px-5 py-2.5 font-display text-xs uppercase tracking-wide-caps text-ink transition hover:opacity-90"
        >
          Nuevo evento
        </button>
      </div>

      {events === null ? (
        <p className="text-sm text-mist">Cargando...</p>
      ) : events.length === 0 ? (
        <p className="text-sm text-mist">Todavía no hay eventos.</p>
      ) : (
        <ul className="divide-y divide-line">
          {events.map((event) => (
            <li key={event.id} className="flex items-center gap-4 py-3">
              <div className="h-14 w-14 shrink-0 overflow-hidden bg-white/5">
                {event.cover_image_url && <img src={event.cover_image_url} alt="" className="h-full w-full object-cover" />}
              </div>
              <div className="flex-1">
                <p className="text-sm">{event.title}</p>
                <p className="text-xs text-mist-dim">
                  {event.venue} · {new Date(event.event_date).toLocaleDateString('es-AR')}
                </p>
              </div>
              <button
                type="button"
                onClick={() => toggleActive(event)}
                className={`text-xs uppercase tracking-wide-caps transition ${event.is_active ? 'text-signal-glow' : 'text-mist-dim'}`}
              >
                {event.is_active ? 'Activo' : 'Inactivo'}
              </button>
              <button type="button" onClick={() => openEdit(event)} className="text-xs uppercase tracking-wide-caps text-mist transition hover:text-paper">
                Editar
              </button>
              <button type="button" onClick={() => handleDelete(event)} className="text-xs uppercase tracking-wide-caps text-mist transition hover:text-signal-glow">
                Eliminar
              </button>
            </li>
          ))}
        </ul>
      )}

      <Modal open={modalOpen} title={editingId ? 'Editar evento' : 'Nuevo evento'} onClose={() => setModalOpen(false)}>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <Field label="Título" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required />
          <Field
            label="Descripción"
            textarea
            rows={3}
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
          />
          <Field
            label="Fecha y hora"
            type="datetime-local"
            value={form.eventDate}
            onChange={(e) => setForm({ ...form, eventDate: e.target.value })}
            required
          />
          <Field label="Lugar" value={form.venue} onChange={(e) => setForm({ ...form, venue: e.target.value })} required />
          <ImageUploadField label="Portada" value={form.coverImageUrl} onChange={(url) => setForm({ ...form, coverImageUrl: url })} />
          <Field
            label="Link de boletos (opcional)"
            type="url"
            value={form.ticketUrl}
            onChange={(e) => setForm({ ...form, ticketUrl: e.target.value })}
          />
          <label className="flex items-center gap-2 text-xs uppercase tracking-wide-caps text-mist">
            <input type="checkbox" checked={form.isActive} onChange={(e) => setForm({ ...form, isActive: e.target.checked })} />
            Activo (visible en el sitio)
          </label>
          {error && <p className="text-xs text-signal-glow">{error}</p>}
          <button
            type="submit"
            disabled={saving}
            className="mt-2 bg-paper py-3.5 font-display text-sm uppercase tracking-wide-caps text-ink transition hover:opacity-90 disabled:opacity-50"
          >
            {saving ? 'Guardando...' : 'Guardar'}
          </button>
        </form>
      </Modal>
    </div>
  );
}
