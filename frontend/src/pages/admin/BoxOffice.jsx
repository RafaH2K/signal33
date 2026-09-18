import { useCallback, useEffect, useState } from 'react';
import { eventsApi, reservationsApi } from '../../api/resources.js';
import QrScanner, { extractTicketCode } from '../../components/admin/QrScanner.jsx';
import TicketCheckPanel from '../../components/admin/TicketCheckPanel.jsx';
import { ACCESS_LABEL, PaidBadge } from '../TicketStatus.jsx';

const PAID_FILTERS = [
  { value: '', label: 'Todas' },
  { value: 'false', label: 'No pagadas' },
  { value: 'true', label: 'Pagadas' },
];

export default function BoxOffice() {
  const [events, setEvents] = useState([]);
  const [eventId, setEventId] = useState('');
  const [stats, setStats] = useState(null);
  const [reservations, setReservations] = useState(null);
  const [paidFilter, setPaidFilter] = useState('');
  const [search, setSearch] = useState('');
  const [scanning, setScanning] = useState(false);
  const [scannedCode, setScannedCode] = useState(null);
  const [manualCode, setManualCode] = useState('');

  useEffect(() => {
    eventsApi
      .list('?includeInactive=true&pageSize=100')
      .then((data) => {
        const withReservations = data.events.filter((e) => e.reservations_enabled);
        setEvents(withReservations);
        if (withReservations[0]) setEventId(withReservations[0].id);
      })
      .catch(() => setEvents([]));
  }, []);

  const load = useCallback(() => {
    if (!eventId) return;
    const params = new URLSearchParams({ eventId, pageSize: '200' });
    if (paidFilter) params.set('isPaid', paidFilter);
    if (search.trim()) params.set('search', search.trim());
    reservationsApi
      .adminList(`?${params}`)
      .then((data) => setReservations(data.reservations))
      .catch(() => setReservations([]));
    reservationsApi.stats(eventId).then(setStats).catch(() => setStats(null));
  }, [eventId, paidFilter, search]);

  useEffect(load, [load]);

  const handleScan = useCallback((code) => {
    setScanning(false);
    setScannedCode(code);
  }, []);

  function handleManual(e) {
    e.preventDefault();
    const code = extractTicketCode(manualCode);
    if (code) {
      setScannedCode(code);
      setManualCode('');
    }
  }

  function closeCheck() {
    setScannedCode(null);
    load();
  }

  async function togglePaid(reservation) {
    await reservationsApi.setPaid(reservation.id, !reservation.is_paid);
    load();
  }

  async function cancel(reservation) {
    if (!confirm(`¿Cancelar la reserva de ${reservation.full_name}? Sus QR dejan de servir.`)) return;
    await reservationsApi.cancel(reservation.id);
    load();
  }

  return (
    <div>
      <div className="mb-10 flex flex-wrap items-center justify-between gap-4">
        <h1 className="font-display text-xl uppercase tracking-wide-caps">Taquilla</h1>
        {events.length > 0 && (
          <select
            value={eventId}
            onChange={(e) => setEventId(e.target.value)}
            className="border border-line-strong bg-ink px-4 py-2.5 text-sm text-paper outline-none"
          >
            {events.map((event) => (
              <option key={event.id} value={event.id}>
                {event.title}
              </option>
            ))}
          </select>
        )}
      </div>

      {events.length === 0 ? (
        <p className="text-sm text-mist">
          Ningún evento tiene reservas activadas. Activalas en Eventos → Editar → “Permitir apartar boletos”.
        </p>
      ) : (
        <>
          {stats && (
            <div className="mb-10 grid grid-cols-3 border border-line text-center">
              <Stat label="Apartados" value={stats.reserved} />
              <Stat label="Pagados" value={stats.paid} />
              <Stat label="Adentro" value={stats.checked_in} />
            </div>
          )}

          <section className="mb-14 border border-line p-6">
            <h2 className="mb-5 text-xs uppercase tracking-wide-caps text-mist">Validar acceso</h2>
            {scannedCode ? (
              <TicketCheckPanel key={scannedCode} code={scannedCode} onDone={closeCheck} />
            ) : scanning ? (
              <div className="flex flex-col gap-4">
                <QrScanner onScan={handleScan} />
                <button
                  type="button"
                  onClick={() => setScanning(false)}
                  className="text-xs uppercase tracking-wide-caps text-mist transition hover:text-paper"
                >
                  Cerrar cámara
                </button>
              </div>
            ) : (
              <div className="flex flex-col gap-4 sm:flex-row">
                <button
                  type="button"
                  onClick={() => setScanning(true)}
                  className="bg-paper px-6 py-3.5 font-display text-sm uppercase tracking-wide-caps text-ink transition hover:opacity-90"
                >
                  Escanear QR
                </button>
                <form onSubmit={handleManual} className="flex flex-1 gap-2">
                  <input
                    value={manualCode}
                    onChange={(e) => setManualCode(e.target.value)}
                    placeholder="o escribí el código de 16 caracteres"
                    className="flex-1 border border-line-strong bg-transparent px-4 py-3 font-mono text-sm uppercase text-paper outline-none placeholder:normal-case placeholder:text-mist-dim focus:border-signal"
                  />
                  <button type="submit" className="border border-line-strong px-4 text-xs uppercase tracking-wide-caps text-mist hover:text-paper">
                    Buscar
                  </button>
                </form>
              </div>
            )}
          </section>

          <section>
            <div className="mb-4 flex flex-wrap items-center gap-3">
              <h2 className="mr-auto text-xs uppercase tracking-wide-caps text-mist">Reservas</h2>
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar nombre, correo o SR-..."
                className="border border-line-strong bg-transparent px-3 py-2 text-sm text-paper outline-none placeholder:text-mist-dim focus:border-signal"
              />
              {PAID_FILTERS.map((f) => (
                <button
                  key={f.value}
                  type="button"
                  onClick={() => setPaidFilter(f.value)}
                  className={`text-xs uppercase tracking-wide-caps transition ${paidFilter === f.value ? 'text-paper' : 'text-mist-dim hover:text-mist'}`}
                >
                  {f.label}
                </button>
              ))}
            </div>

            {reservations === null ? (
              <p className="text-sm text-mist">Cargando...</p>
            ) : reservations.length === 0 ? (
              <p className="text-sm text-mist">Sin reservas.</p>
            ) : (
              <ul className="divide-y divide-line">
                {reservations.map((r) => (
                  <li key={r.id} className="flex flex-wrap items-center gap-4 py-3">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm">{r.full_name}</p>
                      <p className="truncate text-xs text-mist-dim">
                        {r.email} · <span className="font-mono">{r.tracking_code}</span> · {r.quantity} × {ACCESS_LABEL[r.access_type]}
                      </p>
                    </div>
                    <button type="button" onClick={() => togglePaid(r)} title="Cambiar estado de pago">
                      <PaidBadge isPaid={r.is_paid} />
                    </button>
                    <button
                      type="button"
                      onClick={() => cancel(r)}
                      className="text-xs uppercase tracking-wide-caps text-mist transition hover:text-signal-glow"
                    >
                      Cancelar
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
      )}
    </div>
  );
}

function Stat({ label, value }) {
  return (
    <div className="border-r border-line px-4 py-5 last:border-r-0">
      <p className="font-mono text-2xl">{value}</p>
      <p className="mt-1 text-xs uppercase tracking-wide-caps text-mist">{label}</p>
    </div>
  );
}
