import { useCallback, useEffect, useState } from 'react';
import { eventsApi, reservationsApi } from '../../api/resources.js';
import { useAuth } from '../../context/AuthContext.jsx';
import QrScanner from '../../components/admin/QrScanner.jsx';
import TicketCheckPanel from '../../components/admin/TicketCheckPanel.jsx';
import Modal from '../../components/admin/Modal.jsx';
import { AccessBadge, PaidBadge } from '../../components/tickets/Badges.jsx';
import { ACCESS_LABEL, extractTicketCode, formatMoney, formatTime } from '../../lib/tickets.js';

const PAID_FILTERS = [
  { value: '', label: 'Todas' },
  { value: 'false', label: 'No pagadas' },
  { value: 'true', label: 'Pagadas' },
];

const EMAIL_STATUS = {
  PENDING: { label: 'Correo en camino', className: 'text-amber-400' },
  SENT: { label: 'Correo entregado al proveedor', className: 'text-mist-dim' },
  FAILED: { label: 'El correo NO salió: dictale su código o reenvialo', className: 'text-red-400' },
};

const LOG_LABEL = {
  PAID: 'Marcó pagado',
  UNPAID: 'Marcó NO pagado',
  CHECK_IN: 'Dio acceso',
  CANCELLED: 'Canceló',
  EMAIL_RESENT: 'Reenvió correo',
};

// cada cuánto se refrescan contadores y lista: con varias taquillas abiertas,
// cada una ve lo que cobran las demás sin recargar la página
const REFRESH_MS = 15000;

export default function BoxOffice() {
  const { isAdmin } = useAuth();
  const [events, setEvents] = useState(null);
  const [eventId, setEventId] = useState('');
  const [stats, setStats] = useState(null);
  const [reservations, setReservations] = useState(null);
  const [paidFilter, setPaidFilter] = useState('');
  const [search, setSearch] = useState('');
  const [scanning, setScanning] = useState(false);
  const [scannedCode, setScannedCode] = useState(null);
  const [manualCode, setManualCode] = useState('');
  const [detailId, setDetailId] = useState(null);
  const [exportError, setExportError] = useState('');

  useEffect(() => {
    eventsApi
      .list(`?pageSize=100${isAdmin ? '&includeInactive=true' : ''}`)
      .then((data) => {
        const withReservations = data.events.filter((e) => e.reservations_enabled);
        setEvents(withReservations);
        // el próximo evento que no haya pasado hace más de un día
        const upcoming = withReservations.find((e) => new Date(e.event_date) > Date.now() - 86400000);
        setEventId((upcoming ?? withReservations[0])?.id ?? '');
      })
      .catch(() => setEvents([]));
  }, [isAdmin]);

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

  useEffect(() => {
    // pequeño retraso para no pegarle a la API en cada tecla del buscador
    const timeout = setTimeout(load, 250);
    const interval = setInterval(load, REFRESH_MS);
    return () => {
      clearTimeout(timeout);
      clearInterval(interval);
    };
  }, [load]);

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

  // "Escanear siguiente" vuelve directo a la cámara: en la fila no hay tiempo
  // para tocar dos botones por persona
  function nextScan() {
    setScannedCode(null);
    setScanning(true);
    load();
  }

  async function handleExport() {
    setExportError('');
    try {
      await reservationsApi.exportCsv(eventId);
    } catch (err) {
      setExportError(err.message);
    }
  }

  if (events === null) return <p className="text-sm text-mist">Cargando...</p>;

  if (events.length === 0) {
    return (
      <p className="text-sm text-mist">
        Ningún evento tiene reservas activadas. Activalas en Eventos → Editar → “Permitir apartar boletos”.
      </p>
    );
  }

  return (
    <div>
      <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <h1 className="font-display text-xl uppercase tracking-wide-caps">Taquilla</h1>
        <select
          value={eventId}
          onChange={(e) => setEventId(e.target.value)}
          className="max-w-full border border-line-strong bg-ink px-4 py-2.5 text-sm text-paper outline-none"
        >
          {events.map((event) => (
            <option key={event.id} value={event.id}>
              {event.title} · {new Date(event.event_date).toLocaleDateString('es-MX')}
            </option>
          ))}
        </select>
      </div>

      {stats && <StatsPanel stats={stats} />}

      <section className="mb-12 border border-line p-5 sm:p-6">
        <h2 className="mb-5 text-xs uppercase tracking-wide-caps text-mist">Validar acceso</h2>
        {scannedCode ? (
          <TicketCheckPanel key={scannedCode} code={scannedCode} expectedEventId={eventId} onDone={nextScan} />
        ) : scanning ? (
          <div className="flex flex-col gap-4">
            <QrScanner onScan={handleScan} />
            <button
              type="button"
              onClick={() => setScanning(false)}
              className="py-2 text-xs uppercase tracking-wide-caps text-mist transition hover:text-paper"
            >
              Cerrar cámara
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-4 sm:flex-row">
            <button
              type="button"
              onClick={() => setScanning(true)}
              className="bg-paper px-6 py-4 font-display text-sm uppercase tracking-wide-caps text-ink transition hover:opacity-90"
            >
              Escanear QR
            </button>
            <form onSubmit={handleManual} className="flex flex-1 gap-2">
              <input
                value={manualCode}
                onChange={(e) => setManualCode(e.target.value)}
                placeholder="o escribí el código de 16 caracteres"
                className="min-w-0 flex-1 border border-line-strong bg-transparent px-4 py-3 font-mono text-sm uppercase text-paper outline-none placeholder:normal-case placeholder:text-mist-dim focus:border-signal"
              />
              <button type="submit" className="border border-line-strong px-4 text-xs uppercase tracking-wide-caps text-mist hover:text-paper">
                Buscar
              </button>
            </form>
          </div>
        )}
      </section>

      <section className="mb-12">
        <div className="mb-4 flex flex-wrap items-center gap-3">
          <h2 className="mr-auto text-xs uppercase tracking-wide-caps text-mist">Reservas</h2>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Nombre, correo o SR-..."
            className="min-w-0 border border-line-strong bg-transparent px-3 py-2 text-sm text-paper outline-none placeholder:text-mist-dim focus:border-signal"
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
          {isAdmin && (
            <button
              type="button"
              onClick={handleExport}
              className="border border-line-strong px-3 py-2 text-xs uppercase tracking-wide-caps text-mist transition hover:text-paper"
              title="Respaldo por si se cae el internet: imprimilo antes del evento"
            >
              Descargar lista
            </button>
          )}
        </div>
        {exportError && <p className="mb-3 text-xs text-signal-glow">{exportError}</p>}
        <p className="mb-4 text-xs text-mist-dim">
          ¿Alguien perdió su QR o se quedó sin batería? Buscalo por nombre o correo, pedile identificación y validalo desde acá.
        </p>

        {reservations === null ? (
          <p className="text-sm text-mist">Cargando...</p>
        ) : reservations.length === 0 ? (
          <p className="text-sm text-mist">Sin reservas.</p>
        ) : (
          <ul className="divide-y divide-line border-y border-line">
            {reservations.map((r) => (
              <li key={r.id}>
                <button
                  type="button"
                  onClick={() => setDetailId(r.id)}
                  className="flex w-full flex-wrap items-center gap-3 py-3 text-left transition hover:bg-white/5 sm:px-2"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-sm">{r.full_name}</p>
                    <p className="truncate text-xs text-mist-dim">
                      {r.email} · <span className="font-mono">{r.tracking_code}</span>
                    </p>
                  </div>
                  <AccessBadge type={r.access_type} />
                  <span className="font-mono text-xs text-mist">
                    {r.checked_in}/{r.quantity} adentro
                  </span>
                  <span className="font-mono text-xs">{formatMoney(r.amount_due)}</span>
                  <PaidBadge isPaid={r.is_paid} />
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      {stats?.byStaff.length > 0 && <CashReport stats={stats} />}

      <Modal open={Boolean(detailId)} title="Reserva" onClose={() => setDetailId(null)}>
        {detailId && (
          <ReservationDetail
            key={detailId}
            id={detailId}
            canCancel={isAdmin}
            onChanged={load}
            onClose={() => setDetailId(null)}
          />
        )}
      </Modal>
    </div>
  );
}

function StatsPanel({ stats }) {
  return (
    <div className="mb-10 border border-line">
      <div className="grid grid-cols-2 sm:grid-cols-4">
        <Stat label="Apartados" value={stats.reserved} />
        <Stat label="Pagados" value={stats.paid} />
        <Stat label="Adentro" value={stats.checkedIn} />
        <Stat label="Cobrado" value={formatMoney(stats.collected)} sub={`${formatMoney(stats.pending)} por cobrar`} />
      </div>
      <div className="grid border-t border-line sm:grid-cols-2">
        {stats.byType.map((t) => (
          <div key={t.type} className="flex items-center justify-between gap-3 px-4 py-3 text-xs sm:border-r sm:border-line sm:last:border-r-0">
            <AccessBadge type={t.type} />
            <span className="font-mono text-mist">
              {t.reserved}
              {t.capacity !== null ? ` / ${t.capacity}` : ''} apartados · {t.paid} pagados
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function Stat({ label, value, sub }) {
  return (
    <div className="border-b border-r border-line px-4 py-4 text-center sm:border-b-0 sm:last:border-r-0">
      <p className="font-mono text-xl">{value}</p>
      <p className="mt-1 text-xs uppercase tracking-wide-caps text-mist">{label}</p>
      {sub && <p className="mt-1 text-[10px] text-mist-dim">{sub}</p>}
    </div>
  );
}

// corte de caja: al cerrar, cada quien entrega lo que dice aquí
function CashReport({ stats }) {
  return (
    <section className="mb-12">
      <h2 className="mb-4 text-xs uppercase tracking-wide-caps text-mist">Corte de caja</h2>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[420px] text-left text-sm">
          <thead>
            <tr className="border-b border-line text-xs uppercase tracking-wide-caps text-mist">
              <th className="py-2 pr-4 font-normal">Cobró</th>
              <th className="py-2 pr-4 font-normal">Reservas</th>
              <th className="py-2 pr-4 font-normal">Accesos</th>
              <th className="py-2 text-right font-normal">Monto</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {stats.byStaff.map((s) => (
              <tr key={s.user_id}>
                <td className="py-2 pr-4">{s.name}</td>
                <td className="py-2 pr-4 font-mono">{s.reservations}</td>
                <td className="py-2 pr-4 font-mono">{s.accesses}</td>
                <td className="py-2 text-right font-mono">{formatMoney(s.collected)}</td>
              </tr>
            ))}
            <tr className="font-display">
              <td className="py-2 pr-4 uppercase tracking-wide-caps" colSpan={3}>
                Total
              </td>
              <td className="py-2 text-right font-mono">{formatMoney(stats.collected)}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>
  );
}

function ReservationDetail({ id, canCancel, onChanged, onClose }) {
  const [reservation, setReservation] = useState(null);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(
    () =>
      reservationsApi
        .get(id)
        .then(setReservation)
        .catch((err) => setError(err.message)),
    [id]
  );

  useEffect(() => {
    load();
  }, [load]);

  async function run(action, successMessage) {
    setBusy(true);
    setError('');
    setMessage('');
    try {
      await action();
      if (successMessage) setMessage(successMessage);
      await load();
      onChanged();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  function togglePaid() {
    const r = reservation;
    const question = r.is_paid
      ? `¿Marcar como NO pagada la reserva de ${r.full_name}? Usalo sólo para corregir un error.`
      : `¿Confirmás que cobraste ${formatMoney(r.amount_due)} a ${r.full_name}?`;
    if (!confirm(question)) return;
    run(() => reservationsApi.setPaid(r.id, !r.is_paid));
  }

  function checkIn(ticket) {
    if (!confirm(`¿Dar acceso a ${reservation.full_name}? Verificá su identificación.`)) return;
    run(() => reservationsApi.checkIn(ticket.code));
  }

  function cancel() {
    if (!confirm(`¿Cancelar la reserva de ${reservation.full_name}? Sus QR dejan de servir y se liberan los lugares.`)) return;
    run(async () => {
      await reservationsApi.cancel(reservation.id);
      onClose();
    });
  }

  if (error && !reservation) return <p className="text-sm text-signal-glow">{error}</p>;
  if (!reservation) return <p className="text-sm text-mist">Cargando...</p>;

  return (
    <div className="flex flex-col gap-5 text-sm">
      <div>
        <p className="text-lg">{reservation.full_name}</p>
        <p className="text-xs text-mist">{reservation.email}</p>
      </div>

      <dl className="grid grid-cols-2 gap-y-2">
        <dt className="text-xs uppercase tracking-wide-caps text-mist">Seguimiento</dt>
        <dd className="text-right font-mono">{reservation.tracking_code}</dd>
        <dt className="text-xs uppercase tracking-wide-caps text-mist">Acceso</dt>
        <dd className="text-right">
          {reservation.quantity} × {ACCESS_LABEL[reservation.access_type]}
        </dd>
        <dt className="text-xs uppercase tracking-wide-caps text-mist">Total</dt>
        <dd className="text-right font-mono">{formatMoney(reservation.amount_due)}</dd>
        <dt className="text-xs uppercase tracking-wide-caps text-mist">Correo</dt>
        <dd className={`text-right text-xs ${EMAIL_STATUS[reservation.email_status]?.className ?? ''}`}>
          {EMAIL_STATUS[reservation.email_status]?.label ?? reservation.email_status}
        </dd>
        <dt className="text-xs uppercase tracking-wide-caps text-mist">Pago</dt>
        <dd className="text-right">
          <PaidBadge isPaid={reservation.is_paid} />
          {reservation.is_paid && reservation.paid_by_name && (
            <span className="mt-1 block text-[10px] text-mist-dim">
              {reservation.paid_by_name} · {formatTime(reservation.paid_at)}
            </span>
          )}
        </dd>
      </dl>

      <button
        type="button"
        onClick={togglePaid}
        disabled={busy}
        className={`py-3 font-display text-xs uppercase tracking-wide-caps transition disabled:opacity-50 ${
          reservation.is_paid ? 'border border-line-strong text-mist hover:text-paper' : 'border-2 border-amber-500 text-amber-400'
        }`}
      >
        {reservation.is_paid ? 'Corregir: marcar NO pagado' : `Cobrar ${formatMoney(reservation.amount_due)} → marcar pagado`}
      </button>

      <div>
        <h3 className="mb-2 text-xs uppercase tracking-wide-caps text-mist">Accesos</h3>
        <ul className="divide-y divide-line border-y border-line">
          {reservation.tickets.map((ticket, i) => (
            <li key={ticket.id} className="flex items-center justify-between gap-3 py-2">
              <span className="font-mono text-xs">
                {i + 1}. {ticket.code}
              </span>
              {ticket.checked_in_at ? (
                <span className="text-xs text-mist-dim">
                  Entró {formatTime(ticket.checked_in_at)}
                  {ticket.checked_in_by_name ? ` · ${ticket.checked_in_by_name}` : ''}
                </span>
              ) : (
                <button
                  type="button"
                  onClick={() => checkIn(ticket)}
                  disabled={busy || !reservation.is_paid}
                  title={reservation.is_paid ? '' : 'Primero cobrá'}
                  className="bg-paper px-3 py-1.5 font-display text-[10px] uppercase tracking-wide-caps text-ink disabled:opacity-30"
                >
                  Dar acceso
                </button>
              )}
            </li>
          ))}
        </ul>
      </div>

      {message && <p className="text-xs text-emerald-400">{message}</p>}
      {error && <p className="text-xs text-signal-glow">{error}</p>}

      <div className="flex flex-wrap gap-4">
        <button
          type="button"
          onClick={() => run(() => reservationsApi.resendEmail(reservation.id), `Correo en cola para ${reservation.email}`)}
          disabled={busy}
          className="text-xs uppercase tracking-wide-caps text-mist transition hover:text-paper disabled:opacity-50"
        >
          Reenviar correo
        </button>
        {canCancel && (
          <button
            type="button"
            onClick={cancel}
            disabled={busy}
            className="text-xs uppercase tracking-wide-caps text-mist transition hover:text-signal-glow disabled:opacity-50"
          >
            Cancelar reserva
          </button>
        )}
      </div>

      {reservation.logs.length > 0 && (
        <div>
          <h3 className="mb-2 text-xs uppercase tracking-wide-caps text-mist">Historial</h3>
          <ul className="flex flex-col gap-1 text-xs text-mist-dim">
            {reservation.logs.map((log, i) => (
              <li key={i}>
                {formatTime(log.created_at)} · {LOG_LABEL[log.action] ?? log.action}
                {log.user_name ? ` · ${log.user_name}` : ''}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
