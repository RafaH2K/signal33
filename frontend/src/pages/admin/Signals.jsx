import { useEffect, useState } from 'react';
import { dashboardApi } from '../../api/resources.js';
import Field from '../../components/Field.jsx';
import Modal from '../../components/admin/Modal.jsx';

const EMPTY_FORM = { command: '', type: 'MESSAGE', url: '', effect: '', durationSeconds: '', message: '', isActive: true };

function payloadSummary(signal) {
  if (signal.type === 'REDIRECT') return signal.payload.url;
  if (signal.type === 'EFFECT') return signal.payload.effect;
  return signal.payload.message;
}

export default function AdminSignals() {
  const [signals, setSignals] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  function load() {
    dashboardApi.signals
      .list('?includeInactive=true')
      .then(setSignals)
      .catch(() => setSignals([]));
  }

  useEffect(load, []);

  function openCreate() {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setError('');
    setModalOpen(true);
  }

  function openEdit(signal) {
    setEditingId(signal.id);
    setForm({
      command: signal.command,
      type: signal.type,
      url: signal.type === 'REDIRECT' ? signal.payload.url : '',
      effect: signal.type === 'EFFECT' ? signal.payload.effect : '',
      durationSeconds: signal.type === 'EFFECT' ? (signal.payload.durationSeconds ?? '') : '',
      message: signal.type === 'MESSAGE' ? signal.payload.message : '',
      isActive: signal.is_active,
    });
    setError('');
    setModalOpen(true);
  }

  function buildPayload() {
    if (form.type === 'REDIRECT') return { url: form.url };
    if (form.type === 'EFFECT') {
      const payload = { effect: form.effect };
      if (form.durationSeconds) payload.durationSeconds = Number(form.durationSeconds);
      return payload;
    }
    return { message: form.message };
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setSaving(true);
    const payload = { command: form.command, type: form.type, payload: buildPayload(), isActive: form.isActive };
    try {
      if (editingId) await dashboardApi.signals.update(editingId, payload);
      else await dashboardApi.signals.create(payload);
      setModalOpen(false);
      load();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive(signal) {
    await dashboardApi.signals.update(signal.id, { isActive: !signal.is_active });
    load();
  }

  async function handleDelete(signal) {
    if (!confirm(`¿Eliminar el comando "${signal.command}"?`)) return;
    await dashboardApi.signals.remove(signal.id);
    load();
  }

  return (
    <div>
      <div className="mb-10 flex items-center justify-between">
        <h1 className="font-display text-xl uppercase tracking-wide-caps">Signal</h1>
        <button
          type="button"
          onClick={openCreate}
          className="bg-paper px-5 py-2.5 font-display text-xs uppercase tracking-wide-caps text-ink transition hover:opacity-90"
        >
          Nuevo comando
        </button>
      </div>

      {signals === null ? (
        <p className="text-sm text-mist">Cargando...</p>
      ) : signals.length === 0 ? (
        <p className="text-sm text-mist">Todavía no hay comandos.</p>
      ) : (
        <ul className="divide-y divide-line">
          {signals.map((signal) => (
            <li key={signal.id} className="flex items-center gap-4 py-3">
              <div className="flex-1">
                <p className="font-mono text-sm">{signal.command}</p>
                <p className="text-xs text-mist-dim">
                  {signal.type} · {payloadSummary(signal)}
                </p>
              </div>
              <button
                type="button"
                onClick={() => toggleActive(signal)}
                className={`text-xs uppercase tracking-wide-caps transition ${signal.is_active ? 'text-signal-glow' : 'text-mist-dim'}`}
              >
                {signal.is_active ? 'Activo' : 'Inactivo'}
              </button>
              <button type="button" onClick={() => openEdit(signal)} className="text-xs uppercase tracking-wide-caps text-mist transition hover:text-paper">
                Editar
              </button>
              <button type="button" onClick={() => handleDelete(signal)} className="text-xs uppercase tracking-wide-caps text-mist transition hover:text-signal-glow">
                Eliminar
              </button>
            </li>
          ))}
        </ul>
      )}

      <Modal open={modalOpen} title={editingId ? 'Editar comando' : 'Nuevo comando'} onClose={() => setModalOpen(false)}>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <Field
            label="Comando"
            value={form.command}
            onChange={(e) => setForm({ ...form, command: e.target.value })}
            placeholder="ej: disco"
            required
          />
          <label className="flex flex-col gap-2 text-left">
            <span className="text-xs uppercase tracking-wide-caps text-mist">Tipo de respuesta</span>
            <select
              value={form.type}
              onChange={(e) => setForm({ ...form, type: e.target.value })}
              className="border border-line-strong bg-ink px-4 py-3 text-sm text-paper outline-none focus:border-signal"
            >
              <option value="MESSAGE">Mensaje</option>
              <option value="REDIRECT">Redirección</option>
              <option value="EFFECT">Efecto visual</option>
            </select>
          </label>

          {form.type === 'MESSAGE' && (
            <Field
              label="Mensaje"
              textarea
              rows={3}
              value={form.message}
              onChange={(e) => setForm({ ...form, message: e.target.value })}
              required
            />
          )}
          {form.type === 'REDIRECT' && (
            <Field
              label="URL de destino"
              type="url"
              value={form.url}
              onChange={(e) => setForm({ ...form, url: e.target.value })}
              required
            />
          )}
          {form.type === 'EFFECT' && (
            <>
              <Field
                label="Nombre del efecto"
                value={form.effect}
                onChange={(e) => setForm({ ...form, effect: e.target.value })}
                placeholder="ej: disco_ball"
                required
              />
              <Field
                label="Duración en segundos (opcional)"
                type="number"
                min="1"
                max="120"
                value={form.durationSeconds}
                onChange={(e) => setForm({ ...form, durationSeconds: e.target.value })}
              />
            </>
          )}

          <label className="flex items-center gap-2 text-xs uppercase tracking-wide-caps text-mist">
            <input type="checkbox" checked={form.isActive} onChange={(e) => setForm({ ...form, isActive: e.target.checked })} />
            Activo
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
