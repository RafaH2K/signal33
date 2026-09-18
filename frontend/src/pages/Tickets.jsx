import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { eventsApi, reservationsApi } from '../api/resources.js';
import Field from '../components/Field.jsx';

const ACCESS_OPTIONS = [
  { value: 'GENERAL', label: 'Acceso general' },
  { value: 'OPEN_BAR', label: 'Barra libre' },
];

export default function Tickets() {
  const navigate = useNavigate();
  const [events, setEvents] = useState(null);
  const [selected, setSelected] = useState(null);
  const [form, setForm] = useState({ fullName: '', email: '', accessType: 'GENERAL', quantity: 1 });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [trackCode, setTrackCode] = useState('');

  useEffect(() => {
    eventsApi
      .list('?pageSize=100')
      .then((data) => {
        const open = data.events.filter((e) => e.reservations_enabled && new Date(e.event_date) > new Date());
        setEvents(open);
        if (open.length === 1) setSelected(open[0]);
      })
      .catch(() => setEvents([]));
  }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      const reservation = await reservationsApi.create({ ...form, eventId: selected.id });
      navigate(`/boletos/${reservation.tracking_code}`, { state: { justCreated: true } });
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  function handleTrack(e) {
    e.preventDefault();
    const code = trackCode.trim().toUpperCase();
    if (code) navigate(`/boletos/${code}`);
  }

  const maxQuantity = selected?.max_accesses_per_person ?? 2;

  return (
    <main className="mx-auto max-w-2xl px-6 pb-24 pt-32">
      <h1 className="mb-4 text-center font-display text-2xl uppercase tracking-wide-caps">Apartar boleto</h1>

      <p className="mb-12 border border-signal/60 px-5 py-4 text-center text-sm text-paper">
        <strong className="font-display uppercase tracking-wide-caps">No se paga nada en línea.</strong>
        <br />
        Apartá tu lugar acá y pagá en taquilla el día del evento.
      </p>

      {events === null ? (
        <p className="text-center text-sm text-mist">Cargando...</p>
      ) : events.length === 0 ? (
        <p className="text-center text-sm text-mist">No hay eventos con reservas abiertas por ahora.</p>
      ) : (
        <>
          <section className="mb-10">
            <h2 className="mb-4 text-xs uppercase tracking-wide-caps text-mist">1 · Elegí el evento</h2>
            <ul className="divide-y divide-line border-y border-line">
              {events.map((event) => (
                <li key={event.id}>
                  <button
                    type="button"
                    onClick={() => {
                      setSelected(event);
                      setForm((f) => ({ ...f, quantity: Math.min(f.quantity, event.max_accesses_per_person) }));
                    }}
                    className={`flex w-full items-center justify-between gap-4 px-4 py-5 text-left transition ${
                      selected?.id === event.id ? 'bg-white/5 text-paper' : 'text-mist hover:text-paper'
                    }`}
                  >
                    <span>
                      <span className="block text-sm">{event.title}</span>
                      <span className="block text-xs text-mist-dim">{event.venue}</span>
                    </span>
                    <span className="font-mono text-xs">
                      {new Date(event.event_date).toLocaleString('es-MX', {
                        day: '2-digit',
                        month: 'short',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </section>

          {selected && (
            <form onSubmit={handleSubmit} className="flex flex-col gap-5">
              <h2 className="text-xs uppercase tracking-wide-caps text-mist">2 · Tus datos</h2>
              <Field
                label="Nombre completo"
                value={form.fullName}
                onChange={(e) => setForm({ ...form, fullName: e.target.value })}
                autoComplete="name"
                required
              />
              <Field
                label="Correo electrónico"
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                autoComplete="email"
                required
              />

              <fieldset className="flex flex-col gap-2">
                <legend className="mb-2 text-xs uppercase tracking-wide-caps text-mist">Tipo de acceso</legend>
                <div className="grid grid-cols-2 gap-3">
                  {ACCESS_OPTIONS.map((opt) => (
                    <label
                      key={opt.value}
                      className={`cursor-pointer border px-4 py-3 text-center text-sm transition ${
                        form.accessType === opt.value ? 'border-signal text-paper' : 'border-line-strong text-mist'
                      }`}
                    >
                      <input
                        type="radio"
                        name="accessType"
                        value={opt.value}
                        checked={form.accessType === opt.value}
                        onChange={() => setForm({ ...form, accessType: opt.value })}
                        className="sr-only"
                      />
                      {opt.label}
                    </label>
                  ))}
                </div>
              </fieldset>

              <fieldset className="flex flex-col gap-2">
                <legend className="mb-2 text-xs uppercase tracking-wide-caps text-mist">
                  Cantidad (máximo {maxQuantity} por persona)
                </legend>
                <div className="flex gap-3">
                  {Array.from({ length: maxQuantity }, (_, i) => i + 1).map((n) => (
                    <button
                      key={n}
                      type="button"
                      onClick={() => setForm({ ...form, quantity: n })}
                      className={`h-12 w-12 border font-mono text-sm transition ${
                        form.quantity === n ? 'border-signal text-paper' : 'border-line-strong text-mist'
                      }`}
                    >
                      {n}
                    </button>
                  ))}
                </div>
              </fieldset>

              {error && <p className="text-xs text-signal-glow">{error}</p>}

              <button
                type="submit"
                disabled={submitting}
                className="mt-2 bg-paper py-3.5 font-display text-sm uppercase tracking-wide-caps text-ink transition hover:opacity-90 disabled:opacity-50"
              >
                {submitting ? 'Apartando...' : 'Apartar boleto'}
              </button>
              <p className="text-center text-xs text-mist-dim">
                Te mandamos tus accesos con código QR por correo. Pago únicamente en taquilla.
              </p>
            </form>
          )}
        </>
      )}

      <form onSubmit={handleTrack} className="mt-20 flex flex-col gap-3 border-t border-line pt-10 sm:flex-row sm:items-end">
        <Field
          label="¿Ya apartaste? Consultá tu reserva"
          placeholder="SR-XXXXXXXX"
          value={trackCode}
          onChange={(e) => setTrackCode(e.target.value)}
          className="flex-1"
        />
        <button
          type="submit"
          className="border border-line-strong px-6 py-3 text-xs uppercase tracking-wide-caps text-mist transition hover:text-paper"
        >
          Consultar
        </button>
      </form>
    </main>
  );
}
